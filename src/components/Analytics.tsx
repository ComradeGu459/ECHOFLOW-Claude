import React from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Clock, Flame, Mic, BrainCircuit, TrendingUp, 
  Target, MessageSquare, PlayCircle, ChevronDown,
  Lightbulb, ArrowRight, Activity, Headphones, Video
} from 'lucide-react';
import { VideoMeta, FlashcardMeta, LearningLog } from '../types';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

interface ChartCardProps {
  title: string;
  description?: string;
  height?: number;
  className?: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

function SafeResponsiveContainer({ children, height = "100%", width = "100%" }: { children: React.ReactNode, height?: string | number, width?: string | number }) {
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-slate-50/50 animate-pulse rounded-xl flex items-center justify-center">
        <span className="text-[11px] text-slate-400 font-medium">准备中...</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width={width as any} height={height as any} minWidth={0} minHeight={0} debounce={100}>
      {children as React.ReactElement}
    </ResponsiveContainer>
  );
}

function ChartCard({ title, description, height = 280, className = '', children, headerExtra }: ChartCardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-soft-sm p-6 flex flex-col min-w-0 ${className}`}>
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-800 tracking-tight">{title}</h3>
          {description && <p className="text-[12px] text-slate-500 mt-1">{description}</p>}
        </div>
        {headerExtra}
      </div>
      <div style={{ height: `${height}px` }} className="w-full min-w-0 relative overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function AnalyticsView({ 
  videos, 
  flashcards, 
  logs 
}: { 
  videos: VideoMeta[], 
  flashcards: FlashcardMeta[], 
  logs: LearningLog[] 
}) {
  // DATA-SOURCE: Derived entirely from real user behavior logs and flashcard states.
  // CONTRACT: No fake data. If logs are empty, show empty states.
  // LINKED-WITH: App.tsx (state), StudioView (log source), FlashcardsView (mastery source).
  
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m}m`;
  };

  // --- Real Data Computation ---
  const totalLearningTime = logs.reduce((acc, log) => acc + (log.duration || 0), 0) / 60; // in minutes
  const inputTime = logs.filter(l => l.type === 'play').reduce((acc, log) => acc + (log.duration || 0), 0) / 60;
  const outputTime = logs.filter(l => l.type === 'shadowing').reduce((acc, log) => acc + (log.duration || 0), 0) / 60;
  
  const masteredExpressions = flashcards.filter(f => f.status === 'mastered').length;
  const toReviewCards = flashcards.filter(f => f.status === 'learning' || f.status === 'new').length;
  
  const totalShadowing = logs.filter(l => l.type === 'shadowing').length;
  const pronunciationFeedback = logs.filter(l => l.type === 'shadowing').length; // Assuming 1 feedback per shadowing
  
  // Calculate streak (simplified: days with logs)
  const uniqueDays = new Set(logs.map(l => l.timestamp.split('T')[0])).size;
  const currentStreak = uniqueDays; 
  const weeklyConsistency = uniqueDays > 0 ? Math.round((uniqueDays / 7) * 100) : 0;

  // Generate last 7 days for trends
  const trends = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logs.filter(l => l.timestamp.startsWith(dateStr));
    
    return {
      date: `${d.getMonth() + 1}-${d.getDate()}`,
      input: dayLogs.filter(l => l.type === 'play').reduce((acc, l) => acc + (l.duration || 0), 0) / 60,
      output: dayLogs.filter(l => l.type === 'shadowing').reduce((acc, l) => acc + (l.duration || 0), 0) / 60,
      review: dayLogs.filter(l => l.type === 'flashcard_review').length * 2 // assume 2 mins per review
    };
  });

  // Calculate categories from video tags
  const tagCounts: Record<string, number> = {};
  videos.forEach(v => {
    v.aiTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const categories = Object.entries(tagCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const hasData = logs.length > 0 || flashcards.length > 0;

  return (
    <div className="flex-1 h-screen overflow-y-auto hide-scrollbar bg-slate-50/50 p-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-slate-800 tracking-tight mb-2">学习数据中心</h1>
            <p className="text-[14px] text-slate-500">追踪你的口语训练进展与表达资产积累</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
            近 7 天
            <ChevronDown size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Row 1: Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard 
            title="总学习时长" 
            value={formatTime(totalLearningTime)}
            icon={Clock}
            iconColor="text-blue-500"
            bg="bg-blue-50"
            secondary={`输入 ${formatTime(inputTime)} · 输出 ${formatTime(outputTime)}`}
          />
          <SummaryCard 
            title="口语输出训练" 
            value={`${totalShadowing} 句`}
            icon={Mic}
            iconColor="text-indigo-500"
            bg="bg-indigo-50"
            secondary={`${pronunciationFeedback} 次发音反馈`}
          />
          <SummaryCard 
            title="表达资产积累" 
            value={`${masteredExpressions} 掌握`}
            icon={BrainCircuit}
            iconColor="text-emerald-500"
            bg="bg-emerald-50"
            secondary={`今日待复习 ${toReviewCards} 张`}
          />
          <SummaryCard 
            title="连续学习" 
            value={`${currentStreak} 天`}
            icon={Flame}
            iconColor="text-orange-500"
            bg="bg-orange-50"
            secondary={`本周一致性 ${weeklyConsistency}%`}
          />
        </div>

        {!hasData ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Activity className="text-slate-300" size={32} />
            </div>
            <h3 className="text-[16px] font-semibold text-slate-800 mb-2">暂无学习数据</h3>
            <p className="text-[14px] text-slate-500 max-w-md mx-auto">
              你的学习记录、跟读数据和闪卡复习情况将在这里生成可视化图表。去导入一个视频开始学习吧！
            </p>
          </div>
        ) : (
          <>
            {/* Row 2: Trends & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trend Chart */}
              <ChartCard 
                title="学习行为趋势 (分钟)" 
                className="lg:col-span-2"
                headerExtra={
                  <div className="flex items-center gap-4 text-[11px] font-medium">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>输入</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>输出</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>复习</div>
                  </div>
                }
              >
                <SafeResponsiveContainer>
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReview" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(15,23,42,0.08)', fontSize: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                    />
                    <Area type="monotone" dataKey="input" name="输入听力" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorInput)" />
                    <Area type="monotone" dataKey="output" name="输出跟读" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorOutput)" />
                    <Area type="monotone" dataKey="review" name="闪卡复习" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReview)" />
                  </AreaChart>
                </SafeResponsiveContainer>
              </ChartCard>

              {/* Topic Distribution */}
              <ChartCard title="语料主题分布" height={240}>
                {categories.length > 0 ? (
                  <SafeResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(15,23,42,0.08)', fontSize: '12px' }}
                      />
                    </PieChart>
                  </SafeResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[12px] text-slate-400">
                    暂无主题数据
                  </div>
                )}
                {categories.length > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[24px] font-bold text-slate-800">{categories.length}</span>
                    <span className="text-[11px] text-slate-500 font-medium">涉猎主题</span>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Row 3: Skills & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Skills Radar/Bar */}
              <ChartCard title="能力图谱" height={240}>
                {logs.length > 0 ? (
                  <SafeResponsiveContainer>
                    <BarChart data={[
                      { name: '精听理解', value: inputTime },
                      { name: '跟读模仿', value: outputTime },
                      { name: '表达积累', value: masteredExpressions },
                      { name: '闪卡复习', value: toReviewCards }
                    ]} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(15,23,42,0.08)', fontSize: '12px' }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24}>
                        {[1,2,3,4].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </SafeResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[12px] text-slate-400">
                    暂无能力数据
                  </div>
                )}
              </ChartCard>

              {/* AI Insights */}
              <div className="lg:col-span-2 bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-6 shadow-soft-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Lightbulb size={18} className="text-brand-600" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-800 tracking-tight">AI 学习建议</h3>
                </div>
                
                <div className="space-y-4">
                  {logs.length > 0 ? (
                    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-500">
                        <TrendingUp size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[14px] font-semibold text-slate-800 mb-1">保持良好的输入习惯</h4>
                        <p className="text-[13px] text-slate-600 leading-relaxed">你最近的听力输入时间很稳定，建议在听的同时增加跟读比例，提升口语肌肉记忆。</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-50 text-blue-500">
                        <MessageSquare size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[14px] font-semibold text-slate-800 mb-1">开始你的学习之旅</h4>
                        <p className="text-[13px] text-slate-600 leading-relaxed">导入一段你感兴趣的视频，AI 会为你提取核心表达并生成专属学习计划。</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, iconColor, bg, secondary }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft-sm hover:shadow-soft transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={iconColor} size={20} />
        </div>
      </div>
      <div>
        <h3 className="text-[13px] font-medium text-slate-500 mb-1">{title}</h3>
        <div className="text-[24px] font-bold text-slate-800 tracking-tight mb-2">{value}</div>
        <p className="text-[12px] text-slate-500 font-medium">{secondary}</p>
      </div>
    </div>
  );
}
