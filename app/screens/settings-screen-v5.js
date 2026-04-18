"use client";

import { useMemo, useState } from "react";

import {
  AI_CAPABILITIES,
  getServiceHealth,
  getServiceProtocol,
} from "../lib/ai-registry";
import { usePlatformStore } from "../platform-store";

const PROVIDER_OPTIONS = [
  { id: "local", label: "本地分析", protocol: "local" },
  { id: "openai", label: "GPT / OpenAI", protocol: "openai-compatible" },
  { id: "deepseek", label: "DeepSeek", protocol: "openai-compatible" },
  { id: "doubao", label: "豆包", protocol: "openai-compatible" },
  { id: "qwen", label: "千问", protocol: "openai-compatible" },
  { id: "gemini", label: "Gemini", protocol: "gemini" },
  { id: "custom", label: "自定义兼容接口", protocol: "openai-compatible" },
];

function emptyService() {
  return {
    id: "",
    providerName: "",
    vendor: "custom",
    protocol: "openai-compatible",
    baseUrl: "",
    endpointOverrides: {
      speech_in: "",
      speech_out: "",
      vision: "",
    },
    model: "",
    apiKey: "",
    enabled: true,
    isDefault: false,
    capabilities: ["study_analysis"],
  };
}

function capabilityLabel(capabilityId) {
  return AI_CAPABILITIES.find((item) => item.id === capabilityId)?.label || capabilityId;
}

