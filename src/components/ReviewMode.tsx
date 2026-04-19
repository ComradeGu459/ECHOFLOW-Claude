import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, BrainCircuit, PlayCircle, 
  Volume2, ArrowRight, Video, Target, Sparkles,
  RotateCcw, Clock
} from 'lucide-react';
import { FlashcardMeta } from '../types';
import { calculateSM2 } from '../lib/srs';

interface ReviewModeProps {
  cards: FlashcardMeta[];
  onClose: () => void;
  onPlayVideo?: (id: string, timestamp: number) => void;
  onReviewCard: (id: string, feedback: 'forgot' | 'hard' | 'good' | 'easy') => void;
}

type FeedbackType = 'forgot' | 'hard' | 'good' | 'easy';

export function ReviewMode({ cards, onClose, onPlayVideo, onReviewCard }: ReviewModeProps) {
  // Filter cards due for review based on nextReviewAt timestamp
  const dueCards = cards.filter(card => {
    if (!card.nextReviewAt) return true; // new card
    return new Date(card.nextReviewAt).getTime() <= Date.now();
  });

  const [queue] = useState<FlashcardMeta[]>(() => [...dueCards].sort(() => 0.5 - Math.random()));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Track stats for the summary
  const [stats, setStats] = useState({ forgot: 0, hard: 0, good: 0, easy: 0 });

  const currentCard = queue[currentIndex];
  // prevent NaN when queue is empty
  const progress = ((currentIndex) / Math.max(1, queue.length)) * 100;

  const handleFeedback = useCallback((type: FeedbackType) => {
    if (!currentCard) return;
    setStats(prev => ({ ...prev, [type]: prev[type] + 1 }));
    
    // Call the central state update
    onReviewCard(currentCard.id, type);
    
    if (currentIndex < queue.length - 1) {
      setShowAnswer(false);
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, queue.length, onReviewCard, currentCard?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || queue.length === 0) return;
      
      if (!showAnswer && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        setShowAnswer(true);
      } else if (showAnswer) {
        switch (e.key) {
          case '1': handleFeedback('forgot'); break;
          case '2': handleFeedback('hard'); break;
          case '3': handleFeedback('good'); break;
          case '4': handleFeedback('easy'); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, isFinished, handleFeedback, queue.length]);

  if (queue.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-soft-lg border border-slate-200 p-10 max-w-lg w-full text-center"
        >
          <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-brand-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">太棒了！</h2>
          <p className="text-slate-500 mb-8">目前没有需要复习的卡片。你可以去积累更多表达！</p>
          <button 
            onClick={onClose}
            className="w-full py-4 rounded-2xl font-bold text-[15px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            返回闪卡库
          </button>
        </motion.div>
      </div>
    );
  }

  if (isFinished) {
    return <ReviewSummary stats={stats} total={queue.length} onClose={onClose} />;
  }

  if (!currentCard) return null;

  // Predict intervals for the UI buttons
  const predictIntervalText = (quality: 0 | 1 | 2 | 3) => {
    const srs = calculateSM2(quality, currentCard.repetition || 0, currentCard.easeFactor || 2.5, currentCard.interval || 0);
    if (srs.interval === 0) return "< 10分钟";
    if (srs.interval === 1) return "1 天";
    return `${srs.interval} 天`;
  };

  const isOutputFocused = currentCard.type === 'expression' || currentCard.type === 'pattern';
  const escapedContent = currentCard.content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blankedSentence = currentCard.sourceSentence.replace(new RegExp(`(${escapedContent})`, 'gi'), '__________');

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      {/* Header & Progress */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-[12px] font-medium text-slate-500 mb-1.5">
              <span>复习进度</span>
              <span>{currentIndex + 1} / {queue.length}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-brand-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
          <BrainCircuit size={16} className="text-brand-500" />
          智能复习中
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
        <motion.div 
          key={currentCard.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-3xl bg-white rounded-3xl shadow-soft border border-slate-200/60 overflow-hidden flex flex-col"
        >
          {/* PROMPT AREA (Front of Card) */}
          <div className="p-8 md:p-12 flex flex-col items-center text-center relative">
            {/* Context Hint / Type Badge */}
            <div className="mb-6">
              {isOutputFocused ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-[13px] font-medium">
                  <Sparkles size={14} />
                  回忆{currentCard.type === 'expression' ? '表达' : '句型'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[13px] font-medium">
                  <Target size={14} />
                  回忆释义
                </span>
              )}
            </div>

            {/* Main Prompt Content */}
            {isOutputFocused ? (
              <div className="space-y-6 w-full max-w-xl">
                <h2 className="text-3xl font-bold text-slate-800 leading-tight">
                  {currentCard.translation}
                </h2>
                {currentCard.scene && (
                  <p className="text-slate-500 text-[15px]">场景提示：{currentCard.scene}</p>
                )}
                <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                  <p className="text-[16px] text-slate-600 leading-relaxed font-medium">
                    "{blankedSentence}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-slate-800 tracking-tight">
                  {currentCard.content}
                </h2>
                {currentCard.phonetic && (
                  <div className="flex items-center justify-center gap-2 text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg inline-flex mx-auto">
                    <Volume2 size={16} />
                    {currentCard.phonetic}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ANSWER AREA (Back of Card) */}
          <AnimatePresence>
            {showAnswer && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="border-t border-slate-100 bg-slate-50/50"
              >
                <div className="p-8 md:p-12">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Left: Core Meaning */}
                    <div className="flex-1 space-y-6">
                      {isOutputFocused ? (
                        <div>
                          <div className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-2">目标表达</div>
                          <h3 className="text-3xl font-bold text-brand-600">{currentCard.content}</h3>
                          {currentCard.phonetic && (
                            <div className="flex items-center gap-2 text-slate-500 font-mono mt-3">
                              <Volume2 size={16} />
                              {currentCard.phonetic}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-2">中文释义</div>
                          <h3 className="text-2xl font-bold text-brand-600">{currentCard.translation}</h3>
                          {currentCard.enExplanation && (
                            <p className="text-slate-600 mt-3 text-[15px] leading-relaxed">{currentCard.enExplanation}</p>
                          )}
                        </div>
                      )}

                      {/* Extra Context if available */}
                      {(currentCard.authenticExpressions || currentCard.template) && (
                        <div className="pt-4 border-t border-slate-200/60">
                          {currentCard.template && (
                            <div className="mb-4">
                              <div className="text-[12px] text-slate-400 mb-1">句型结构</div>
                              <code className="text-[14px] text-amber-700 bg-amber-50 px-2 py-1 rounded">{currentCard.template}</code>
                            </div>
                          )}
                          {currentCard.authenticExpressions && (
                            <div>
                              <div className="text-[12px] text-slate-400 mb-2">地道用法示例</div>
                              <ul className="space-y-1.5">
                                {currentCard.authenticExpressions.map((expr, i) => (
                                  <li key={i} className="text-[14px] text-slate-700 flex items-start gap-2">
                                    <span className="text-brand-400 mt-0.5">•</span>
                                    {expr}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Source Video Link */}
                    <div className="w-full md:w-64 shrink-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                      <div className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Video size={14} />
                        语料来源
                      </div>
                      <p className="text-[14px] text-slate-700 leading-relaxed mb-4 italic">
                        "{currentCard.sourceSentence.split(new RegExp(`(${escapedContent})`, 'gi')).map((part, i) => 
                          part.toLowerCase() === currentCard.content.toLowerCase() 
                            ? <strong key={i} className="text-brand-600 bg-brand-50 px-1 rounded not-italic">{part}</strong>
                            : part
                        )}"
                      </p>
                      <div className="mt-auto pt-4 border-t border-slate-100">
                        <div className="text-[12px] text-slate-500 line-clamp-1 mb-3" title={currentCard.sourceVideoTitle}>
                          {currentCard.sourceVideoTitle}
                        </div>
                        <button 
                          onClick={() => onPlayVideo?.(currentCard.sourceVideoId, currentCard.sourceTimestamp)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-medium rounded-xl transition-colors"
                        >
                          <PlayCircle size={16} />
                          原音重现
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ACTION AREA (Bottom Controls) */}
        <div className="w-full max-w-3xl mt-8 h-24 flex items-center justify-center">
          {!showAnswer ? (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowAnswer(true)}
              className="w-full max-w-md bg-slate-800 hover:bg-slate-900 text-white font-medium py-4 rounded-2xl shadow-soft-lg transition-all flex items-center justify-center gap-2 text-[16px]"
            >
              显示答案
              <span className="text-slate-400 text-[13px] font-normal ml-2 hidden sm:inline">(按空格键)</span>
            </motion.button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full grid grid-cols-4 gap-3 md:gap-4"
            >
              <FeedbackButton 
                type="forgot" label="不会" shortcut="1" interval={predictIntervalText(0)} 
                colorClass="bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300"
                onClick={() => handleFeedback('forgot')} 
              />
              <FeedbackButton 
                type="hard" label="模糊" shortcut="2" interval={predictIntervalText(1)} 
                colorClass="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300"
                onClick={() => handleFeedback('hard')} 
              />
              <FeedbackButton 
                type="good" label="会了" shortcut="3" interval={predictIntervalText(2)} 
                colorClass="bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 hover:border-brand-300"
                onClick={() => handleFeedback('good')} 
              />
              <FeedbackButton 
                type="easy" label="已掌握" shortcut="4" interval={predictIntervalText(3)} 
                colorClass="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                onClick={() => handleFeedback('easy')} 
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackButton({ type, label, shortcut, interval, colorClass, onClick }: { type: string, label: string, shortcut: string, interval: string, colorClass: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center py-3 md:py-4 rounded-2xl border transition-all shadow-sm ${colorClass}`}
    >
      <div className="text-[16px] font-bold mb-1 flex items-center gap-2">
        {label}
      </div>
      <div className="text-[12px] opacity-80 font-medium flex items-center gap-1.5">
        <Clock size={12} />
        {interval}
      </div>
      <div className="absolute top-2 right-2 text-[10px] opacity-50 hidden md:block border border-current rounded px-1.5">
        {shortcut}
      </div>
    </button>
  );
}

function ReviewSummary({ stats, total, onClose }: { stats: any, total: number, onClose: () => void }) {
  const masteryRate = Math.round(((stats.good + stats.easy) / total) * 100) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-soft-lg border border-slate-200 p-10 max-w-lg w-full text-center"
      >
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">今日复习完成！</h2>
        <p className="text-slate-500 mb-8">你正在稳步积累属于自己的口语表达资产</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-[24px] font-bold text-slate-800 mb-1">{total}</div>
            <div className="text-[12px] font-medium text-slate-500">复习总数</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <div className="text-[24px] font-bold text-emerald-600 mb-1">{stats.good + stats.easy}</div>
            <div className="text-[12px] font-medium text-emerald-600">熟练掌握</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
            <div className="text-[24px] font-bold text-amber-600 mb-1">{stats.forgot + stats.hard}</div>
            <div className="text-[12px] font-medium text-amber-600">需要加强</div>
          </div>
        </div>

        {stats.forgot + stats.hard > 0 && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-left mb-8 flex items-start gap-3">
            <BrainCircuit className="text-brand-500 shrink-0 mt-0.5" size={18} />
            <div>
              <div className="text-[13px] font-semibold text-brand-900 mb-1">复习建议</div>
              <div className="text-[13px] text-brand-700 leading-relaxed">
                有 {stats.forgot + stats.hard} 个表达还不够熟练。建议稍后回到原视频，结合真实语境再听几遍，增强肌肉记忆。
              </div>
            </div>
          </div>
        )}

        <button 
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3.5 rounded-xl transition-all shadow-sm"
        >
          返回资产库
        </button>
      </motion.div>
    </div>
  );
}
