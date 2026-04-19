import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Shield, Zap, Globe, Save, Key, Server, Cpu, Layers, Layout, ChevronRight, Check, X } from 'lucide-react';
import { GlobalAIConfig, AIProvider, AIScenario } from '../types';
import { getGlobalAIConfig, saveGlobalAIConfig } from '../lib/aiProvider';

export const Settings: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [config, setConfig] = useState<GlobalAIConfig>(getGlobalAIConfig());
  const [activeTab, setActiveTab] = useState<'profiles' | 'routing'>('profiles');
  const [selectedProfileId, setSelectedProfileId] = useState<AIProvider>('gemini');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    saveGlobalAIConfig(config);
    setIsSaved(true);
    window.dispatchEvent(new Event('ai-config-updated'));
    setTimeout(() => setIsSaved(false), 2000);
    if (onClose) setTimeout(onClose, 800);
  };

  const updateProfile = (id: AIProvider, updates: Partial<any>) => {
    setConfig(prev => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [id]: { ...prev.profiles[id], ...updates }
      }
    }));
  };

  const updateRoute = (scenario: AIScenario, providerId: AIProvider) => {
    setConfig(prev => ({
      ...prev,
      scenarioMapping: {
        ...prev.scenarioMapping,
        [scenario]: providerId
      }
    }));
  };

  const selectedProfile = config.profiles[selectedProfileId];

  return (
    <div className="flex h-[80vh] bg-white overflow-hidden">
      {/* Internal Sidebar */}
      <div className="w-64 bg-slate-50 border-r border-slate-100 flex flex-col p-4">
        <div className="mb-8 px-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">配置菜单</h3>
            <nav className="space-y-1">
                <button 
                  onClick={() => setActiveTab('profiles')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'profiles' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    <Cpu size={18} /> 模型档案
                </button>
                <button 
                  onClick={() => setActiveTab('routing')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'routing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    <Layout size={18} /> 场景路由
                </button>
            </nav>
        </div>

        {activeTab === 'profiles' && (
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">服务商列表</h3>
                <div className="space-y-1">
                    {(Object.keys(config.profiles) as AIProvider[]).map(id => (
                        <button
                            key={id}
                            onClick={() => setSelectedProfileId(id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${selectedProfileId === id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                        >
                            <span className="truncate">{config.profiles[id].name}</span>
                            {config.profiles[id].apiKey && <Check size={14} className="text-emerald-500 shrink-0" />}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
                {activeTab === 'profiles' ? '模型档案管理' : '场景化 AI 路由'}
            </h2>
            <p className="text-sm text-slate-500">
                {activeTab === 'profiles' ? `正在配置: ${selectedProfile.name}` : '根据任务类型分配最适合的模型'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors mr-2"
              title="关闭"
            >
              <X size={20} />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl font-semibold transition-all shadow-md ${
                isSaved ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              {isSaved ? <Check size={18} /> : <Save size={18} />}
              <span>{isSaved ? '已保存' : '保存配置'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
            {activeTab === 'profiles' ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                           <Key size={16} className="text-indigo-500" /> API Key / 鉴权密钥
                        </label>
                        <input
                            type="password"
                            value={selectedProfile.apiKey}
                            onChange={(e) => updateProfile(selectedProfileId, { apiKey: e.target.value })}
                            placeholder={selectedProfileId === 'gemini' ? "留空则使用内置环境 Key" : `请输入 ${selectedProfile.name} 的 Key`}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none font-mono text-sm"
                        />
                        {selectedProfileId === 'gemini' && !selectedProfile.apiKey && (
                            <p className="mt-2 text-xs text-amber-600 font-medium">✨ 当前处于“内置模式”，自动接入 AI Studio 环境提供的 Gemini 免费接口。</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <Cpu size={16} className="text-indigo-500" /> 模型名称 (Model ID)
                            </label>
                            <input
                                type="text"
                                value={selectedProfile.model}
                                onChange={(e) => updateProfile(selectedProfileId, { model: e.target.value })}
                                placeholder="例如: deepseek-chat"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none text-sm"
                            />
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <Server size={16} className="text-indigo-500" /> 代理地址 (Base URL)
                            </label>
                            <input
                                type="text"
                                value={selectedProfile.baseUrl || ''}
                                onChange={(e) => updateProfile(selectedProfileId, { baseUrl: e.target.value })}
                                placeholder="https://api.openai.com/v1"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex gap-4 items-start">
                        <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-indigo-900 text-sm mb-1">独立保存模式</h4>
                            <p className="text-xs text-indigo-700 leading-relaxed">
                                您当前正在编辑 <b>{selectedProfile.name}</b> 的私有档案。该服务商的 API Key 与配置将独立保存，切换到其它服务商时不会丢失。
                            </p>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {[
                        { id: 'explanation', label: '句子讲解与分析', desc: '用于 Studio 模式下对台词的语法、习语详细拆解。', icon: Sparkles },
                        { id: 'translation', label: '高质量翻译', desc: '用于处理复杂长句的意译与双语对照。', icon: Globe },
                        { id: 'pronunciation', label: '发音纠偏纠察', desc: '分析语音识别结果并给出改进建议。', icon: Zap },
                        { id: 'general', label: '通用学习助理', desc: '用于自由对话和百科问答。', icon: Cpu },
                    ].map((scenario) => (
                        <div key={scenario.id} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                <scenario.icon size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900">{scenario.label}</h3>
                                <p className="text-xs text-slate-500 mt-1">{scenario.desc}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">指派模型:</span>
                                <select 
                                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 outline-none min-w-[160px]"
                                    value={config.scenarioMapping[scenario.id as AIScenario]}
                                    onChange={(e) => updateRoute(scenario.id as AIScenario, e.target.value as AIProvider)}
                                >
                                    {(Object.keys(config.profiles) as AIProvider[]).map(pid => (
                                        <option key={pid} value={pid}>{config.profiles[pid].name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}
        </div>
      </div>
    </div>
  );
};

const Sparkles: React.FC<any> = ({ size }) => <Zap size={size} />; 
