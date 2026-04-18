export { default } from "../screens/settings-screen-v5";
/*

import { useState } from "react";
import { useLearningStore } from "../learning-store";

export default function SettingsPage() {
  const {
    apiConfig,
    setApiConfig,
    exportWorkspaceJson,
    importWorkspaceJson,
    resetToSample
  } = useLearningStore();
  const [workspaceJson, setWorkspaceJson] = useState(exportWorkspaceJson);

  return (
    <div className="page-grid settings-grid">
      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>API 设置</h2>
            <p>这里保存你自己的模型配置。前端直连仅适合自用。</p>
          </div>
        </div>

        <div className="form-stack">
          <label className="form-field">
            <span>Provider</span>
            <select value={apiConfig.provider} onChange={(event) => setApiConfig((prev) => ({ ...prev, provider: event.target.value }))}>
              <option value="deepseek">DeepSeek / 豆包 / 千问兼容</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
          <label className="form-field">
            <span>Endpoint</span>
            <input value={apiConfig.endpoint} onChange={(event) => setApiConfig((prev) => ({ ...prev, endpoint: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>API Key</span>
            <input value={apiConfig.apiKey} onChange={(event) => setApiConfig((prev) => ({ ...prev, apiKey: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>Model</span>
            <input value={apiConfig.model} onChange={(event) => setApiConfig((prev) => ({ ...prev, model: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>Prompt</span>
            <textarea rows={4} value={apiConfig.prompt} onChange={(event) => setApiConfig((prev) => ({ ...prev, prompt: event.target.value }))} />
          </label>
        </div>
      </section>

      <section className="ios-card section-card">
        <div className="section-top">
          <div>
            <h2>工作区数据</h2>
            <p>导出、复制或重新导入当前学习数据。</p>
          </div>
        </div>

        <textarea rows={18} value={workspaceJson} onChange={(event) => setWorkspaceJson(event.target.value)} />

        <div className="button-row">
          <button className="ios-button secondary" onClick={() => setWorkspaceJson(exportWorkspaceJson)}>刷新导出</button>
          <button className="ios-button ghost" onClick={() => importWorkspaceJson(workspaceJson)}>导入 JSON</button>
          <button className="ios-button danger" onClick={resetToSample}>恢复示例</button>
        </div>
      </section>
    </div>
  );
}
*/
