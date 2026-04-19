import { 
  Search, Clock, Signal, Bookmark, PlayCircle, Plus, 
  CheckCircle2, Loader2, Sparkles, Youtube, MonitorPlay, 
  Tv, Layers, FileText, Type, MessageSquare, ChevronDown,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useMemo } from 'react';
import { VideoMeta, FlashcardMeta, LearningLog } from '../types';

export function LibraryView({ 
  videos, 
  onPlay, 
  onUpdateVideo,
  setIsImportOpen,
  logs = [],
  flashcards = []
}: { 
  videos: VideoMeta[],
  onPlay: (id: string) => void, 
  onUpdateVideo: (id: string, updates: Partial<VideoMeta>) => void,
  setIsImportOpen: (open: boolean) => void,
  logs?: LearningLog[],
  flashcards?: FlashcardMeta[]
}) {
  // DATA-SOURCE: Receives `videos` from App.tsx state.
  // LINKED-WITH: StudioView (via onPlay), ImportModal (via setIsImportOpen).
  
  const formatLastLearned = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins} 分钟前`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} 小时前`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} 天前`;
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  const weeklyHours = useMemo(() => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weeklyLogs = logs.filter(log => new Date(log.timestamp) > lastWeek);
    const minutes = weeklyLogs.reduce((acc, log) => acc + (log.duration || 0), 0) / 60;
    return minutes.toFixed(1);
  }, [logs]);

  const [showProcessingDetails, setShowProcessingDetails] = useState(false);

  const masteredCount = useMemo(() => {
    return flashcards.filter(f => f.status === 'mastered').length;
  }, [flashcards]);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filters state
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterProcess, setFilterProcess] = useState<string>('all');

  const topics = useMemo(() => {
    const allTags = videos.flatMap(v => v.aiTags);
    return ['all', ...Array.from(new Set(allTags))];
  }, [videos]);

  const filteredVideos = videos.filter(video => {
    // 1. Tab filtering
    if (activeTab === 'learning' && video.status !== 'learning') return false;
    if (activeTab === 'review' && video.status !== 'to_review') return false;
    if (activeTab === 'bookmarked' && !video.isBookmarked) return false;
    if (activeTab === 'completed' && video.status !== 'completed') return false;

    // 2. Advanced Filters
    if (filterTopic !== 'all' && !video.aiTags.includes(filterTopic)) return false;
    if (filterLevel !== 'all' && video.difficulty !== filterLevel) return false;
    if (filterProcess !== 'all' && video.processingStatus.step !== filterProcess) return false;

    // 3. Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = video.title.toLowerCase().includes(query);
      const matchSource = video.source.toLowerCase().includes(query);
      const matchTags = video.aiTags.some(tag => tag.toLowerCase().includes(query));
      if (!matchTitle && !matchSource && !matchTags) return false;
    }

    return true;
  });

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videos.find(v => v.id === id);
    if (video) {
      onUpdateVideo(id, { isBookmarked: !video.isBookmarked });
    }
  };

  const processingItems = videos.filter(v => v.processingStatus.isProcessing);

  const tabs = [
    { id: 'all', label: '全部素材' },
    { id: 'learning', label: '学习中' },
    { id: 'review', label: '待复习' },
    { id: 'bookmarked', label: '已收藏' },
    { id: 'completed', label: '已完成' }
  ];

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'youtube': return <Youtube size={14} className="text-rose-500" />;
      case 'bilibili': return <Tv size={14} className="text-blue-400" />;
      case 'local': return <MonitorPlay size={14} className="text-emerald-500" />;
      default: return <MonitorPlay size={14} className="text-slate-500" />;
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Advanced': return 'text-rose-500 bg-rose-50';
      case 'Intermediate': return 'text-amber-500 bg-amber-50';
      case 'Beginner': return 'text-emerald-500 bg-emerald-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const getDifficultyText = (diff: string) => {
    switch (diff) {
      case 'Advanced': return '高阶';
      case 'Intermediate': return '中阶';
      case 'Beginner': return '初阶';
      default: return diff;
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto hide-scrollbar bg-slate-50/50 p-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Header & Search/Import Composite Area */}
        <div className="bg-white rounded-3xl p-8 shadow-soft-sm border border-slate-200/60 relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-brand-50/50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-6">
            <div>
              <h1 className="text-[24px] font-semibold text-slate-800 tracking-tight mb-2">你的英语语料工作台</h1>
              <div className="flex items-center gap-4 text-[13px] text-slate-500">
                <span>共收录 <strong className="text-slate-700 font-semibold">{videos.length}</strong> 个素材</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>本周已学习 <strong className="text-slate-700 font-semibold">{weeklyHours}</strong> 小时</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>掌握 <strong className="text-slate-700 font-semibold">{masteredCount}</strong> 个核心表达</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all shadow-sm"
                  placeholder="搜索标题、主题、标签、来源，或直接粘贴链接快速导入..."
                />
              </div>
              <button 
                onClick={() => setIsImportOpen(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-medium px-6 py-3.5 rounded-2xl transition-all shadow-sm flex items-center gap-2 shrink-0"
              >
                <Plus size={18} />
                导入新素材
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Tabs */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {/* Learning Status Tabs */}
            <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Advanced Filters */}
            <div className="flex items-center gap-2">
              <div className="relative group/select">
                <select 
                  value={filterTopic}
                  onChange={(e) => setFilterTopic(e.target.value)}
                  className="appearance-none flex items-center gap-1.5 px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="all">主题分类</option>
                  {topics.filter(t => t !== 'all').map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={12} />
                </div>
              </div>

              <div className="relative group/select">
                <select 
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="appearance-none flex items-center gap-1.5 px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="all">难度与口音</option>
                  <option value="Beginner">初阶</option>
                  <option value="Intermediate">中阶</option>
                  <option value="Advanced">高阶</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={12} />
                </div>
              </div>

              <div className="relative group/select">
                <select 
                  value={filterProcess}
                  onChange={(e) => setFilterProcess(e.target.value)}
                  className="appearance-none flex items-center gap-1.5 px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="all">处理状态</option>
                  <option value="parsing">正在解析</option>
                  <option value="transcribing">正在转写</option>
                  <option value="analyzing">正在分析</option>
                  <option value="done">已完成</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending / Processing Area */}
        {processingItems.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-brand-50/50 border border-brand-100 rounded-2xl p-4 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                <Loader2 className="animate-spin text-brand-500" size={20} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-brand-900 flex items-center gap-2">
                  {processingItems.length} 个素材正在 AI 处理中
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                  </span>
                </p>
                <p className="text-[12px] text-brand-700 mt-0.5">
                  {processingItems[0].title} (正在生成双语字幕和重点表达...)
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowProcessingDetails(true)}
              className="text-[13px] text-brand-600 font-medium hover:text-brand-700 bg-white px-4 py-2 rounded-xl shadow-sm border border-brand-100 transition-colors"
            >
              查看详情
            </button>
          </motion.div>
        )}

        {/* Processing Details Modal */}
        <AnimatePresence>
          {showProcessingDetails && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                onClick={() => setShowProcessingDetails(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-[18px] font-bold text-slate-800">AI 任务队列</h3>
                    <p className="text-[13px] text-slate-500 mt-1">系统正在处理您的多媒体素材...</p>
                  </div>
                  <button onClick={() => setShowProcessingDetails(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <CheckCircle2 size={24} className="text-slate-300 hover:text-emerald-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  {processingItems.map(item => (
                    <div key={item.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="text-[14px] font-semibold text-slate-800 truncate">{item.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.source === 'youtube' ? 'YouTube 采集' : '外部上传'}</p>
                        </div>
                        <span className="text-[12px] font-mono font-medium text-brand-600">{item.processingStatus.percent}%</span>
                      </div>
                      
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-4">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.processingStatus.percent}%` }}
                          className="h-full bg-brand-500 rounded-full"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <div className={`w-2 h-2 rounded-full ${item.processingStatus.subtitles === 'done' ? 'bg-emerald-500' : 'bg-brand-500 animate-pulse'}`} />
                          字幕处理
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <div className={`w-2 h-2 rounded-full ${item.processingStatus.bilingual === 'done' ? 'bg-emerald-500' : item.processingStatus.bilingual === 'processing' ? 'bg-brand-500 animate-pulse' : 'bg-slate-200'}`} />
                          双语对齐
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <div className={`w-2 h-2 rounded-full ${item.processingStatus.expressions === 'done' ? 'bg-emerald-500' : item.processingStatus.expressions === 'processing' ? 'bg-brand-500 animate-pulse' : 'bg-slate-200'}`} />
                          表达提取
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <div className={`w-2 h-2 rounded-full ${item.processingStatus.flashcards === 'done' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                          闪卡生成
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setShowProcessingDetails(false)}
                  className="w-full mt-8 py-3 bg-slate-800 text-white rounded-2xl text-[14px] font-medium hover:bg-slate-900 transition-colors"
                >
                  继续浏览素材库
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {filteredVideos.map((video, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={video.id}
              className="group flex flex-col bg-white rounded-3xl shadow-soft-sm border border-slate-100 hover:shadow-soft-lg hover:border-slate-200 transition-all duration-300 overflow-hidden"
            >
              {/* Thumbnail Container */}
              <div 
                className="relative aspect-video bg-slate-100 cursor-pointer overflow-hidden"
                onClick={() => onPlay(video.id)}
              >
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-80" />
                
                {/* Top Left: Source */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  {getSourceIcon(video.source)}
                </div>

                {/* Top Right: Bookmark */}
                <button 
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm hover:bg-white transition-colors z-10"
                  onClick={(e) => toggleBookmark(video.id, e)}
                >
                  <Bookmark size={14} className={video.isBookmarked ? "fill-amber-400 text-amber-400" : "text-slate-400"} />
                </button>
                
                {/* Bottom Left: Difficulty & Accent */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 shadow-sm ${getDifficultyColor(video.difficulty)}`}>
                    <Signal size={10} />
                    {getDifficultyText(video.difficulty)}
                  </div>
                  <div className="px-2 py-1 rounded-md text-[11px] font-medium bg-black/40 backdrop-blur-md text-white shadow-sm">
                    {video.accent}
                  </div>
                </div>

                {/* Bottom Right: Duration */}
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[11px] font-mono text-white flex items-center gap-1.5 shadow-sm">
                  <Clock size={10} />
                  {video.duration}
                </div>

                {/* Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-14 h-14 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[14px] border-l-brand-500 ml-1.5" />
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-5 flex flex-col gap-4 flex-1">
                {/* Title & AI Tags */}
                <div className="space-y-2">
                  <h3 
                    className="font-semibold text-[15px] text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-600 transition-colors cursor-pointer"
                    onClick={() => onPlay(video.id)}
                  >
                    {video.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {video.aiTags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-medium rounded flex items-center gap-1">
                        <Sparkles size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto space-y-4">
                  {/* Processing Status Indicators */}
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <div className={`flex items-center gap-1 ${video.processingStatus.subtitles === 'done' ? 'text-slate-700' : 'text-slate-300'}`} title="英文字幕">
                      <FileText size={14} className={video.processingStatus.subtitles === 'done' ? 'text-brand-500' : ''} /> CC
                    </div>
                    <div className={`flex items-center gap-1 ${video.processingStatus.bilingual === 'done' ? 'text-slate-700' : video.processingStatus.bilingual === 'processing' ? 'text-amber-500' : 'text-slate-300'}`} title="双语字幕">
                      {video.processingStatus.bilingual === 'processing' ? <Loader2 size={14} className="animate-spin" /> : <Type size={14} className={video.processingStatus.bilingual === 'done' ? 'text-brand-500' : ''} />} 文
                    </div>
                    <div className={`flex items-center gap-1 ${video.processingStatus.expressions === 'done' ? 'text-slate-700' : video.processingStatus.expressions === 'processing' ? 'text-amber-500' : 'text-slate-300'}`} title="重点表达">
                      {video.processingStatus.expressions === 'processing' ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} className={video.processingStatus.expressions === 'done' ? 'text-brand-500' : ''} />} 表达
                    </div>
                    <div className={`flex items-center gap-1 ${video.processingStatus.flashcards === 'done' ? 'text-slate-700' : 'text-slate-300'}`} title="闪卡">
                      <Layers size={14} className={video.processingStatus.flashcards === 'done' ? 'text-brand-500' : ''} /> 闪卡
                    </div>
                  </div>

                  {/* Learning Progress */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {video.status === 'not_started' ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-slate-500 font-medium">尚未开始学习</span>
                        <button onClick={() => onPlay(video.id)} className="text-[12px] text-brand-600 font-medium hover:text-brand-700">开始学习</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-700">
                            {video.status === 'completed' ? '已完成' : video.status === 'to_review' ? '待复习' : '学习中'}
                          </span>
                          <span className="text-slate-500">已学 {video.learnedSentences}/{video.totalSentences} 句</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${video.status === 'completed' || video.status === 'to_review' ? 'bg-success-500' : 'bg-brand-500'}`} 
                            style={{ width: `${video.progress}%` }}
                          />
                        </div>
                        {video.lastLearnedAt && (
                          <div className="text-[10px] text-slate-400 pt-0.5">
                            上次学习: {formatLastLearned(video.lastLearnedAt)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}