export default function SettingsScreenV5() {
  const {
    state,
    resolvedAiRoutes,
    exportSnapshot,
    updateLanguage,
    updateAiRouting,
    saveApiService,
    deleteApiService,
    toggleApiService,
    updatePreferences,
    updateUi,
    importSnapshot,
    resetWorkspace,
  } = usePlatformStore();
  const [draftService, setDraftService] = useState(emptyService());
  const [snapshot, setSnapshot] = useState(exportSnapshot);

  const services = state.settings.apiServices;
  const routeOptions = useMemo(
    () =>
      AI_CAPABILITIES.map((capability) => ({
        ...capability,
        services: services.filter((service) => service.capabilities?.includes(capability.id)),
      })),
    [services],
  );

  function selectVendor(vendorId) {
    const preset = PROVIDER_OPTIONS.find((item) => item.id === vendorId) || PROVIDER_OPTIONS.at(-1);
    setDraftService((current) => ({
      ...current,
      vendor: preset.id,
      protocol: preset.protocol,
      providerName: current.providerName || preset.label,
    }));
  }

  function toggleCapability(capabilityId) {
    setDraftService((current) => ({
      ...current,
      capabilities: current.capabilities.includes(capabilityId)
        ? current.capabilities.filter((item) => item !== capabilityId)
        : [...current.capabilities, capabilityId],
    }));
  }

  return (
    <div className="page-grid settings-grid-v4plus">
      <section className="ios-card section-card settings-ui-card">
        <div className="section-top">
          <div>
            <h2>界面与播放器偏好</h2>
            <p>这里只保存本地 UI 偏好，不伪造学习结果或 AI 状态。</p>
          </div>
        </div>

        <div className="form-stack">
          <div className="split-fields">
            <label className="form-field">
              <span>界面语言</span>
              <select value={state.ui.language} onChange={(event) => updateLanguage(event.target.value)}>
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="form-field">
              <span>默认字幕显示</span>
              <select
                value={state.settings.preferences.subtitleDisplay}
                onChange={(event) => updatePreferences("preferences", "subtitleDisplay", event.target.value)}
              >
                <option value="中英双语">中英双语</option>
                <option value="仅英文">仅英文</option>
                <option value="英文 + 按需翻译">英文 + 按需翻译</option>
              </select>
            </label>
          </div>

          <div className="split-fields">
            <label className="form-field">
              <span>默认倍速</span>
              <select
                value={String(state.ui.player.playbackRate)}
                onChange={(event) => updateUi({ player: { playbackRate: Number(event.target.value) } })}
              >
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </label>
            <label className="form-field">
              <span>默认字幕字号</span>
              <select
                value={String(state.ui.player.subtitleFontSize)}
                onChange={(event) => updateUi({ player: { subtitleFontSize: Number(event.target.value) } })}
              >
                <option value="16">小</option>
                <option value="18">中</option>
                <option value="21">大</option>
              </select>
            </label>
          </div>

          <div className="split-fields">
            <label className="form-field">
              <span>自动显示中文</span>
              <select
                value={String(state.ui.player.showTranslation)}
                onChange={(event) => updateUi({ player: { showTranslation: event.target.value === "true" } })}
              >
                <option value="true">开启</option>
                <option value="false">关闭</option>
              </select>
            </label>
            <label className="form-field">
              <span>收藏句生成卡片规则</span>
              <input
                value={state.settings.preferences.flashcardRule}
                onChange={(event) => updatePreferences("preferences", "flashcardRule", event.target.value)}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="ios-card section-card settings-routing-card">
        <div className="section-top">
          <div>
            <h2>AI 能力路由</h2>
            <p>按能力分别分配 provider，多厂商模型走真实能力路由。</p>
          </div>
        </div>

        <div className="settings-routing-grid">
          {routeOptions.map((capability) => (
            <div className="service-card" key={capability.id}>
              <div>
                <strong>{capability.label}</strong>
                <p>{capability.description}</p>
              </div>
              <label className="form-field compact">
                <span>当前路由</span>
                <select
                  value={state.settings.aiRouting?.[capability.id] || ""}
                  onChange={(event) => updateAiRouting(capability.id, event.target.value)}
                >
                  <option value="">未分配</option>
                  {capability.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.providerName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="tag-collection compact">
                <span className="pill-tag" data-tone={resolvedAiRoutes[capability.id] ? "success" : "idle"}>
                  {resolvedAiRoutes[capability.id] ? resolvedAiRoutes[capability.id].providerName : "未配置"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ios-card section-card settings-services-card">
        <div className="section-top">
          <div>
            <h2>Provider 配置中心</h2>
            <p>只显示真实配置完成度，不显示伪在线或伪测速状态。</p>
          </div>
        </div>

        <div className="api-service-list">
          {services.map((service) => (
            <div className="service-card" key={service.id}>
              <div className="service-top">
                <div>
                  <strong>{service.providerName}</strong>
                  <p>{service.vendor || service.providerType} · {getServiceProtocol(service)}</p>
                </div>
                <span
                  className="status-badge"
                  data-tone={
                    getServiceHealth(service) === "ready"
                      ? "success"
                      : getServiceHealth(service) === "disabled"
                        ? "idle"
                        : "warning"
                  }
                >
                  {getServiceHealth(service) === "ready"
                    ? "配置完成"
                    : getServiceHealth(service) === "disabled"
                      ? "已停用"
                      : "配置未完成"}
                </span>
              </div>

              <div className="tag-collection compact">
                {service.capabilities?.map((item) => (
                  <span className="pill-tag" data-tone="info" key={`${service.id}-${item}`}>
                    {capabilityLabel(item)}
                  </span>
                ))}
              </div>

              <div className="button-row">
                <button className="ios-button secondary" type="button" onClick={() => setDraftService(service)}>
                  编辑
                </button>
                <button className="ios-button ghost" type="button" onClick={() => toggleApiService(service.id)}>
                  {service.enabled ? "停用" : "启用"}
                </button>
                {service.id !== "service_local" ? (
                  <button className="ios-button danger" type="button" onClick={() => deleteApiService(service.id)}>
                    删除
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="form-stack top-divider">
          <div className="section-top compact">
            <div>
              <h2>新增 / 编辑 Provider</h2>
              <p>只保存真实要用的接口信息。</p>
            </div>
          </div>

          <div className="split-fields">
            <label className="form-field">
              <span>厂商预设</span>
              <select value={draftService.vendor} onChange={(event) => selectVendor(event.target.value)}>
                {PROVIDER_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Provider 名称</span>
              <input value={draftService.providerName} onChange={(event) => setDraftService((current) => ({ ...current, providerName: event.target.value }))} />
            </label>
          </div>

          <div className="split-fields">
            <label className="form-field">
              <span>协议类型</span>
              <select value={draftService.protocol} onChange={(event) => setDraftService((current) => ({ ...current, protocol: event.target.value }))}>
                <option value="openai-compatible">OpenAI Compatible</option>
                <option value="gemini">Gemini</option>
                <option value="local">Local</option>
              </select>
            </label>
            <label className="form-field">
              <span>模型名</span>
              <input value={draftService.model} onChange={(event) => setDraftService((current) => ({ ...current, model: event.target.value }))} />
            </label>
          </div>

          <label className="form-field">
            <span>Base URL</span>
            <input value={draftService.baseUrl} onChange={(event) => setDraftService((current) => ({ ...current, baseUrl: event.target.value }))} />
          </label>

          <div className="split-fields">
            <label className="form-field">
              <span>语音输入 URL</span>
              <input
                value={draftService.endpointOverrides?.speech_in || ""}
                onChange={(event) =>
                  setDraftService((current) => ({
                    ...current,
                    endpointOverrides: { ...current.endpointOverrides, speech_in: event.target.value },
                  }))
                }
              />
            </label>
            <label className="form-field">
              <span>语音输出 URL</span>
              <input
                value={draftService.endpointOverrides?.speech_out || ""}
                onChange={(event) =>
                  setDraftService((current) => ({
                    ...current,
                    endpointOverrides: { ...current.endpointOverrides, speech_out: event.target.value },
                  }))
                }
              />
            </label>
          </div>

          <label className="form-field">
            <span>图像识别 URL</span>
            <input
              value={draftService.endpointOverrides?.vision || ""}
              onChange={(event) =>
                setDraftService((current) => ({
                  ...current,
                  endpointOverrides: { ...current.endpointOverrides, vision: event.target.value },
                }))
              }
            />
          </label>

          <label className="form-field">
            <span>API Key</span>
            <input value={draftService.apiKey} onChange={(event) => setDraftService((current) => ({ ...current, apiKey: event.target.value }))} />
          </label>

          <div className="settings-capability-picker">
            {AI_CAPABILITIES.map((capability) => (
              <button
                key={capability.id}
                className={`pill-tag action${draftService.capabilities.includes(capability.id) ? " selected" : ""}`}
                data-tone={draftService.capabilities.includes(capability.id) ? "learning" : "idle"}
                type="button"
                onClick={() => toggleCapability(capability.id)}
              >
                {capability.label}
              </button>
            ))}
          </div>

          <div className="button-row">
            <button
              className="ios-button primary"
              type="button"
              onClick={() => {
                saveApiService(draftService);
                setDraftService(emptyService());
              }}
            >
              保存 Provider
            </button>
            <button className="ios-button ghost" type="button" onClick={() => setDraftService(emptyService())}>
              清空
            </button>
          </div>
        </div>
      </section>

      <section className="ios-card section-card settings-storage-card">
        <div className="section-top">
          <div>
            <h2>数据与存储</h2>
            <p>业务数据仍保存在本地，但默认收起，不直接裸露工作区快照。</p>
          </div>
        </div>

        <details className="settings-storage-details">
          <summary>展开高级数据维护</summary>
          <div className="form-stack top-divider">
            <label className="form-field">
              <span>工作区快照</span>
              <textarea rows={14} value={snapshot} onChange={(event) => setSnapshot(event.target.value)} />
            </label>

            <div className="button-row">
              <button className="ios-button secondary" type="button" onClick={() => setSnapshot(exportSnapshot)}>
                刷新导出
              </button>
              <button className="ios-button ghost" type="button" onClick={() => importSnapshot(snapshot)}>
                导入 JSON
              </button>
              <button className="ios-button danger" type="button" onClick={resetWorkspace}>
                清空并重置
              </button>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
