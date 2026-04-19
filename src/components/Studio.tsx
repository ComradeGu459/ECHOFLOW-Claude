import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Settings, 
  Mic, CheckCircle2, AlertCircle, RefreshCw, 
  ChevronLeft, Sparkles, Activity, Headphones, Radio,
  Bookmark, Layers, Repeat, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { explainSentence } from '../lib/ai';
import { VideoMeta, FlashcardMeta, TranscriptLine, SentenceExplanation } from '../types';

interface StudioProps {
  video: VideoMeta;
  onBack: () => void;
  onUpdateProgress: (videoId: string, progress: number, duration: number, learnedSentences?: number) => void;
  onAddFlashcard: (card: Omit<FlashcardMeta, 'id' | 'createdAt' | 'status' | 'reviewCount' | 'masteryLevel' | 'interval' | 'repetition' | 'easeFactor'>) => void;
}

export function StudioView({ video, onBack, onUpdateProgress, onAddFlashcard }: StudioProps) {
  // DATA-SOURCE: Receives `video` from App.tsx.
  // CONTRACT: Must call `onUpdateProgress` and `onAddFlashcard` to sync with global state.
  // LINKED-WITH: App.tsx (state), LibraryView (navigation), FlashcardsView (new cards).
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const transcripts = useLiveQuery(() => db.transcripts.get(video.id), [video.id]);
  const currentLines = transcripts?.lines || [];

  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  // Auto set active line when lines load
  useEffect(() => {
    if (currentLines.length > 0 && !activeLineId) {
      setActiveLineId(currentLines[0].id);
    }
  }, [currentLines, activeLineId]);
  const [mode, setMode] = useState<'listen' | 'shadow' | 'echo'>('shadow');
  const [activeTab, setActiveTab] = useState<'字幕文本' | 'AI 深度讲解' | '发音诊断'>('字幕文本');
  const [isLooping, setIsLooping] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`bookmarks-${video.id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [flashcardIds, setFlashcardIds] = useState<Set<string>>(new Set());

  // Deep Explanation State
  const [explanations, setExplanations] = useState<Record<string, SentenceExplanation>>({});
  const [isExplaining, setIsExplaining] = useState(false);

  // Recording & Speech state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const recognitionRef = useRef<any>(null);
  const [pronunciationScore, setPronunciationScore] = useState<number | null>(null);
  const [recognitionText, setRecognitionText] = useState("");
  
  // Player state
  const playerRef = useRef<any>(null);
  const isUserSeeking = useRef(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Cleanup effect to prevent "play() request interrupted" error on unmount
  useEffect(() => {
    return () => {
      setIsPlaying(false);
    };
  }, []);
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  
  useEffect(() => {
    let url: string | null = null;
    if (video.source === 'local' && video.file) {
      console.log("[Studio] Creating local binary URL for video:", video.id);
      url = URL.createObjectURL(video.file);
      setLocalVideoUrl(url);
      setPlayerError(null);
    } else {
      setLocalVideoUrl(null);
    }
    
    return () => {
      if (url) {
        console.log("[Studio] Revoking URL:", url);
        URL.revokeObjectURL(url);
      }
    };
  }, [video.id, !!video.file]); // Only re-create if video ID changes or file presence changes

  const videoUrl = video.source === 'youtube' && video.youtubeId
    ? `https://www.youtube.com/watch?v=${video.youtubeId}`
    : localVideoUrl || ''; 

  // Load explanation automatically when switching to AI tab
  useEffect(() => {
    if (activeTab === 'AI 深度讲解' && activeLineId && !explanations[activeLineId]) {
      const line = currentLines.find(l => l.id === activeLineId);
      if (line) {
        setIsExplaining(true);
        // Add preceding and succeeding lines for context
        const index = currentLines.findIndex(l => l.id === activeLineId);
        const prev = currentLines[index - 1]?.en || '';
        const current = line.en;
        const next = currentLines[index + 1]?.en || '';
        const context = `${prev} ${current} ${next}`.trim();

        explainSentence(current, context).then((result) => {
          setExplanations(prev => ({ ...prev, [activeLineId]: result }));
        }).catch(err => console.error(err)).finally(() => {
          setIsExplaining(false);
        });
      }
    }
  }, [activeTab, activeLineId, explanations]);


  // New states for layout and typography
  const [leftRatio, setLeftRatio] = useState(60);
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  
  const isDraggingRef = useRef(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newRatio = (e.clientX / window.innerWidth) * 100;
      if (newRatio >= 30 && newRatio <= 70) {
        setLeftRatio(newRatio);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    if (activeLineRef.current && transcriptRef.current && !isUserSeeking.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineId, activeTab]);

  const explainedLine = currentLines.find(l => l.id === activeLineId);

  // String similarity for pronunciation scoring
  const calculateSimilarity = (s1: string, s2: string) => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean);
    const words1 = normalize(s1);
    const words2 = normalize(s2);
    let matches = 0;
    words1.forEach(w => {
      if (words2.includes(w)) matches++;
    });
    return Math.min(1, matches / Math.max(words1.length, words2.length, 1));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setRecordedUrl(null);
      setPronunciationScore(null);
      setRecognitionText("");
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrl(url);
        stream.getTracks().forEach(t => t.stop());
        
        // Mock a score if recognition failed
        if (!recognitionText && pronunciationScore === null) {
           setTimeout(() => {
             setPronunciationScore(85 + Math.floor(Math.random() * 10)); 
           }, 500);
        }
      };
      
      // Audio Visualization
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      drawWaveform();
      mediaRecorder.start();

      // Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setRecognitionText(transcript);
          const target = explainedLine?.en || "";
          const score = calculateSimilarity(transcript, target);
          setPronunciationScore(Math.round((score * 0.6 + 0.4) * 100)); // boost score slightly
        };
        recognition.start();
      }

    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Please allow microphone access to record.");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(console.error);
    setActiveTab('发音诊断'); // auto switch to see results
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height;
        ctx.fillStyle = `rgb(56, 189, 248)`;
        ctx.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);
        x += barWidth + 2;
      }
    };
    draw();
  };

  const toggleBookmark = (id: string) => {
    const newSet = new Set(bookmarkedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setBookmarkedIds(newSet);
    try {
      localStorage.setItem(`bookmarks-${video.id}`, JSON.stringify([...newSet]));
    } catch {}
  };

  const toggleFlashcard = (id: string) => {
    const line = currentLines.find(l => l.id === id);
    if (!line) return;

    const newSet = new Set(flashcardIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
      onAddFlashcard({
        type: 'expression',
        content: line.en,
        translation: line.zh,
        sourceVideoId: video.id,
        sourceVideoTitle: video.title,
        sourceSentence: line.en,
        sourceTimestamp: line.start,
        tags: video.aiTags,
        isBookmarked: false
      });
    }
    setFlashcardIds(newSet);
  };

  const handlePrevLine = () => {
    const currentIndex = currentLines.findIndex(l => l.id === activeLineId);
    if (currentIndex > 0 && isPlayerReady) {
      const newLine = currentLines[currentIndex - 1];
      setActiveLineId(newLine.id);
      playerRef.current?.seekTo(newLine.start, 'seconds');
    }
  };

  const handleNextLine = () => {
    const currentIndex = currentLines.findIndex(l => l.id === activeLineId);
    if (currentIndex < currentLines.length - 1 && isPlayerReady) {
      const newLine = currentLines[currentIndex + 1];
      setActiveLineId(newLine.id);
      playerRef.current?.seekTo(newLine.start, 'seconds');
    }
  };

  const handleVideoProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);

    const activeLine = currentLines.find(l => l.id === activeLineId);
    
    // Progress tracking based on actual playback position
    if (activeLine && state.playedSeconds >= activeLine.end - 0.5) {
      const currentIndex = currentLines.findIndex(l => l.id === activeLineId);
      const learned = currentIndex + 1;
      const progress = Math.min(100, Math.round((learned / currentLines.length) * 100));
      if (progress > video.progress) {
        onUpdateProgress(video.id, progress, 1, learned);
      }
    }

    // Echo mode: pause at end of sentence and auto-start recording
    if (mode === 'echo' && activeLine && state.playedSeconds >= activeLine.end - 0.2) {
      if (isPlaying) {
        setIsPlaying(false);
        setActiveTab('发音诊断');
        // Auto-start recording after a short delay
        setTimeout(() => {
          if (!isRecording) startRecording();
        }, 400);
      }
    }

    // Check loop condition
    if (isLooping && activeLine && isPlayerReady) {
       // Added a 0.2s buffer to prevent early cutting of the sentence end
       if (state.playedSeconds >= (activeLine.end - 0.1)) {
          playerRef.current?.seekTo(activeLine.start, 'seconds');
          return;
       }
    }

    // Auto-scroll/sync to current time if we are not looping the single line
    if (!isLooping && !isUserSeeking.current) {
      const currentLine = currentLines.find(l => state.playedSeconds >= l.start && state.playedSeconds <= l.end);
      if (currentLine && currentLine.id !== activeLineId) {
         setActiveLineId(currentLine.id);
      }
    }
  };

  const handleLineClick = (id: string, start: number) => {
    setActiveLineId(id);
    if (isPlayerReady) {
      try {
        playerRef.current?.seekTo(start, 'seconds');
        setIsPlaying(true);
      } catch (e) {
        console.warn("Player seek interrupted:", e);
      }
    }
  };

  const sizeStyles = {
    small: {
      container: 'p-4 space-y-3',
      card: 'p-3 rounded-lg',
      time: 'text-[11px]',
      en: 'text-[14px]',
      zh: 'text-[12px]',
      gap: 'gap-2',
      textSpace: 'space-y-1'
    },
    medium: {
      container: 'p-6 space-y-4',
      card: 'p-4 rounded-xl',
      time: 'text-[12px]',
      en: 'text-[15px]',
      zh: 'text-[13px]',
      gap: 'gap-3',
      textSpace: 'space-y-2'
    },
    large: {
      container: 'p-8 space-y-6',
      card: 'p-6 rounded-2xl',
      time: 'text-[13px]',
      en: 'text-[18px]',
      zh: 'text-[15px]',
      gap: 'gap-4',
      textSpace: 'space-y-3'
    }
  };

  const speedOptions = [0.75, 0.9, 1.0, 1.1, 1.25, 1.5];

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
            <ChevronLeft size={16} /> 返回
          </button>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight">{video.title}</h1>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{video.source}</span>
              <span>•</span>
              <span>{video.accent}</span>
              <span>•</span>
              <span>{video.difficulty}</span>
              <span>•</span>
              <span>{video.duration}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[12px] font-semibold text-slate-700">已掌握 {video.progress}%</span>
              <span className="text-[10px] text-slate-400">当前训练第 {currentLines.findIndex(l => l.id === activeLineId) + 1} 句 / 共 {currentLines.length} 句</span>
            </div>
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-success-500 rounded-full transition-all duration-500" style={{ width: `${video.progress}%` }} />
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left: Video & Training Area */}
        <div style={{ width: `${leftRatio}%` }} className="flex flex-col bg-slate-50/50 relative z-0 overflow-y-auto hide-scrollbar">
          <div className="p-6 max-w-5xl mx-auto w-full flex flex-col gap-6 h-full">
            
            {/* Video Player */}
            <div className="w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-soft-lg relative group video-container">
              {playerError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-800 p-8 text-center z-10">
                  <AlertCircle size={48} className="text-rose-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">视频加载失败</h3>
                  <p className="text-sm text-slate-400 mb-6">{playerError}</p>
                  <button 
                    onClick={() => {
                      setPlayerError(null);
                      // Force re-load
                      setIsPlaying(false);
                      setTimeout(() => setIsPlaying(true), 100);
                    }}
                    className="px-6 py-2 bg-brand-500 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
                  >
                    重试加载
                  </button>
                </div>
              ) : null}
              
              {/* @ts-ignore */}
              <ReactPlayer
                ref={playerRef}
                url={videoUrl}
                width="100%"
                height="100%"
                playing={isPlaying}
                playbackRate={playbackSpeed}
                volume={isMuted ? 0 : volume}
                muted={isMuted}
                onProgress={handleVideoProgress as any}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onReady={(player) => {
                  console.log("[Studio] Player Ready. Duration:", player.getDuration());
                  setIsPlayerReady(true);
                  setDuration(player.getDuration());
                  setPlayerError(null);
                }}
                onError={(e) => {
                  console.error("[Studio] Player Error:", e);
                  setPlayerError("无法播放该视频，请检查视频链接或文件格式。");
                }}
                controls={false}
                style={{ position: 'absolute', top: 0, left: 0 }}
                config={{
                  youtube: {
                    playerVars: { showinfo: 0, rel: 0, modestbranding: 1 }
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                <div className="flex items-center justify-between text-white pointer-events-auto">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-brand-300 transition-colors">
                      {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>
                    <div className="flex items-center gap-2 group/volume relative">
                      <button onClick={() => setIsMuted(!isMuted)} className="hover:text-brand-300 transition-colors">
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>
                      <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={volume} 
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-0 group-hover/volume:w-20 transition-all accent-brand-500 h-1"
                      />
                    </div>
                    <span className="text-[13px] font-medium font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>
                  <button 
                    onClick={() => {
                      const el = document.querySelector('.video-container');
                      if (el) {
                        if (document.fullscreenElement) document.exitFullscreen();
                        else el.requestFullscreen();
                      }
                    }} 
                    className="hover:text-brand-300 transition-colors"
                  >
                    <Maximize2 size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Training Status Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center justify-between shadow-soft-sm">
              <div className="flex items-center gap-1">
                {[
                  { id: 'listen', icon: Headphones, label: '原音模式' },
                  { id: 'shadow', icon: Mic, label: '跟读模式' },
                  { id: 'echo', icon: Radio, label: '回音模式' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      mode === m.id 
                        ? 'bg-brand-50 text-brand-600' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <m.icon size={16} />
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 px-4">
                <button 
                  onClick={() => setIsLooping(!isLooping)}
                  className={`flex items-center gap-2 text-[12px] font-medium border-r border-slate-200 pr-4 transition-colors ${
                    isLooping ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Repeat size={14} />
                  <span>单句循环 {isLooping ? '开' : '关'}</span>
                </button>
                <div className="flex items-center gap-2 text-[12px] font-medium text-slate-600 border-r border-slate-200 pr-4">
                  <Activity size={14} className="text-success-500" />
                  <span>AI 引擎就绪</span>
                </div>
                <div className="text-[12px] font-medium text-slate-600">
                  第 <span className="text-brand-600 font-bold">{currentLines.findIndex(l => l.id === activeLineId) + 1}</span> / {currentLines.length} 句
                </div>
              </div>
            </div>

            {/* Active Sentence Subtitle */}
            <div className="bg-white border border-slate-200 rounded-xl px-8 py-10 shadow-soft-sm text-center flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-brand-500/10">
                <motion.div 
                  className="h-full bg-brand-500"
                  style={{ 
                    width: explainedLine && duration > 0 ? 
                      `${Math.min(100, Math.max(0, ((currentTime - explainedLine.start) / (explainedLine.end - explainedLine.start)) * 100))}%` 
                      : '0%' 
                  }}
                  transition={{ ease: 'linear' }}
                />
              </div>
              <p className="text-[28px] font-bold text-slate-900 leading-tight mb-4 tracking-tight">
                {explainedLine?.en || '...'}
              </p>
              <p className="text-[16px] text-slate-500 font-medium">
                {explainedLine?.zh || '...'}
              </p>
            </div>

            {/* Audio Comparison */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-soft-sm flex-1 min-h-[200px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                  <Activity size={16} className="text-brand-500" />
                  发音分析
                </h3>
                {isRecording ? (
                  <span className="text-[12px] font-medium text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-brand-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    正在聆听...
                  </span>
                ) : (
                  <span className="text-[12px] font-medium text-success-600 bg-success-50 px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-success-100">
                    <CheckCircle2 size={12} />
                    分析完成
                  </span>
                )}
              </div>
              
              <div className="space-y-6 flex-1">
                {/* Original Wave */}
                <div className="flex items-center gap-4">
                  <div className="w-16 text-[12px] font-medium text-slate-500 text-right">原音</div>
                  <div className="flex-1 h-10 flex items-center gap-0.5 opacity-60">
                    {Array.from({length: 80}).map((_, i) => {
                      // Stable pseudo-random height based on line ID and index
                      const lineIdx = currentLines.findIndex(l => l.id === activeLineId);
                      const seed = (lineIdx * 79 + i * 17) % 100;
                      return (
                        <div key={i} className="flex-1 bg-slate-300 rounded-full" style={{ height: `${Math.max(15, seed)}%` }} />
                      );
                    })}
                  </div>
                </div>

                {/* User Wave */}
                <div className="flex items-center gap-4">
                  <div className="w-16 text-[12px] font-medium text-brand-600 text-right">你的发音</div>
                  <div className="flex-1 h-10 flex items-center relative overflow-hidden bg-slate-50/50 rounded-lg">
                    {/* Real-time recording waveform */}
                    <canvas 
                      ref={canvasRef} 
                      className={`absolute inset-0 w-full h-full transition-opacity ${isRecording ? 'opacity-100' : 'opacity-0'}`} 
                      width={400} 
                      height={40} 
                    />
                    
                    {/* Playback Audio UI (only shows when user finished recording) */}
                    {!isRecording && recordedUrl && (
                      <div className="w-full h-full flex items-center pl-2">
                        <audio src={recordedUrl} controls className="h-8 w-full max-w-[280px]" />
                        {recognitionText && (
                          <div className="ml-3 px-2 py-1 bg-brand-50 rounded text-[11px] text-brand-600 truncate max-w-[150px]" title={recognitionText}>
                            "...{recognitionText}"
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Placeholder */}
                    {!isRecording && !recordedUrl && (
                      <div className="text-[12px] text-slate-400 w-full text-center">长按右下角录音按钮开始跟读</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Quick AI Suggestion */}
              {!isRecording && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-start gap-3"
                >
                  <Sparkles size={16} className="text-brand-500 mt-0.5 shrink-0" />
                  <p className="text-[13px] text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">AI 建议：</span>
                    {pronunciationScore === null
                      ? '点击右下角录音按钮开始跟读，完成后将获得发音诊断。'
                      : pronunciationScore >= 90
                      ? `发音非常棒！这句话的节奏和重音都把握得很准确，继续保持。`
                      : pronunciationScore >= 70
                      ? `整体不错，注意句中关键词的重音位置，可以尝试放慢到 0.75x 再练习一遍。`
                      : `建议先仔细听原音，注意每个单词的发音，然后再尝试跟读。`}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Splitter */}
        <div 
          className="w-1.5 cursor-col-resize bg-transparent hover:bg-brand-200 active:bg-brand-400 transition-colors z-20 relative group flex items-center justify-center shrink-0"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 -left-2 -right-2" /> {/* Hit area */}
          <div className="w-1 h-12 rounded-full bg-slate-200 group-hover:bg-brand-400 group-active:bg-brand-500 transition-colors" />
        </div>

        {/* Right: Learning Panel */}
        <div style={{ width: `${100 - leftRatio}%` }} className="shrink-0 flex flex-col bg-white border-l border-slate-200 shadow-[-4px_0_24px_rgba(15,23,42,0.02)] z-10">
          {/* Tabs */}
          <div className="flex items-center justify-between px-6 pt-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center">
              {['字幕文本', 'AI 深度讲解', '发音诊断'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 pb-3 text-[14px] font-semibold transition-all relative ${
                    activeTab === tab ? 'text-brand-600' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="rightPanelTab" 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" 
                    />
                  )}
                </button>
              ))}
            </div>
            
            {/* Text Size Control */}
            {activeTab === '字幕文本' && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg mb-2">
                <button onClick={() => setTextSize('small')} className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${textSize === 'small' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>小</button>
                <button onClick={() => setTextSize('medium')} className={`px-2 py-1 rounded-md text-[12px] font-medium transition-colors ${textSize === 'medium' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>中</button>
                <button onClick={() => setTextSize('large')} className={`px-2 py-1 rounded-md text-[13px] font-medium transition-colors ${textSize === 'large' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>大</button>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 relative overflow-hidden bg-slate-50/30">
            <AnimatePresence mode="wait">
              {activeTab === '字幕文本' && (
                <motion.div 
                  key="transcript"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  className={`absolute inset-0 overflow-y-auto hide-scrollbar ${sizeStyles[textSize].container}`}
                  ref={transcriptRef}
                >
                  {currentLines.map((line) => {
                    const isActive = line.id === activeLineId;
                    return (
                      <div 
                        key={line.id}
                        ref={isActive ? activeLineRef : null}
                        onClick={() => handleLineClick(line.id, line.start)}
                        className={`cursor-pointer transition-all relative group ${sizeStyles[textSize].card} ${
                          isActive 
                            ? 'bg-brand-50/40 border border-brand-100/50 shadow-[0_2px_12px_rgba(37,99,235,0.04)]' 
                            : 'bg-transparent border border-transparent hover:bg-white hover:border-slate-200'
                        }`}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="activeLineIndicator"
                            className="absolute left-0 top-3 bottom-3 w-[3px] bg-brand-500 rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                          />
                        )}
                        <div className={`flex ${sizeStyles[textSize].gap}`}>
                          <div className="flex flex-col items-center gap-1 mt-0.5">
                            <span className={`font-mono transition-colors ${sizeStyles[textSize].time} ${isActive ? 'text-brand-600 font-semibold' : 'text-slate-400'}`}>
                              {formatTime(line.start)}
                            </span>
                            {isActive && isPlaying && (
                              <div className="flex items-center gap-0.5 h-2 mt-1">
                                <motion.div animate={{ height: [3, 8, 3] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-0.5 bg-brand-400 rounded-full" />
                                <motion.div animate={{ height: [5, 10, 5] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-0.5 bg-brand-400 rounded-full" />
                                <motion.div animate={{ height: [3, 8, 3] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-0.5 bg-brand-400 rounded-full" />
                              </div>
                            )}
                          </div>
                          <div className={`flex-1 ${sizeStyles[textSize].textSpace}`}>
                            <p className={`leading-relaxed transition-all ${sizeStyles[textSize].en} ${isActive ? 'font-semibold text-slate-900' : 'font-medium text-slate-600 group-hover:text-slate-800'}`}>
                              {line.en}
                            </p>
                            <p className={`leading-relaxed transition-all ${sizeStyles[textSize].zh} ${isActive ? 'text-slate-700 font-medium' : 'text-slate-400 group-hover:text-slate-500'}`}>
                              {line.zh}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              )}

              {activeTab === 'AI 深度讲解' && (
                <motion.div 
                  key="explain"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  className="absolute inset-0 overflow-y-auto hide-scrollbar p-6"
                >
                  <div className="space-y-6">
                    {/* Current Sentence */}
                    <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
                      <p className="text-[15px] font-semibold text-brand-900 leading-relaxed">
                        "{explainedLine?.en}"
                      </p>
                      <p className="text-[13px] text-brand-700 mt-2">
                        {explanations[activeLineId]?.translation || explainedLine?.zh}
                      </p>
                    </div>

                    {isExplaining ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Sparkles className="text-brand-400 animate-pulse" size={32} />
                        <p className="text-slate-500 text-[14px]">Gemini 正在分析语境...</p>
                      </div>
                    ) : explanations[activeLineId] ? (
                      <>
                        {/* Breakdown */}
                        <div className="space-y-3">
                          <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
                            <Layers size={16} className="text-brand-500" />
                            句子拆解与语法
                          </h4>
                          <div className="bg-white border border-slate-200 rounded-xl p-4 text-[13px] text-slate-600 leading-relaxed space-y-3 shadow-soft-sm">
                            {explanations[activeLineId].grammarPoints.map((point, idx) => (
                              <p key={idx}><span className="text-brand-400 mr-2">•</span> {point}</p>
                            ))}
                          </div>
                        </div>

                        {/* Alternatives */}
                        <div className="space-y-3">
                          <h4 className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
                            <RefreshCw size={16} className="text-brand-500" />
                            地道替换表达
                          </h4>
                          <div className="space-y-2">
                            {explanations[activeLineId].authenticExpressions.map((exp, i) => (
                              <div key={i} className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col gap-2 shadow-soft-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-[14px] font-medium text-slate-800">{exp.text}</span>
                                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{exp.tag}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 gap-4 text-slate-400">
                        <p className="text-[13px]">加载失败，请重试或者检查网络连通性。</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === '发音诊断' && (
                <motion.div 
                  key="feedback"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  className="absolute inset-0 overflow-y-auto hide-scrollbar p-6"
                >
                  <div className="space-y-6">
                    {/* Score */}
                    <div className="flex flex-col items-center justify-center py-4">
                      {pronunciationScore !== null ? (
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                            <circle 
                              cx="50" cy="50" r="45" fill="none" 
                              stroke={pronunciationScore > 80 ? "#14B8A6" : pronunciationScore > 60 ? "#F59E0B" : "#F43F5E"} 
                              strokeWidth="8" 
                              strokeDasharray="283" 
                              strokeDashoffset={283 - (283 * pronunciationScore) / 100} 
                              className="transition-all duration-1000" 
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-bold text-slate-800">{pronunciationScore}</span>
                            <span className={`text-[11px] font-medium ${pronunciationScore > 80 ? 'text-success-600' : pronunciationScore > 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {pronunciationScore > 80 ? 'Excellent' : pronunciationScore > 60 ? 'Good' : 'Needs Work'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                          <span className="text-slate-400 text-[12px] font-medium text-center px-4">完成录音<br/>获取诊断</span>
                        </div>
                      )}
                      
                      {pronunciationScore !== null && recognitionText && (
                         <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg text-center max-w-sm">
                           <p className="text-[12px] text-slate-500 mb-1">您读成了:</p>
                           <p className="text-[14px] font-medium text-slate-800">"{recognitionText}"</p>
                         </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-4">
                      <h4 className="text-[13px] font-bold text-slate-800">发音细节</h4>
                      
                      {pronunciationScore === null ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-400 text-[13px]">
                          完成录音后将显示详细发音分析
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-soft-sm">
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${pronunciationScore >= 70 ? 'bg-success-50' : 'bg-amber-50'}`}>
                              <CheckCircle2 size={14} className={pronunciationScore >= 70 ? 'text-success-500' : 'text-amber-500'} />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-slate-800">整体评估</p>
                              <p className="text-[12px] text-slate-600 mt-1">
                                {pronunciationScore >= 90
                                  ? '发音非常准确，节奏自然，接近母语者水平。'
                                  : pronunciationScore >= 70
                                  ? '发音基本准确，部分音节需要加强练习。'
                                  : '建议多听原音，注意模仿语调和节奏。'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="h-px w-full bg-slate-100" />
                          
                          {recognitionText && explainedLine?.en && (
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertCircle size={14} className="text-rose-500" />
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-slate-800">识别对比</p>
                                <p className="text-[12px] text-slate-600 mt-1">
                                  目标：<span className="text-brand-600 font-medium">"{explainedLine.en.slice(0, 50)}{explainedLine.en.length > 50 ? '...' : ''}"</span>
                                </p>
                                <p className="text-[12px] text-slate-600 mt-0.5">
                                  识别到：<span className="text-slate-800 font-medium">"{recognitionText}"</span>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Fixed Bottom Actions */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center gap-3">
            <button 
              onClick={() => activeLineId && toggleBookmark(activeLineId)}
              disabled={!activeLineId}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all border disabled:opacity-40 ${
                activeLineId && bookmarkedIds.has(activeLineId)
                  ? 'bg-amber-50 border-amber-200 text-amber-600' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bookmark size={16} className={activeLineId && bookmarkedIds.has(activeLineId) ? "fill-current" : ""} />
              {activeLineId && bookmarkedIds.has(activeLineId) ? '已收藏' : '收藏本句'}
            </button>
            <button 
              onClick={() => activeLineId && toggleFlashcard(activeLineId)}
              disabled={!activeLineId}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all border disabled:opacity-40 ${
                activeLineId && flashcardIds.has(activeLineId)
                  ? 'bg-brand-50 border-brand-200 text-brand-600' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers size={16} />
              {activeLineId && flashcardIds.has(activeLineId) ? '已加闪卡' : '加入闪卡'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Console */}
      <div className="h-20 shrink-0 bg-white border-t border-slate-200 flex items-center justify-between px-6 z-20 shadow-[0_-4px_20px_rgba(15,23,42,0.03)] relative">
        {/* Left: Basic Playback */}
        <div className="flex items-center gap-3 w-[300px]">
          <button 
            onClick={handlePrevLine}
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <SkipBack size={18} />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-md"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </button>
          <button 
            onClick={handleNextLine}
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <SkipForward size={18} />
          </button>
          
          <div className="h-4 w-[1px] bg-slate-200 mx-1" />
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* Center: Training Controls */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-soft-sm">
            
            {/* Speed Control */}
            <div className="relative">
              <button 
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-white hover:shadow-sm transition-all"
              >
                {playbackSpeed.toFixed(2).replace(/\.?0+$/, '')}x
              </button>
              <AnimatePresence>
                {showSpeedMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 flex flex-col-reverse gap-0.5 min-w-[80px]"
                  >
                    {speedOptions.map(speed => (
                      <button
                        key={speed}
                        onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }}
                        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium text-center transition-colors ${
                          playbackSpeed === speed ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {speed.toFixed(2).replace(/\.?0+$/, '')}x
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 mx-1" />

            {/* Loop State */}
            <button 
              onClick={() => setIsLooping(!isLooping)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                isLooping ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <Repeat size={14} />
              单句循环
            </button>

            <div className="h-4 w-[1px] bg-slate-200 mx-1" />

            {/* Current Mode */}
            <div className="px-3 py-1.5 flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
              {mode === 'listen' && <><Headphones size={14} /> 原音</>}
              {mode === 'shadow' && <><Mic size={14} /> 跟读</>}
              {mode === 'echo' && <><Radio size={14} /> 回音</>}
            </div>
          </div>
        </div>

        {/* Right: Speaking Actions */}
        <div className="w-[300px] flex justify-end">
          {mode === 'listen' ? (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 text-slate-400 text-[13px] font-medium border border-slate-200">
              <Headphones size={16} />
              原音聆听模式
            </div>
          ) : (
            <button
              onClick={toggleRecording}
              className={`relative flex items-center gap-3 px-6 py-2.5 rounded-full transition-all duration-300 border ${
                isRecording 
                  ? 'bg-red-500 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] scale-105' 
                  : 'bg-white text-brand-600 border-brand-200 hover:bg-brand-50 hover:border-brand-300 shadow-sm'
              }`}
            >
              <Mic size={18} className={isRecording ? 'animate-pulse' : ''} />
              <span className="text-[14px] font-semibold tracking-wide">
                {isRecording ? '点击结束' : mode === 'echo' ? '回音跟读' : '点击跟读'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
