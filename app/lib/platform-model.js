import {
  UI_TEXT,
  uid,
  nowIso,
  formatDateTime,
  parseYouTubeId,
  parseTimeToken,
  formatTime,
  normalizeText,
  tokenize,
  getDifficultyTag,
  extractHighlights,
  buildLocalAnalysis,
  parseSubtitles,
  createCardsFromMaterial,
  scoreDictation,
} from "./platform-data.js";

export {
  UI_TEXT,
  uid,
  nowIso,
  formatDateTime,
  parseYouTubeId,
  parseTimeToken,
  formatTime,
  normalizeText,
  tokenize,
  getDifficultyTag,
  extractHighlights,
  buildLocalAnalysis,
  parseSubtitles,
  createCardsFromMaterial,
  scoreDictation,
};

export const APP_STORAGE_KEY = "echoflow-pro-workspace";
export const LEGACY_APP_STORAGE_KEY = "speakflow-platform-v3";
export const UI_STORAGE_KEY = "echoflow-pro-ui-preferences";

export function buildDefaultApiServices() {
  return [
    {
      id: "service_local",
      providerName: "本地分析",
      providerType: "local",
      protocol: "local",
      vendor: "local",
      baseUrl: "",
      endpointOverrides: {},
      model: "heuristic",
      apiKey: "",
      enabled: true,
      isDefault: true,
      status: "可用",
      lastCheckedAt: nowIso(),
      capabilities: ["study_analysis", "transcript_processing", "behavior_analysis"],
    },
  ];
}

export function buildDefaultAiRouting() {
  return {
    study_analysis: "service_local",
    speech_in: "",
    speech_out: "",
    transcript_processing: "service_local",
    vision: "",
    behavior_analysis: "service_local",
  };
}

export function buildDefaultUiState() {
  return {
    sidebarCollapsed: true,
    language: "zh",
    player: {
      splitRatio: 0.62,
      playbackRate: 1,
      subtitleFontSize: 18,
      loopCurrentCue: false,
      showTranslation: true,
    },
  };
}

export function buildEmptyImportDraft() {
  return {
    title: "",
    youtubeUrl: "",
    sourceType: "视频 + 字幕",
    learningGoal: "跟读",
    topic: "",
    difficulty: "四级",
    tags: "",
    rawSubtitles: "",
  };
}

export function buildInitialPlatformState() {
  return {
    ui: buildDefaultUiState(),
    importDraft: buildEmptyImportDraft(),
    materials: [],
    currentMaterialId: "",
    currentCueId: "",
    selectedWord: "",
    cards: [],
    currentCardId: "",
    practice: {
      mode: "精读模式",
      dictationInput: "",
      recordings: [],
      recordingState: "idle",
      aiTranscription: "",
      aiTranscriptionCreatedAt: "",
      autoShowTranslation: true,
    },
    analytics: {
      lastAiResult: "",
      lastGeneratedItems: [],
      behaviorSuggestion: "",
      behaviorGeneratedAt: "",
    },
    settings: {
      apiServices: buildDefaultApiServices(),
      aiRouting: buildDefaultAiRouting(),
      preferences: {
        subtitleDisplay: "中英双语",
        autoShowTranslation: true,
        flashcardRule: "按素材优先归类",
        scoringPreference: "均衡",
        aiTagLevel: "考研及以上",
      },
      storage: {
        saveStrategy: "IndexedDB + localStorage",
        archivePolicy: "完成 7 天后可归档",
        autoCreateLogs: true,
        autoGenerateCards: true,
      },
    },
    logs: [],
    status: "等待导入素材",
  };
}

export function buildPersistedSnapshot(state) {
  return {
    importDraft: state.importDraft,
    materials: state.materials,
    currentMaterialId: state.currentMaterialId,
    currentCueId: state.currentCueId,
    selectedWord: state.selectedWord,
    cards: state.cards,
    currentCardId: state.currentCardId,
    practice: state.practice,
    analytics: state.analytics,
    settings: state.settings,
    logs: state.logs,
    status: state.status,
  };
}
