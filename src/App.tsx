import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { calculateSM2 } from './lib/srs';
import { Sidebar } from './components/Sidebar';
import { LibraryView } from './components/Library';
import { StudioView } from './components/Studio';
import { ImportModal } from './components/ImportModal';
import { FlashcardsView } from './components/Flashcards';
import { AnalyticsView } from './components/Analytics';
import { Settings } from './components/Settings';
import { VideoMeta, FlashcardMeta, LearningLog } from './types';
import { ImportOptions } from './components/ImportModal';

export default function App() {
  // --- Central State (Source of Truth) ---
  // CONTRACT: All view-switching and global state must reside here.
  // LINKED-WITH: Sidebar.tsx (navigation), Library.tsx (videos), Studio.tsx (progress), Flashcards.tsx (reviews), Analytics.tsx (logs).
  const [currentView, setCurrentView] = useState('analytics');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // DATA-SOURCE: DB queries replace the old state arrays. First load initialized by db.ts.
  const videos = useLiveQuery(() => db.videos.toArray()) || [];
  const flashcards = useLiveQuery(() => db.flashcards.toArray()) || [];
  const learningLogs = useLiveQuery(() => db.logs.toArray()) || [];
  
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // --- Actions & Linkage ---

  // 1. Import Logic (Linkage: Import -> Library)
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleImportVideo = useCallback(async (newVideo: Partial<VideoMeta>, options: ImportOptions) => {
    const tempId = `v-${Date.now()}`;
    const video: VideoMeta = {
      id: tempId,
      title: newVideo.title || 'Parsing video...',
      channel: 'Loading...',
      duration: newVideo.duration || '0:00',
      thumbnail: newVideo.thumbnail || 'https://picsum.photos/seed/new/640/360',
      difficulty: 'Intermediate',
      accent: 'American',
      tags: [],
      aiTags: [],
      status: 'processing',
      progress: 0,
      learnedSentences: 0,
      totalSentences: 0,
      isBookmarked: false,
      source: newVideo.source || 'youtube',
      youtubeId: newVideo.youtubeId,
      file: options.videoFile || undefined,
      processingStatus: {
        isProcessing: true,
        step: 'parsing',
        percent: 10,
        subtitles: 'processing',
        bilingual: options.autoTranslate ? 'processing' : 'none',
        expressions: options.extractExpressions ? 'processing' : 'none',
        flashcards: options.extractExpressions ? 'processing' : 'none'
      }
    };
    
    await db.videos.add(video);

    try {
      let transcriptData: any[] = [];
      let metadata = { 
        title: newVideo.title || "Unknown Title", 
        channel: newVideo.source === 'local' ? "本地上传" : "Unknown Channel", 
        thumbnail: newVideo.thumbnail || "https://picsum.photos/seed/local/640/360", 
        youtubeId: newVideo.youtubeId || "" 
      };

      if (video.source === 'youtube' && newVideo.youtubeId) {
        // Use cached transcript from modal preview if available (avoids double-fetch)
        if (options.cachedTranscript && options.cachedTranscript.length > 0 && options.cachedMeta) {
          transcriptData = options.cachedTranscript;
          metadata = options.cachedMeta;
        } else {
          const res = await fetch('/api/import/youtube', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ url: `https://youtube.com/watch?v=${newVideo.youtubeId}` })
          });
          
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to parse YouTube and retrieve captions");
          }
          
          const json = await res.json();
          transcriptData = json.transcript;
          metadata = json.meta;
        }
      } else if (video.source === 'local') {
        // --- REAL SUBTITLE PARSING (Point 4) ---
        if (options.subtitleFile) {
          const text = await options.subtitleFile.text();
          // Simple SRT Parser (naive but functional for POC)
          const blocks = text.split(/\r?\n\r?\n/).filter(Boolean);
          transcriptData = blocks.map((block, i) => {
            const lines = block.split(/\r?\n/);
            const timeRange = lines[1]?.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
            const content = lines.slice(2).join(' ');
            
            const parseTime = (t: string) => {
              const [h, m, s_ms] = t.split(':');
              const [s, ms] = s_ms.split(',');
              return parseInt(h)*3600 + parseInt(m)*60 + parseInt(s) + parseInt(ms)/1000;
            }

            return {
              id: `sub-${i}`,
              start: timeRange ? parseTime(timeRange[1]) : i * 5,
              end: timeRange ? parseTime(timeRange[2]) : (i + 1) * 5,
              en: content || "[Empty Line]",
              zh: "",
              words: []
            };
          }).filter(l => l.en.trim() !== "");
        } else {
          // Point 6/13: Mock AI Transcription if requested
          transcriptData = [{
            id: 'local-1',
            start: 0,
            end: 10,
            en: options.autoTranslate ? "Welcome to English Learning Studio. This is a local file import test sentence." : "[No Transcript Detected]",
            zh: options.autoTranslate ? "欢迎来到英语学习工作室。这是一个本地文件导入测试句子。" : ""
          }];
        }
      } else {
        throw new Error("Unsupported video source.");
      }

      // Update after transcribing done (we have EN captions)
      await db.videos.put({
        ...video,
        title: metadata.title,
        channel: metadata.channel,
        thumbnail: metadata.thumbnail,
        youtubeId: metadata.youtubeId,
        processingStatus: {
          isProcessing: true,
          step: 'transcribing',
          percent: 60
        }
      });

      // Save transcript to DB
      await db.transcripts.put({
        videoId: video.id,
        lines: transcriptData
      });

      // Finish processing
      const finalVideo = await db.videos.get(video.id);
      if (finalVideo) {
        const totalLines = transcriptData.length;
        // Logic: Use duration from modal (extracted from file) OR from transcript
        const durationDisplay = newVideo.duration || formatTime(totalLines > 0 ? transcriptData[totalLines-1].end : 0);
        
        await db.videos.put({
          ...finalVideo,
          duration: durationDisplay,
          totalSentences: totalLines,
          status: 'not_started',
          processingStatus: {
            ...finalVideo.processingStatus!,
            isProcessing: false,
            step: 'done',
            percent: 100,
            subtitles: totalLines > 0 ? 'done' : 'none',
            bilingual: options.autoTranslate ? 'done' : 'none',
            expressions: options.extractExpressions ? 'done' : 'none',
            flashcards: options.extractExpressions ? 'done' : 'none'
          }
        });
      }
    } catch (err: any) {
      console.error(err);
      const finalVideo = await db.videos.get(video.id);
      if (finalVideo) {
        await db.videos.put({
          ...finalVideo,
          status: 'processing',
          processingStatus: {
            ...finalVideo.processingStatus!,
            isProcessing: false,
            step: 'error',
            percent: 0,
            errorMsg: err.message || 'Unknown processing error'
          }
        });
      }
    }
  }, []);

  // 2. Learning Progress (Linkage: Studio -> Library & Analytics)
  const lastLogTimeRef = useRef<number>(0);
  
  const handleUpdateProgress = useCallback(async (videoId: string, progress: number, duration: number, learnedSentences?: number) => {
    const current = await db.videos.get(videoId);
    if (current) {
      const changed = current.progress !== progress || 
        (learnedSentences !== undefined && current.learnedSentences !== learnedSentences);
      if (changed) {
        await db.videos.update(videoId, { 
           progress,
           ...(learnedSentences !== undefined && { learnedSentences }),
           status: progress >= 100 ? 'completed' : 'learning', 
           lastLearnedAt: new Date().toISOString()
        });
      }
    }
    
    // Throttle logging to once every 10 seconds to avoid DB/render storms
    const now = Date.now();
    if (now - lastLogTimeRef.current > 10000) {
      lastLogTimeRef.current = now;
      await db.logs.add({
        id: `log-${now}`,
        timestamp: new Date().toISOString(),
        type: 'play',
        duration: 10, // log in 10s chunks
        videoId
      });
    }
  }, []);

  // 3. Asset Accumulation (Linkage: Studio -> Flashcards)
  const handleAddFlashcard = useCallback(async (card: Omit<FlashcardMeta, 'id' | 'createdAt' | 'status' | 'reviewCount' | 'masteryLevel' | 'interval' | 'repetition' | 'easeFactor'>) => {
    const newCard: FlashcardMeta = {
      ...card,
      id: `fc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'new',
      reviewCount: 0,
      masteryLevel: 0,
      interval: 0,
      repetition: 0,
      easeFactor: 2.5,
      isBookmarked: false
    };
    await db.flashcards.add(newCard);
    
    await db.logs.add({
      id: `log-asset-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'asset_add',
      cardId: newCard.id
    });
  }, []);

  // 4. Review Feedback (Linkage: Flashcards -> Analytics)
  const handleReviewCard = useCallback(async (cardId: string, feedback: 'forgot' | 'hard' | 'good' | 'easy') => {
    const f = await db.flashcards.get(cardId);
    if (!f) return;
    
    // Map feedback string to 0, 1, 2, 3
    const scoreMap = { forgot: 0, hard: 1, good: 2, easy: 3 };
    const quality = scoreMap[feedback] as 0 | 1 | 2 | 3;
    
    // Calculate new SRS data using SM-2
    const srsData = calculateSM2(
      quality, 
      f.repetition || 0, 
      f.easeFactor || 2.5, 
      f.interval || 0
    );
    
    // Point 17: Calculate nextReviewAt
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + srsData.interval);
    
    // Calculate new mastery level (just for progress bar, 0-100)
    const newMasteryLevel = Math.min(100, Math.floor((srsData.interval / 21) * 100));
    const newStatus = newMasteryLevel >= 90 ? 'mastered' : 'learning';
    
    await db.flashcards.put({
      ...f,
      ...srsData,
      nextReviewAt: nextReview.toISOString(),
      masteryLevel: newMasteryLevel,
      status: newStatus,
      reviewCount: (f.reviewCount || 0) + 1,
      lastReviewedAt: new Date().toISOString()
    });

    await db.logs.add({
      id: `log-rev-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'flashcard_review',
      cardId,
      metadata: { quality, newInterval: srsData.interval }
    });
  }, []);

  const handlePlayVideo = (id: string, timestamp?: number) => {
    console.log('Playing video:', id, 'at', timestamp);
    setSelectedVideoId(id);
    setCurrentView('studio');
  };

  const handleUpdateVideo = useCallback(async (id: string, updates: Partial<VideoMeta>) => {
    const v = await db.videos.get(id);
    if (v) {
      await db.videos.put({ ...v, ...updates });
    }
  }, []);

  const handleUpdateFlashcard = useCallback(async (id: string, updates: Partial<FlashcardMeta>) => {
    const f = await db.flashcards.get(id);
    if (f) {
      await db.flashcards.put({ ...f, ...updates });
    }
  }, []);

  // Calculate Statistics (Point 19)
  const masteredCount = useMemo(() => flashcards.filter(c => c.status === 'mastered').length, [flashcards]);
  const weeklyHours = useMemo(() => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weeklyLogs = learningLogs.filter(log => new Date(log.timestamp) > lastWeek);
    const totalMinutes = weeklyLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
    return (totalMinutes / 60).toFixed(1);
  }, [learningLogs]);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
      />
      
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 h-full w-full absolute inset-0 overflow-hidden"
          >
            {currentView === 'library' && (
              <LibraryView 
                videos={videos}
                logs={learningLogs}
                flashcards={flashcards}
                onPlay={handlePlayVideo} 
                onUpdateVideo={handleUpdateVideo}
                setIsImportOpen={setIsImportOpen} 
              />
            )}
            {currentView === 'studio' && (() => {
              const videoToPlay = videos.find(v => v.id === selectedVideoId) || videos[0];
              return videoToPlay ? (
                <StudioView 
                  video={videoToPlay} 
                  onBack={() => setCurrentView('library')} 
                  onUpdateProgress={handleUpdateProgress}
                  onAddFlashcard={handleAddFlashcard}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center h-full">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-4"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  <p className="text-slate-500 mb-6 tracking-wide">暂无视频素材，请先前往语料素材库导入</p>
                  <button onClick={() => setCurrentView('library')} className="px-6 py-2.5 bg-brand-500 text-white rounded-xl text-[13px] font-medium hover:bg-brand-600 transition-colors shadow-soft-sm hover:shadow-soft">前往素材库</button>
                </div>
              );
            })()}
            {currentView === 'flashcards' && (
              <FlashcardsView 
                flashcards={flashcards}
                onPlayVideo={handlePlayVideo} 
                onReviewCard={handleReviewCard}
                onUpdateCard={handleUpdateFlashcard}
              />
            )}
            {currentView === 'analytics' && (
              <AnalyticsView 
                videos={videos}
                flashcards={flashcards}
                logs={learningLogs}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Import Modal */}
      <ImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImport={handleImportVideo}
      />

      {/* Settings & API Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative">
            <Settings onClose={() => setIsSettingsOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
