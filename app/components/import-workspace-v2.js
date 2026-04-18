"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  buildSourceDescriptor,
  buildSubtitlePayload,
  findDuplicateMaterial,
} from "../lib/import-workflow";
import { usePlatformStore } from "../platform-store";

const SOURCE_MODES = [
  { id: "link", label: "链接导入" },
  { id: "file", label: "本地文件" },
];

const SUBTITLE_MODES = [
  { id: "file", label: "本地文件" },
  { id: "text", label: "粘贴文本" },
];

function formatBytes(value) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function buildStatus(tone, title, message) {
  return { tone, title, message };
}

export default function ImportWorkspaceV2({ variant = "page", onClose = null }) {
  const router = useRouter();
  const {
    state,
    resolvedAiRoutes,
    importMaterialFromPayload,
    runTranscriptProcessing,
    runVisionRecognition,
  } = usePlatformStore();
  const [sourceMode, setSourceMode] = useState("link");
  const [subtitleMode, setSubtitleMode] = useState("file");
  const [draft, setDraft] = useState({
    ...state.importDraft,
    difficulty: state.importDraft.difficulty || "四级",
    learningGoal: state.importDraft.learningGoal || "跟读",
  });
  const [videoFile, setVideoFile] = useState(null);
  const [subtitleText, setSubtitleText] = useState("");
  const [subtitleFileName, setSubtitleFileName] = useState("");
  const [subtitleSummary, setSubtitleSummary] = useState(null);
  const [visionImageFile, setVisionImageFile] = useState(null);
  const [status, setStatus] = useState(
    buildStatus("idle", "等待导入", "先确认视频来源和字幕内容，系统只会保存真实可用的导入结果。"),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCleaningSubtitle, setIsCleaningSubtitle] = useState(false);
  const [isRunningVision, setIsRunningVision] = useState(false);

  const duplicateMaterial = useMemo(() => {
    try {
      const source = buildSourceDescriptor({
        youtubeUrl: sourceMode === "link" ? draft.youtubeUrl : "",
        videoFile: sourceMode === "file" ? videoFile : null,
      });
      return findDuplicateMaterial(state.materials, source.sourceKey);
    } catch {
      return null;
    }
  }, [draft.youtubeUrl, sourceMode, state.materials, videoFile]);

  const transcriptService = resolvedAiRoutes.transcript_processing;
  const visionService = resolvedAiRoutes.vision;
  const transcriptInput = subtitleMode === "file" ? subtitleText : draft.rawSubtitles;

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("读取图片失败。"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
  }

  async function fileToBase64(file) {
    const dataUrl = await fileToDataUrl(file);
    return dataUrl.split(",")[1] || "";
  }

  async function parseAndSetSubtitleText(text, fileName = "") {
    const parsed = buildSubtitlePayload({
      subtitleText: text,
      subtitleFileName: fileName,
    });

    if (subtitleMode === "file") {
      setSubtitleText(text);
      setSubtitleFileName(fileName);
    } else {
      setDraft((current) => ({ ...current, rawSubtitles: text }));
    }
    setSubtitleSummary(parsed);
    return parsed;
  }

  async function handleSubtitleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(buildStatus("info", "正在解析字幕", `正在读取 ${file.name}`));
    try {
      const text = await file.text();
      const parsed = await parseAndSetSubtitleText(text, file.name);
      setStatus(buildStatus("success", "字幕解析完成", `已解析 ${parsed.cues.length} 句，可直接导入。`));
    } catch (error) {
      setSubtitleText("");
      setSubtitleFileName(file.name);
      setSubtitleSummary(null);
      setStatus(buildStatus("warning", "字幕解析失败", error instanceof Error ? error.message : "字幕文件无法解析。"));
    }
  }

  function handleVideoFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setVideoFile(file);
    setDraft((current) => ({
      ...current,
      title: current.title || file.name.replace(/\.[^.]+$/, ""),
    }));
    setStatus(buildStatus("info", "本地视频已选择", `${file.name} · ${formatBytes(file.size)}，接下来请确认字幕内容。`));
  }

  async function handleTranscriptCleanup() {
    if (!transcriptInput.trim()) {
      setStatus(buildStatus("warning", "没有可清洗的字幕", "请先上传字幕文件或粘贴字幕文本。"));
      return;
    }

    setIsCleaningSubtitle(true);
    setStatus(buildStatus("info", "正在清洗字幕", "按当前 transcript_processing 路由执行字幕清洗。"));
    const result = await runTranscriptProcessing(transcriptInput);
    if (!result.ok || !result.text.trim()) {
      setStatus(buildStatus("warning", "字幕清洗失败", result.message || "当前能力尚未配置或请求失败。"));
      setIsCleaningSubtitle(false);
      return;
    }

    try {
      const parsed = await parseAndSetSubtitleText(result.text, subtitleMode === "file" ? subtitleFileName : "");
      setStatus(buildStatus("success", "字幕清洗完成", `清洗后共 ${parsed.cues.length} 句，可继续导入。`));
    } catch (error) {
      setStatus(buildStatus("warning", "清洗结果不可用", error instanceof Error ? error.message : "返回内容无法解析为字幕。"));
    } finally {
      setIsCleaningSubtitle(false);
    }
  }

  async function handleVisionRecognition() {
    if (!visionImageFile) {
      setStatus(buildStatus("warning", "没有可识别的图片", "请先上传截图或图片文件。"));
      return;
    }

    setIsRunningVision(true);
    setStatus(buildStatus("info", "正在识别图片", "按当前 vision 路由提取图像中的文本。"));

    const imageDataUrl = await fileToDataUrl(visionImageFile);
    const base64 = await fileToBase64(visionImageFile);
    const result = await runVisionRecognition({
      prompt: "Extract the visible subtitle or transcript text from this image. Return plain text only.",
      imageDataUrl,
      base64,
      mimeType: visionImageFile.type || "image/png",
    });

    if (!result.ok || !result.text?.trim()) {
      setStatus(buildStatus("warning", "图片识别失败", result.message || "当前 vision provider 无法返回文本结果。"));
      setIsRunningVision(false);
      return;
    }

    setSubtitleMode("text");
    setDraft((current) => ({ ...current, rawSubtitles: result.text }));
    setSubtitleSummary(null);
    setStatus(buildStatus("success", "图片识别完成", "已把识别结果填入字幕文本区，可继续清洗或导入。"));
    setIsRunningVision(false);
  }

  async function handleImport() {
    setIsSubmitting(true);
    setStatus(buildStatus("info", "正在校验导入内容", "检查来源、字幕和重复状态。"));

    const result = importMaterialFromPayload({
      draft,
      youtubeUrl: sourceMode === "link" ? draft.youtubeUrl : "",
      videoFile: sourceMode === "file" ? videoFile : null,
      subtitleText: subtitleMode === "file" ? subtitleText : draft.rawSubtitles,
      subtitleFileName: subtitleMode === "file" ? subtitleFileName : "",
      mode: sourceMode === "link" ? "链接导入" : "本地文件导入",
    });

    if (!result.ok) {
      setStatus(
        buildStatus(
          result.code === "duplicate" ? "warning" : "warning",
          result.code === "duplicate" ? "检测到重复素材" : "导入失败",
          result.message,
        ),
      );
      setIsSubmitting(false);
      return;
    }

    setStatus(buildStatus("success", "导入成功", `《${result.material.title}》已进入素材库。`));
    setIsSubmitting(false);
    onClose?.();
    router.push("/library");
  }

  const canSubmit =
    !isSubmitting &&
    ((sourceMode === "link" && draft.youtubeUrl.trim()) || (sourceMode === "file" && videoFile)) &&
    transcriptInput.trim();

  return (
    <section className={`import-workspace-shell${variant === "dialog" ? " dialog-variant" : " page-variant"}`}>
      <div className="import-workspace-head">
        <div>
          <div className="import-workspace-icon">↑</div>
          <div className="import-workspace-copy">
            <h2>导入学习素材</h2>
            <p>优先保证视频可播放、字幕可解析、训练链路可用。</p>
          </div>
        </div>
        <div className="import-workspace-head-actions">
          {variant === "page" ? (
            <Link className="ios-button ghost button-link" href="/library">
              返回素材库
            </Link>
          ) : null}
          {variant === "dialog" ? (
            <button className="import-dialog-close" type="button" onClick={() => onClose?.()}>
              ×
            </button>
          ) : null}
        </div>
      </div>

      <div className="import-section">
        <div className="import-section-top">
          <div>
            <h3>视频来源</h3>
            <p>支持视频链接导入和本地视频文件导入。</p>
          </div>
          <div className="segmented">
            {SOURCE_MODES.map((item) => (
              <button
                key={item.id}
                className={sourceMode === item.id ? "active" : ""}
                type="button"
                onClick={() => setSourceMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {sourceMode === "link" ? (
          <div className="import-source-card">
            <input
              value={draft.youtubeUrl}
              onChange={(event) => setDraft((current) => ({ ...current, youtubeUrl: event.target.value }))}
              placeholder="粘贴可播放视频链接，例如 YouTube 视频地址"
            />
            <p>当前版本以真实可播放为准，导入后不会伪造缩略图和视频元数据。</p>
          </div>
        ) : (
          <label className="import-upload-zone">
            <input accept="video/*" className="sr-only-input" type="file" onChange={handleVideoFileChange} />
            <strong>{videoFile ? videoFile.name : "上传本地视频文件"}</strong>
            <p>
              {videoFile
                ? `${formatBytes(videoFile.size)} · ${videoFile.type || "未知格式"}`
                : "支持 mp4、webm 等浏览器可播放格式。"}
            </p>
          </label>
        )}
      </div>

      <div className="import-section">
        <div className="import-section-top">
          <div>
            <h3>外挂字幕</h3>
            <p>推荐 SRT / VTT。没有字幕时，本版本不会伪造学习内容。</p>
          </div>
          <div className="segmented">
            {SUBTITLE_MODES.map((item) => (
              <button
                key={item.id}
                className={subtitleMode === item.id ? "active" : ""}
                type="button"
                onClick={() => setSubtitleMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {subtitleMode === "file" ? (
          <label className="import-upload-zone subtitle-zone">
            <input accept=".srt,.vtt,.txt" className="sr-only-input" type="file" onChange={handleSubtitleFileChange} />
            <strong>{subtitleFileName || "上传字幕文件"}</strong>
            <p>
              {subtitleSummary
                ? `已解析 ${subtitleSummary.cues.length} 句，导入后将直接进入可学习状态。`
                : "解析时会去重空段并拆分原文 / 译文。"}
            </p>
          </label>
        ) : (
          <div className="import-source-card">
            <textarea
              rows={8}
              value={draft.rawSubtitles}
              onChange={(event) => setDraft((current) => ({ ...current, rawSubtitles: event.target.value }))}
              placeholder="粘贴 SRT / VTT / 每行 english || 中文"
            />
            <p>粘贴文本会在点击导入时进行真实解析，不会生成演示字幕。</p>
          </div>
        )}

        <div className="button-row">
          <button
            className="ios-button secondary"
            disabled={!transcriptService || !transcriptInput.trim() || isCleaningSubtitle}
            type="button"
            onClick={handleTranscriptCleanup}
          >
            {isCleaningSubtitle ? "清洗中..." : "AI 清洗字幕"}
          </button>
          <span className="row-meta-text">
            {transcriptService ? `当前能力：${transcriptService.providerName}` : "未配置 transcript_processing provider"}
          </span>
        </div>

        <div className="import-source-card">
          <div className="section-top compact">
            <div>
              <h2>图片识别</h2>
              <p>可把截图 / OCR 结果送入字幕文本区，再继续清洗或导入。</p>
            </div>
          </div>
          <div className="button-row">
            <label className="ios-button ghost">
              上传图片
              <input
                accept="image/*"
                className="sr-only-input"
                type="file"
                onChange={(event) => setVisionImageFile(event.target.files?.[0] || null)}
              />
            </label>
            <button
              className="ios-button secondary"
              disabled={!visionService || !visionImageFile || isRunningVision}
              type="button"
              onClick={handleVisionRecognition}
            >
              {isRunningVision ? "识别中..." : "AI 识别图片文本"}
            </button>
          </div>
          <p>
            {visionImageFile
              ? `${visionImageFile.name} · 当前能力：${visionService?.providerName || "未配置 vision provider"}`
              : "适合字幕截图、讲义图片或带英文文字的学习图片。"}
          </p>
        </div>
      </div>

      <div className="import-section import-meta-section">
        <div className="split-fields">
          <label className="form-field">
            <span>素材标题</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="form-field">
            <span>学习主题</span>
            <input value={draft.topic} onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))} />
          </label>
        </div>

        <div className="split-fields">
          <label className="form-field">
            <span>学习目标</span>
            <select value={draft.learningGoal} onChange={(event) => setDraft((current) => ({ ...current, learningGoal: event.target.value }))}>
              <option value="跟读">跟读</option>
              <option value="听写">听写</option>
              <option value="精读">精读</option>
              <option value="复习">复习</option>
            </select>
          </label>
          <label className="form-field">
            <span>难度</span>
            <select value={draft.difficulty} onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value }))}>
              <option value="基础">基础</option>
              <option value="四级">四级</option>
              <option value="六级">六级</option>
              <option value="考研">考研</option>
              <option value="更高阶">更高阶</option>
            </select>
          </label>
        </div>
      </div>

      <div className="import-status-panel" data-tone={status.tone}>
        <strong>{status.title}</strong>
        <p>{status.message}</p>
        {duplicateMaterial ? (
          <div className="import-status-inline">
            <span className="status-badge" data-tone="warning">
              重复素材
            </span>
            <span>{duplicateMaterial.title}</span>
          </div>
        ) : null}
      </div>

      <div className="import-footer">
        <p>导入即表示你确认拥有该内容的使用权。本版本只保存真实导入的数据和文件引用。</p>
        <div className="button-row">
          {variant === "dialog" ? (
            <button className="ios-button ghost" type="button" onClick={() => onClose?.()}>
              取消
            </button>
          ) : (
            <Link className="ios-button ghost button-link" href="/library">
              取消
            </Link>
          )}
          {variant === "dialog" ? (
            <Link className="ios-button secondary button-link" href="/import">
              全页导入
            </Link>
          ) : null}
          <button className="ios-button primary" disabled={!canSubmit} type="button" onClick={handleImport}>
            {isSubmitting ? "处理中..." : "解析并导入"}
          </button>
        </div>
      </div>
    </section>
  );
}
