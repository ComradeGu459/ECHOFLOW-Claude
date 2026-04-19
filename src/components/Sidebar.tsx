import { useState } from 'react';
import { 
  Library, 
  Mic2, 
  Layers, 
  BarChart2, 
  Settings, 
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenSettings: () => void;
  onOpenImport: () => void;
}

export function Sidebar({ currentView, onNavigate, onOpenSettings, onOpenImport }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navGroups = [
    {
      title: '学习',
      items: [
        { id: 'studio', icon: Mic2, label: '口语训练舱', en: 'Speaking Lab', desc: '沉浸式练习' },
        { id: 'flashcards', icon: Layers, label: '记忆闪卡', en: 'Flashcards', desc: '间隔重复记忆' },
      ]
    },
    {
      title: '管理',
      items: [
        { id: 'library', icon: Library, label: '语料素材库', en: 'Library', desc: '你的视频收藏' },
        { id: 'analytics', icon: BarChart2, label: '学习数据', en: 'Analytics', desc: '进度追踪' },
      ]
    }
  ];

  return (
    <motion.div 
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="h-screen bg-slate-50 flex flex-col z-20 relative shrink-0 shadow-[4px_0_24px_rgba(15,23,42,0.02)]"
    >
      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 w-6 h-6 bg-white rounded-full flex items-center justify-center text-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors z-30 shadow-soft-sm"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo & Slogan */}
      <div className="pt-8 pb-6 px-6">
        <div className="flex items-center gap-3 mb-2 min-h-[32px]">
          <div className="w-8 h-8 rounded-xl bg-gradient-soft flex items-center justify-center shadow-soft-sm shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div 
                key="logo-text"
                initial={{ opacity: 0, x: -5 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -5 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="font-semibold text-[18px] tracking-tight text-slate-800">EchoFlow</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="text-[11px] font-medium text-brand-400 tracking-wide uppercase mt-1 px-0 whitespace-nowrap overflow-hidden"
            >
              用真实视频练习口语
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Refined Import Button */}
      <div className="mb-8 px-4">
        <button 
          onClick={() => {
            onNavigate('library');
            onOpenImport();
          }}
          className="w-full h-11 flex items-center bg-gradient-soft text-white hover:opacity-90 text-[13px] font-medium rounded-2xl transition-all shadow-soft-sm overflow-hidden"
        >
          <div className="w-12 flex items-center justify-center shrink-0">
            <Plus size={16} />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                key="import-text"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                className="whitespace-nowrap"
              >
                导入视频
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-3 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 mb-2 text-[10px] font-bold text-brand-300 tracking-wider uppercase overflow-hidden whitespace-nowrap"
                >
                  {group.title}
                </motion.div>
              )}
            </AnimatePresence>
            {group.items.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center rounded-2xl transition-all relative group h-[52px] overflow-hidden ${
                    isActive 
                      ? 'bg-white shadow-soft-sm' 
                      : 'hover:bg-brand-50/50'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {/* Active Left Highlight */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeNav" 
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-8 bg-gradient-soft rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.4)] z-10" 
                    />
                  )}
                  
                  <div className={`w-12 flex items-center justify-center shrink-0 ${isActive ? 'text-brand-500' : 'text-slate-400 group-hover:text-brand-400 transition-colors'}`}>
                    <item.icon size={18} />
                  </div>
                  
                  <div className="flex-1 flex flex-col items-start text-left overflow-hidden">
                    <AnimatePresence mode="wait">
                      {!isCollapsed && (
                        <motion.div
                          key={`${item.id}-content`}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap"
                        >
                          <div className="flex items-baseline gap-2">
                            <span className={`text-[14px] font-medium ${isActive ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-800'}`}>
                              {item.label}
                            </span>
                            <span className={`text-[10px] ${isActive ? 'text-brand-400' : 'text-slate-400'}`}>
                              {item.en}
                            </span>
                          </div>
                          <span className={`text-[11px] truncate block ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom User Profile */}
      <div className="p-4 mt-auto">
        <button 
          onClick={onOpenSettings}
          className="w-full h-[52px] flex items-center rounded-2xl hover:bg-brand-50/50 transition-colors overflow-hidden"
        >
          <div className="w-12 flex items-center justify-center shrink-0 ml-0">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-soft-sm">
              <Settings size={14} className="text-brand-500" />
            </div>
          </div>
          <div className="flex-1 overflow-hidden text-left px-1">
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  key="settings-text"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap"
                >
                  <span className="text-[13px] font-medium text-slate-800 block">设置与模型</span>
                  <span className="text-[11px] text-brand-400 font-medium block">API 配置</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
