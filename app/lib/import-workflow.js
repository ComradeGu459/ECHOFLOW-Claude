import {
  nowIso,
  parseSubtitles,
  parseYouTubeId,
  uid,
} from "./platform-model.js";

function toMaterialTags(tagsValue) {
  return String(tagsValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFileFingerprint(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function inferSubtitleFormat(fileName) {
  const match = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || "text";
}

export function buildSourceDescriptor({ youtubeUrl, videoFile }) {
  if (videoFile) {
    return {
      kind: "local-video",
      sourceKey: `file:${toFileFingerprint(videoFile)}`,
      fileName: videoFile.name,
      fileSize: videoFile.size,
      fileType: videoFile.type || "",
      fileLastModified: videoFile.lastModified,
      videoBlob: videoFile,
    };
  }

  const videoId = parseYouTubeId(youtubeUrl);
  if (!videoId) {
    throw new Error("请提供有效的视频链接或本地视频文件。");
  }

  return {
    kind: "youtube",
    sourceKey: `youtube:${videoId}`,
    youtubeUrl: youtubeUrl.trim(),
    videoId,
  };
}

export function buildSubtitlePayload({ subtitleText, subtitleFileName }) {
  const rawSubtitles = String(subtitleText || "").trim();
  if (!rawSubtitles) {
    throw new Error("请提供可解析的字幕内容。");
  }

  const cues = parseSubtitles(rawSubtitles);
  if (!cues.length) {
    throw new Error("字幕解析失败，请检查文件内容或格式。");
  }

  return {
    rawSubtitles,
    subtitleFileName: subtitleFileName || "",
    subtitleFormat: inferSubtitleFormat(subtitleFileName),
    cues,
  };
}

export function findDuplicateMaterial(materials, sourceKey) {
  return materials.find((material) => material.sourceKey === sourceKey) || null;
}

export function buildMaterialFromImport({
  draft,
  source,
  subtitles,
  mode,
  now = nowIso(),
  createId = () => uid("material"),
}) {
  const title =
    draft.title?.trim() ||
    source.fileName?.replace(/\.[^.]+$/, "") ||
    source.videoId ||
    "未命名素材";
  const durationMinutes = Math.max(1, Math.ceil((subtitles.cues.at(-1)?.end || 0) / 60));

  return {
    id: createId(),
    title,
    sourceTitle: mode,
    sourceType: source.kind === "youtube" ? "视频 + 字幕" : "本地视频 + 字幕",
    sourceKey: source.sourceKey,
    sourceMediaKind: source.kind,
    youtubeUrl: source.youtubeUrl || "",
    videoId: source.videoId || "",
    localVideoFileName: source.fileName || "",
    localVideoMimeType: source.fileType || "",
    localVideoSize: source.fileSize || 0,
    localVideoLastModified: source.fileLastModified || 0,
    localVideoBlob: source.videoBlob || null,
    importedAt: now,
    updatedAt: now,
    durationMinutes,
    difficulty: draft.difficulty || "四级",
    learningGoal: draft.learningGoal || "跟读",
    topic: draft.topic?.trim() || "",
    status: "未开始",
    archiveState: "活跃",
    favorite: false,
    reviewDueCount: 0,
    lastStudiedAt: "",
    lastPositionSeconds: 0,
    tags: toMaterialTags(draft.tags),
    subtitleOffset: 0,
    subtitleFileName: subtitles.subtitleFileName || "",
    subtitleFormat: subtitles.subtitleFormat || "text",
    rawSubtitles: subtitles.rawSubtitles,
    cues: subtitles.cues.map((cue) => ({
      ...cue,
      favorite: Boolean(cue.favorite),
    })),
    description: "",
  };
}
