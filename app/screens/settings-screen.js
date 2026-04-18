"use client";

import { useMemo, useState } from "react";
import { usePlatformStore } from "../platform-store";

function emptyService() {
  return {
    id: "",
    providerName: "",
    providerType: "openai-compatible",
    baseUrl: "",
    model: "",
    apiKey: "",
    enabled: true,
    isDefault: false,
    status: "待测试",
    capabilities: ["字幕分析", "单词释义", "难度判断"]
  };
}

export default function SettingsScreen() {
  const {
    state,
    updateLanguage,
    saveApiService,
    deleteApiService,
    setDefaultApiService,
    toggleApiService,
    testApiService,
    updatePreferences,
    exportSnapshot,
    importSnapshot,
    resetWorkspace,
    apiBusyId
  } = usePlatformStore();
  const [draftService, setDraftService] = useState(emptyService());
  const [snapshot, setSnapshot] = useState(exportSnapshot);
  const defaultService = useMemo(() => state.settings.apiServices.find((item) => item.isDefault), [state.settings.apiServices]);

  return (
    <div className="page-grid settings-grid-v2">
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>界面与学习偏好</h2>
            <p>默认中文界面，保留英文切换能力。</p>
          </div>
        </div>
        <div className="form-stack">
          <label className="form-field">
            <span>界面语言</span>
            <select value={state.ui.language} onChange={(e) => updateLanguage(e.target.value)}>
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <div className="split-fields">
            <label className="form-field"><span>默认字幕显示</span><select value={state.settings.preferences.subtitleDisplay} onChange={(e) => updatePreferences("preferences", "subtitleDisplay", e.target.value)}><option>中英双语</option><option>仅英文</option><option>英文 + 按需翻译</option></select></label>
            <label className="form-field"><span>自动显示翻译</span><select value={String(state.settings.preferences.autoShowTranslation)} onChange={(e) => updatePreferences("preferences", "autoShowTranslation", e.target.value === "true")}><option value="true">开启</option><option value="false">关闭</option></select></label>
          </div>
          <div className="split-fields">
            <label className="form-field"><span>闪卡默认分类规则</span><input value={state.settings.preferences.flashcardRule} onChange={(e) => updatePreferences("preferences", "flashcardRule", e.target.value)} /></label>
            <label className="form-field"><span>跟读 / 听写评分偏好</span><input value={state.settings.preferences.scoringPreference} onChange={(e) => updatePreferences("preferences", "scoringPreference", e.target.value)} /></label>
          </div>
          <label className="form-field"><span>AI 分析默认标签等级</span><input value={state.settings.preferences.aiTagLevel} onChange={(e) => updatePreferences("preferences", "aiTagLevel", e.target.value)} /></label>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>接口配置中心</h2>
            <p>支持新增、启用、停用、设为默认和状态测试。</p>
          </div>
          <span>{defaultService?.providerName || "未设置默认接口"}</span>
        </div>

        <div className="api-service-list">
          {state.settings.apiServices.map((service) => (
            <div className="service-card" key={service.id}>
              <div className="service-top">
                <div>
                  <strong>{service.providerName}</strong>
                  <p>{service.providerType} · {service.model || "未设模型"}</p>
                </div>
                <div className="stat-pills">
                  <span>{service.status}</span>
                  {service.isDefault ? <span>默认</span> : null}
                </div>
              </div>
              <div className="button-row">
                <button className="ios-button secondary" onClick={() => setDraftService(service)}>编辑</button>
                <button className="ios-button ghost" onClick={() => setDefaultApiService(service.id)}>设为默认</button>
                <button className="ios-button ghost" onClick={() => toggleApiService(service.id)}>{service.enabled ? "停用" : "启用"}</button>
                <button className="ios-button ghost" onClick={() => testApiService(service.id)}>{apiBusyId === service.id ? "测试中..." : "测试连接"}</button>
                {service.providerType !== "local" ? <button className="ios-button danger" onClick={() => deleteApiService(service.id)}>删除</button> : null}
              </div>
            </div>
          ))}
        </div>

        <div className="form-stack top-divider">
          <div className="section-top compact">
            <div>
              <h2>新增 / 编辑接口</h2>
              <p>保存后全站可调用。</p>
            </div>
          </div>
          <div className="split-fields">
            <label className="form-field"><span>Provider 名称</span><input value={draftService.providerName} onChange={(e) => setDraftService((prev) => ({ ...prev, providerName: e.target.value }))} /></label>
            <label className="form-field"><span>Provider 类型</span><select value={draftService.providerType} onChange={(e) => setDraftService((prev) => ({ ...prev, providerType: e.target.value }))}><option value="openai-compatible">OpenAI Compatible</option><option value="gemini">Gemini</option><option value="local">本地分析</option></select></label>
          </div>
          <div className="split-fields">
            <label className="form-field"><span>Base URL</span><input value={draftService.baseUrl} onChange={(e) => setDraftService((prev) => ({ ...prev, baseUrl: e.target.value }))} /></label>
            <label className="form-field"><span>Model</span><input value={draftService.model} onChange={(e) => setDraftService((prev) => ({ ...prev, model: e.target.value }))} /></label>
          </div>
          <label className="form-field"><span>API Key</span><input value={draftService.apiKey} onChange={(e) => setDraftService((prev) => ({ ...prev, apiKey: e.target.value }))} /></label>
          <div className="button-row">
            <button className="ios-button primary" onClick={() => { saveApiService(draftService); setDraftService(emptyService()); }}>保存接口</button>
            <button className="ios-button ghost" onClick={() => setDraftService(emptyService())}>清空</button>
          </div>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>数据与存储</h2>
            <p>工作区可导入导出，并支持恢复默认示例。</p>
          </div>
        </div>
        <div className="form-stack">
          <div className="split-fields">
            <label className="form-field"><span>本地保存策略</span><input value={state.settings.storage.saveStrategy} onChange={(e) => updatePreferences("storage", "saveStrategy", e.target.value)} /></label>
            <label className="form-field"><span>素材归档策略</span><input value={state.settings.storage.archivePolicy} onChange={(e) => updatePreferences("storage", "archivePolicy", e.target.value)} /></label>
          </div>
          <div className="split-fields">
            <label className="form-field"><span>自动生成学习记录</span><select value={String(state.settings.storage.autoCreateLogs)} onChange={(e) => updatePreferences("storage", "autoCreateLogs", e.target.value === "true")}><option value="true">开启</option><option value="false">关闭</option></select></label>
            <label className="form-field"><span>自动生成闪卡</span><select value={String(state.settings.storage.autoGenerateCards)} onChange={(e) => updatePreferences("storage", "autoGenerateCards", e.target.value === "true")}><option value="true">开启</option><option value="false">关闭</option></select></label>
          </div>
          <label className="form-field"><span>工作区导出 JSON</span><textarea rows={14} value={snapshot} onChange={(e) => setSnapshot(e.target.value)} /></label>
          <div className="button-row">
            <button className="ios-button secondary" onClick={() => setSnapshot(exportSnapshot)}>刷新导出</button>
            <button className="ios-button ghost" onClick={() => importSnapshot(snapshot)}>导入 JSON</button>
            <button className="ios-button danger" onClick={resetWorkspace}>恢复默认工作区</button>
          </div>
        </div>
      </section>
    </div>
  );
}
