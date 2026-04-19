import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Link as LinkIcon, UploadCloud, FileText, Video, 
  CheckCircle2, AlertCircle, Loader2, ChevronRight, 
  Settings2, FileVideo, Languages, AlertTriangle, Sparkles
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (video: any, options: ImportOptions) => void;
}

export interface ImportOptions {
  autoTranslate: boolean;
  autoSegment: boolean;
  extractExpressions: boolean;
  videoFile: File | null;
  subtitleFile: File | null;
  cachedTranscript?: any[] | null;
  cachedMeta?: { title: string; channel: string; thumbnail: string; youtubeId: string } | null;
}

type ImportStep = 'input' | 'processing' | 'preview' | 'error';

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('input');
  
  // Refs for hidden file inputs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const subInputRef = useRef<HTMLInputElement>(null);

  // Input State
  const [videoInputType, setVideoInputType] = useState<'link' | 'file'>('link');
  const [subInputType, setSubInputType] = useState<'link' | 'file'>('file');
  const [videoLink, setVideoLink] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subFile, setSubFile] = useState<File | null>(null);

  // Processing State
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  // Preview State Options
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [autoSegment, setAutoSegment] = useState(true);
  const [extractExpressions, setExtractExpressions] = useState(true);

  // Preview Metadata State
  const [metadata, setMetadata] = useState<{
    title: string;
    duration: string;
    thumbnail: string;
    source: 'youtube' | 'local';
    subtitlesDetected: boolean;
  }>({
    title: '',
    duration: '00:00',
    thumbnail: '',
    source: 'youtube',
    subtitlesDetected: false
  });

  // Cache fetched transcript to avoid double-fetching on confirm
  const cachedTranscriptRef = useRef<any[] | null>(null);
  const cachedMetaRef = useRef<any | null>(null);

  // Mock error state for demonstration
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setVideoLink('');
      setVideoFile(null);
      setSubFile(null);
      setProcessingLogs([]);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleStartProcessing = async () => {
    if (!videoLink && !videoFile) return;
    
    setStep('processing');
    setProcessingLogs(['正在建立连接...']);

    if (videoInputType === 'link' && videoLink) {
      setProcessingLogs(prev => [...prev, '正在解析 YouTube 视频信息...']);
      try {
        const response = await fetch('/api/import/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoLink })
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || '解析失败');

        // Compute duration from last transcript line
        const lines: any[] = data.transcript || [];
        const lastLine = lines[lines.length - 1];
        const durationSec = lastLine?.end || 0;
        const mins = Math.floor(durationSec / 60);
        const secs = Math.floor(durationSec % 60);
        const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        cachedTranscriptRef.current = lines;
        cachedMetaRef.current = data.meta;

        setMetadata({
          title: data.meta?.title || videoLink,
          duration: durationStr,
          thumbnail: data.meta?.thumbnail || '',
          source: 'youtube',
          subtitlesDetected: lines.length > 0
        });
        
        setProcessingLogs(prev => [...prev, `成功获取：${data.meta?.title}`, '解析完成']);
        setTimeout(() => setStep('preview'), 500);
      } catch (err: any) {
        setErrorMsg(err.message);
        setStep('input');
      }
    } else if (videoInputType === 'file' && videoFile) {
      setProcessingLogs(prev => [...prev, '正在读取本地文件元数据...']);
      
      // Use hidden video element to get duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const mins = Math.floor(video.duration / 60);
        const secs = Math.floor(video.duration % 60);
        const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        setMetadata({
          title: videoFile.name.replace(/\.[^/.]+$/, ""),
          duration: durationStr,
          thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=320&h=180&auto=format&fit=crop', // Placeholder for local
          source: 'local',
          subtitlesDetected: !!subFile
        });

        setProcessingLogs(prev => [...prev, '文件预览已生成', '准备就绪']);
        setTimeout(() => setStep('preview'), 500);
      };
      video.src = URL.createObjectURL(videoFile);
    }
  };

  const handleConfirmImport = () => {
    // Extract ID for YouTube
    let youtubeIdStr = '';
    if (metadata.source === 'youtube' && videoLink) {
       try {
         const urlObj = new URL(videoLink);
         youtubeIdStr = urlObj.searchParams.get('v') || urlObj.pathname.replace('/', '') || '';
       } catch (e) {
         youtubeIdStr = videoLink; // fallback if just id
       }
    }

    onImport({
      title: metadata.title,
      source: metadata.source,
      youtubeId: youtubeIdStr,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration
    }, {
      autoTranslate,
      autoSegment,
      extractExpressions,
      videoFile,
      subtitleFile: subFile,
      cachedTranscript: cachedTranscriptRef.current,
      cachedMeta: cachedMetaRef.current
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-[640px] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-slate-800">导入学习素材</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">支持视频链接、本地文件及独立字幕导入</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-2 rounded-full shadow-sm border border-slate-100 hover:shadow">
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: INPUT */}
            {step === 'input' && (
              <motion.div 
                key="input"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* Video Source */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                      <Video size={16} className="text-brand-500" />
                      视频来源 <span className="text-rose-500">*</span>
                    </h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setVideoInputType('link')}
                        className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${videoInputType === 'link' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        链接导入
                      </button>
                      <button 
                        onClick={() => setVideoInputType('file')}
                        className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${videoInputType === 'file' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        本地文件
                      </button>
                    </div>
                  </div>

                  {videoInputType === 'link' ? (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                        <LinkIcon size={16} />
                      </div>
                      <input 
                        type="text" 
                        value={videoLink}
                        onChange={(e) => setVideoLink(e.target.value)}
                        placeholder="粘贴 YouTube 视频链接..." 
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-[13px] text-slate-700 placeholder:text-slate-400" 
                      />
                    </div>
                  ) : (
                    <div 
                      onClick={() => videoInputRef.current?.click()}
                      className="border-2 border-slate-200 border-dashed rounded-2xl p-8 hover:border-brand-400 hover:bg-brand-50/30 transition-colors cursor-pointer group flex flex-col items-center justify-center text-center"
                    >
                      <input 
                        type="file" 
                        ref={videoInputRef}
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        style={{ display: 'none' }}
                        accept="video/*"
                      />
                      <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center mb-3 transition-colors">
                        <FileVideo size={24} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
                      </div>
                      <p className="text-[14px] font-medium text-slate-700 mb-1">
                        {videoFile ? videoFile.name : '点击上传或拖拽视频文件'}
                      </p>
                      <p className="text-[12px] text-slate-500">支持 MP4, WebM, MOV 格式，最大 2GB</p>
                    </div>
                  )}
                </div>

                {/* Subtitle Source */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                      <FileText size={16} className="text-brand-500" />
                      外挂字幕 <span className="text-[12px] font-normal text-slate-400">(可选)</span>
                    </h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setSubInputType('file')}
                        className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${subInputType === 'file' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        本地文件
                      </button>
                      <button 
                        onClick={() => setSubInputType('link')}
                        className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${subInputType === 'link' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        链接导入
                      </button>
                    </div>
                  </div>

                  {subInputType === 'file' ? (
                    <div 
                      onClick={() => subInputRef.current?.click()}
                      className="border-2 border-slate-200 border-dashed rounded-2xl p-6 hover:border-brand-400 hover:bg-brand-50/30 transition-colors cursor-pointer group flex flex-col items-center justify-center text-center"
                    >
                      <input 
                        type="file" 
                        ref={subInputRef}
                        onChange={(e) => setSubFile(e.target.files?.[0] || null)}
                        style={{ display: 'none' }}
                        accept=".srt,.vtt,.ass"
                      />
                      <UploadCloud size={20} className="text-slate-400 group-hover:text-brand-500 mb-2 transition-colors" />
                      <p className="text-[13px] font-medium text-slate-700">
                        {subFile ? subFile.name : '上传字幕文件'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">支持 SRT, VTT, ASS 格式</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                        <LinkIcon size={16} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="粘贴字幕文件直链..." 
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-[13px] text-slate-700 placeholder:text-slate-400" 
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 2: PROCESSING */}
            {step === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="py-12 flex flex-col items-center justify-center text-center"
              >
                <div className="relative w-20 h-20 mb-8">
                  <svg className="animate-spin w-full h-full text-brand-100" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-brand-600">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                </div>
                
                <h3 className="text-[16px] font-semibold text-slate-800 mb-6">正在处理导入请求...</h3>
                
                <div className="w-full max-w-sm space-y-3 text-left">
                  {processingLogs.map((log, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 text-[13px] text-slate-600"
                    >
                      {idx === processingLogs.length - 1 && step === 'processing' ? (
                        <Loader2 size={14} className="animate-spin text-brand-500 shrink-0" />
                      ) : (
                        <CheckCircle2 size={14} className="text-success-500 shrink-0" />
                      )}
                      <span>{log}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: PREVIEW & OPTIONS */}
            {step === 'preview' && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Parsed Info Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-4">
                  <div className="w-32 h-20 bg-slate-200 rounded-xl overflow-hidden shrink-0 relative">
                    <img src={metadata.thumbnail || "https://picsum.photos/seed/import/320/180"} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">{metadata.duration}</div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="text-[14px] font-semibold text-slate-800 line-clamp-2 leading-snug mb-2">{metadata.title}</h4>
                    <div className="flex items-center gap-3 text-[12px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Video size={12} /> {metadata.source === 'youtube' ? 'YouTube' : '本地文件'}
                      </span>
                      {metadata.subtitlesDetected ? (
                        <span className="flex items-center gap-1 text-success-600 bg-success-50 px-1.5 py-0.5 rounded">
                          <Languages size={12} /> 已检测到字幕轨道
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={12} /> 未检测到字幕 (将使用 AI 自动提取)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Processing Options */}
                <div className="space-y-3">
                  <h3 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                    <Settings2 size={16} className="text-brand-500" />
                    处理选项
                  </h3>
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                    
                    <label className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="mt-0.5">
                        <input type="checkbox" checked={autoTranslate} onChange={(e) => setAutoTranslate(e.target.checked)} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-800">自动生成双语字幕</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">使用 AI 将英文字幕翻译为中文，并对齐时间轴</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="mt-0.5">
                        <input type="checkbox" checked={autoSegment} onChange={(e) => setAutoSegment(e.target.checked)} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-800">智能句段切分</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">根据语义和停顿自动切分句子，优化跟读体验</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="mt-0.5">
                        <input type="checkbox" checked={extractExpressions} onChange={(e) => setExtractExpressions(e.target.checked)} className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-800">提取核心表达</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">自动识别视频中的高频词汇和地道习语，生成预习卡片</p>
                      </div>
                    </label>

                  </div>
                </div>
                
                {errorMsg && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[13px] font-semibold text-amber-800">导入提示</p>
                      <p className="text-[12px] text-amber-700 mt-1">{errorMsg}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 4: ERROR / FALLBACK */}
            {step === 'error' && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="py-8 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} className="text-rose-500" />
                </div>
                <h3 className="text-[16px] font-semibold text-slate-800 mb-2">未检测到可用字幕</h3>
                <p className="text-[13px] text-slate-500 max-w-sm mb-8">
                  该视频源未提供 CC 字幕轨道，或字幕格式无法解析。缺少字幕将无法进行精听和跟读训练。
                </p>
                
                <div className="w-full space-y-3">
                  <button 
                    onClick={() => {
                      setAutoTranslate(true);
                      setAutoSegment(true);
                      setExtractExpressions(true);
                      setStep('preview');
                    }} 
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3 text-brand-700">
                      <Sparkles size={18} />
                      <div className="text-left">
                        <p className="text-[14px] font-semibold">使用 AI 自动生成字幕</p>
                        <p className="text-[12px] opacity-80 mt-0.5">消耗约 15 分钟 AI 算力，准确率 95%</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-brand-400 group-hover:text-brand-600 transition-colors" />
                  </button>
                  
                  <button onClick={() => setStep('input')} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3 text-slate-700">
                      <UploadCloud size={18} />
                      <div className="text-left">
                        <p className="text-[14px] font-semibold">手动上传字幕文件</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">返回上一步，上传本地 SRT/VTT 文件</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </button>
                  
                  <button onClick={() => setStep('preview')} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-3 text-slate-700">
                      <Video size={18} />
                      <div className="text-left">
                        <p className="text-[14px] font-semibold">仅作为视频素材导入</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">跳过字幕处理，仅用于泛听</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          {step === 'input' ? (
            <p className="text-[12px] text-slate-500">导入即表示您确认拥有该内容的使用权</p>
          ) : step === 'preview' ? (
            <button onClick={() => setStep('input')} className="text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors">
              返回修改
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[13px] font-medium transition-colors shadow-sm"
            >
              取消
            </button>
            
            {step === 'input' && (
              <button 
                onClick={handleStartProcessing}
                disabled={!videoLink && !videoFile}
                className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                下一步解析
                <ChevronRight size={16} />
              </button>
            )}
            
            {step === 'preview' && (
              <button 
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-[13px] font-medium hover:bg-brand-700 transition-all shadow-sm flex items-center gap-2"
              >
                确认导入并处理
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
