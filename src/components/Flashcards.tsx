import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, ChevronDown, BookOpen, Layers, 
  CheckCircle2, Clock, Sparkles, PlayCircle, Bookmark,
  MessageSquare, Type, Quote, FileText, X, ArrowRight,
  Video, Volume2, Target, Lightbulb, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FlashcardMeta, FlashcardType } from '../types';
import { ReviewMode } from './ReviewMode';

export function FlashcardsView({ 
  flashcards, 
  onPlayVideo, 
  onReviewCard,
  onUpdateCard
}: { 
  flashcards: FlashcardMeta[],
  onPlayVideo?: (id: string, timestamp: number) => void,
  onReviewCard: (id: string, feedback: 'forgot' | 'hard' | 'good' | 'easy') => void,
  onUpdateCard: (id: string, updates: Partial<FlashcardMeta>) => void
}) {
  const [activeTab, setActiveTab] = useState<FlashcardType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<FlashcardMeta | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Filters state
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const card = flashcards.find(c => c.id === id);
    if (card) {
      onUpdateCard(id, { isBookmarked: !card.isBookmarked });
    }
  };

  const sources = useMemo(() => {
    const uniqueSources = Array.from(new Set(flashcards.map(c => c.sourceVideoTitle)));
    return ['all', ...uniqueSources];
  }, [flashcards]);

  const filteredCards = flashcards.filter(card => {
    if (activeTab !== 'all' && card.type !== activeTab) return false;
    
    if (filterSource !== 'all' && card.sourceVideoTitle !== filterSource) return false;
    if (filterStatus !== 'all' && card.status !== filterStatus) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return card.content.toLowerCase().includes(q) || 
             card.translation.toLowerCase().includes(q) ||
             card.tags.some(t => t.toLowerCase().includes(q)) ||
             card.sourceVideoTitle.toLowerCase().includes(q);
    }
    return true;
  });

  const getTypeConfig = (type: FlashcardType) => {
    switch (type) {
      case 'word': return { icon: Type, label: '单词卡', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };
      case 'phrase': return { icon: Layers, label: '短语卡', color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' };
      case 'expression': return { icon: MessageSquare, label: '表达卡', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', highlight: true };
      case 'pattern': return { icon: Sparkles, label: '句型卡', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', highlight: true };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'new': return { label: '未学习', color: 'text-slate-500 bg-slate-100' };
      case 'learning': return { label: '学习中', color: 'text-brand-600 bg-brand-50' };
      case 'mastered': return { label: '已掌握', color: 'text-emerald-600 bg-emerald-50' };
      default: return { label: status, color: 'text-slate-500 bg-slate-100' };
    }
  };

  if (isReviewing) {
    return (
      <ReviewMode 
        cards={flashcards} 
        onClose={() => setIsReviewing(false)} 
        onPlayVideo={onPlayVideo} 
        onReviewCard={onReviewCard}
      />
    );
  }

  return (
    <div className="flex-1 h-screen overflow-y-auto hide-scrollbar bg-slate-50/50 p-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Top Workspace Area */}
        <div className="flex flex-col gap-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[24px] font-semibold text-slate-800 tracking-tight mb-2">口语表达资产库</h1>
              <p className="text-[14px] text-slate-500">管理和沉淀从真实语料中提取的高价值表达</p>
            </div>
          </div>

          {/* Stats & Insights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Review Action Card */}
            <div className="bg-white p-5 rounded-2xl border border-brand-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-white z-0" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-brand-900 font-semibold flex items-center gap-2">
                    <BrainCircuit size={18} className="text-brand-600" />
                    今日待复习
                  </h3>
                  <span className="text-[11px] font-medium bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                    预计 {Math.ceil(flashcards.filter(c => !c.nextReviewAt || new Date(c.nextReviewAt).getTime() <= Date.now()).length * 0.5)} 分钟
                  </span>
                </div>
                <p className="text-[13px] text-brand-700 mb-4">
                  包含 {flashcards.filter(c => !c.nextReviewAt).length} 张新卡片，{flashcards.filter(c => c.nextReviewAt && new Date(c.nextReviewAt).getTime() <= Date.now()).length} 张待巩固
                </p>
                <button 
                  onClick={() => setIsReviewing(true)}
                  disabled={flashcards.filter(c => !c.nextReviewAt || new Date(c.nextReviewAt).getTime() <= Date.now()).length === 0}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 group-hover:shadow-md"
                >
                  <PlayCircle size={18} />
                  开始复习 ({flashcards.filter(c => !c.nextReviewAt || new Date(c.nextReviewAt).getTime() <= Date.now()).length})
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
              <div className="text-slate-500 text-[13px] font-medium mb-1">总计提取资产</div>
              <div className="text-[28px] font-semibold text-slate-800">{flashcards.length}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center">
              <div className="text-slate-500 text-[13px] font-medium mb-1">已掌握表达</div>
              <div className="text-[28px] font-semibold text-slate-800">{flashcards.filter(c => c.status === 'mastered').length}</div>
            </div>
            <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-brand-500/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/3" />
              <div className="flex items-start gap-3 relative z-10">
                <Lightbulb className="text-brand-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <div className="text-brand-900 text-[13px] font-semibold mb-1">AI 语料洞察</div>
                  <div className="text-brand-700 text-[12px] leading-relaxed">
                    {sources.length > 1 
                      ? `本周从 《${sources[1]}》 等语料中提取了 ${flashcards.length} 张高价值资产，建议优先复习以巩固表达能力。`
                      : '目前暂无深度洞察，请继续导入更多高价值语料。'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/60 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all"
                placeholder="搜索单词、短语、表达、来源视频或主题标签..."
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 overflow-x-auto hide-scrollbar">
              <div className="relative group/select">
                <select 
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="appearance-none flex items-center gap-1.5 px-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="all">全部来源</option>
                  {sources.filter(s => s !== 'all').map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>

              <div className="relative group/select">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none flex items-center gap-1.5 px-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="all">全部状态</option>
                  <option value="new">未学习</option>
                  <option value="learning">学习中</option>
                  <option value="mastered">已掌握</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 pt-4 overflow-x-auto hide-scrollbar">
            <span className="text-[13px] text-slate-500 font-medium mr-2 shrink-0">资产类型:</span>
            {[
              { id: 'all', label: '全部' },
              { id: 'expression', label: '表达卡' },
              { id: 'pattern', label: '句型卡' },
              { id: 'phrase', label: '短语卡' },
              { id: 'word', label: '单词卡' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-10">
          {filteredCards.map((card, idx) => {
            const typeConfig = getTypeConfig(card.type);
            const statusConfig = getStatusConfig(card.status);
            const Icon = typeConfig.icon;

            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`group cursor-pointer flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border ${typeConfig.highlight ? typeConfig.border : 'border-slate-200/60'}`}
              >
                {/* Highlight Top Bar for Expressions/Patterns */}
                {typeConfig.highlight && (
                  <div className={`h-1.5 w-full ${typeConfig.bg} border-b ${typeConfig.border}`} />
                )}

                <div className="p-5 flex flex-col h-full gap-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                      <Icon size={12} />
                      {typeConfig.label}
                    </div>
                    <button 
                      className="text-slate-300 hover:text-amber-400 transition-colors"
                      onClick={(e) => toggleBookmark(card.id, e)}
                    >
                      <Bookmark size={18} className={card.isBookmarked ? "fill-amber-400 text-amber-400" : ""} />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="flex-1">
                    <h3 className="text-[18px] font-bold text-slate-800 leading-tight mb-2 group-hover:text-brand-600 transition-colors">
                      {card.content}
                    </h3>
                    <p className="text-[14px] text-slate-500 line-clamp-2">
                      {card.translation}
                    </p>
                  </div>

                  {/* Tags */}
                  {card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {card.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[11px] rounded">
                          {tag}
                        </span>
                      ))}
                      {card.tags.length > 2 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[11px] rounded">
                          +{card.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 max-w-[60%]">
                      <Video size={12} className="shrink-0" />
                      <span className="truncate">{card.sourceVideoTitle}</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedCard(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium ${getTypeConfig(selectedCard.type).bg} ${getTypeConfig(selectedCard.type).color}`}>
                    {React.createElement(getTypeConfig(selectedCard.type).icon, { size: 16 })}
                    {getTypeConfig(selectedCard.type).label}
                  </div>
                  <div className="flex gap-2">
                    {selectedCard.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[12px] rounded-lg shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-50 rounded-xl transition-colors"
                    onClick={(e) => toggleBookmark(selectedCard.id, e)}
                  >
                    <Bookmark size={20} className={selectedCard.isBookmarked ? "fill-amber-400 text-amber-400" : ""} />
                  </button>
                  <button 
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    onClick={() => setSelectedCard(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
                {/* Left: Asset Details */}
                <div className="flex-1 p-8 border-r border-slate-100 space-y-8">
                  <div>
                    <h2 className="text-[32px] font-bold text-slate-800 mb-3">{selectedCard.content}</h2>
                    <div className="flex items-center gap-4">
                      <p className="text-[18px] text-brand-600 font-medium">{selectedCard.translation}</p>
                      {selectedCard.phonetic && (
                        <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-[14px] font-mono">
                          <Volume2 size={14} />
                          {selectedCard.phonetic}
                        </div>
                      )}
                      {selectedCard.partOfSpeech && (
                        <span className="text-[14px] text-slate-400 italic">{selectedCard.partOfSpeech}</span>
                      )}
                    </div>
                  </div>

                  {/* Type Specific Fields */}
                  <div className="space-y-6">
                    {selectedCard.scene && (
                      <div>
                        <h4 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-2">适用场景</h4>
                        <p className="text-[15px] text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl">{selectedCard.scene}</p>
                      </div>
                    )}
                    
                    {selectedCard.template && (
                      <div>
                        <h4 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-2">句型结构</h4>
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                          <code className="text-[15px] text-amber-800 font-mono">{selectedCard.template}</code>
                        </div>
                      </div>
                    )}

                    {selectedCard.enExplanation && (
                      <div>
                        <h4 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-2">英文释义</h4>
                        <p className="text-[15px] text-slate-700 leading-relaxed">{selectedCard.enExplanation}</p>
                      </div>
                    )}

                    {(selectedCard.synonyms || selectedCard.variants) && (
                      <div>
                        <h4 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          {selectedCard.synonyms ? '近义替换' : '常见变体'}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {(selectedCard.synonyms || selectedCard.variants)?.map(item => (
                            <span key={item} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[14px]">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedCard.authenticExpressions && (
                      <div>
                        <h4 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-2">地道表达示例</h4>
                        <ul className="space-y-2">
                          {selectedCard.authenticExpressions.map((expr, i) => (
                            <li key={i} className="flex items-start gap-2 text-[15px] text-slate-700">
                              <span className="text-brand-400 mt-1">•</span>
                              {expr}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Source Context */}
                <div className="w-full md:w-[400px] bg-slate-50 p-8 flex flex-col">
                  <h4 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Video size={14} />
                    原始语料来源
                  </h4>
                  
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 mb-6">
                    <p className="text-[15px] text-slate-800 leading-relaxed mb-4">
                      {/* Highlight the target content in the sentence */}
                      {selectedCard.sourceSentence.split(new RegExp(`(${selectedCard.content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, i) => 
                        part.toLowerCase() === selectedCard.content.toLowerCase() 
                          ? <strong key={i} className="text-brand-600 bg-brand-50 px-1 rounded">{part}</strong>
                          : part
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-[12px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                      <Clock size={12} />
                      <span>{Math.floor(selectedCard.sourceTimestamp / 60)}:{(selectedCard.sourceTimestamp % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="text-[12px] text-slate-400 mb-1">来自视频</div>
                    <div className="text-[14px] font-medium text-slate-700 line-clamp-2">
                      {selectedCard.sourceVideoTitle}
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button 
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        if (onPlayVideo) {
                          onPlayVideo(selectedCard.sourceVideoId, selectedCard.sourceTimestamp);
                        }
                        setSelectedCard(null);
                      }}
                    >
                      <PlayCircle size={18} />
                      回到原视频播放
                    </button>
                    <p className="text-center text-[12px] text-slate-400 mt-3">
                      在真实语境中复习，记忆更深刻
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
