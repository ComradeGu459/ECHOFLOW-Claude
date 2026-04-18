export const APP_STORAGE_KEY = "speakflow-platform-v3";

export const UI_TEXT = {
  zh: {
    nav: {
      dashboard: "总览",
      library: "素材库",
      player: "字幕学习",
      practice: "跟读听写",
      cards: "卡片中心",
      progress: "学习记录",
      settings: "设置中心"
    }
  },
  en: {
    nav: {
      dashboard: "Dashboard",
      library: "Library",
      player: "Player",
      practice: "Practice",
      cards: "Cards",
      progress: "Progress",
      settings: "Settings"
    }
  }
};

export const SAMPLE_MATERIAL_URL = "https://www.youtube.com/watch?v=ysz5S6PUM-U";

export const SAMPLE_SUBTITLES = `1
00:00:02,000 --> 00:00:06,000
I think speaking clearly takes repeated listening.
我觉得想把英语说清楚，先要反复去听。

2
00:00:07,000 --> 00:00:11,500
When you shadow one sentence enough times, the rhythm stays with you.
当你把一句话跟读足够多次，节奏感就会留在你身上。

3
00:00:12,000 --> 00:00:16,500
Click any word and turn it into a card you can review later.
点击任意单词，就能把它变成之后可复习的卡片。

4
00:00:17,000 --> 00:00:22,000
Then use dictation and recording to test what you really remember.
然后用听写和录音来检验你到底记住了多少。`;

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "it",
  "is", "are", "be", "am", "was", "were", "that", "this", "you", "your", "i",
  "we", "they", "he", "she", "them", "our", "my", "me", "his", "her", "their",
  "at", "by", "from", "as", "if", "but", "so", "not", "do", "does", "did",
  "have", "has", "had", "then", "than", "what", "when", "where", "how", "into",
  "can", "could", "will", "would", "should", "really"
]);

export function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function parseYouTubeId(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1, 12);
    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v").slice(0, 11);

    const parts = parsed.pathname.split("/");
    const embedIndex = parts.findIndex((part) => part === "embed" || part === "shorts");
    if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1].slice(0, 11);
  } catch {
    return "";
  }

  return "";
}

export function parseTimeToken(token) {
  const clean = token.trim().replace(",", ".");
  const parts = clean.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(clean) || 0;
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

export function getDifficultyTag(text) {
  const words = tokenize(text);
  const avgLength = words.reduce((sum, word) => sum + word.length, 0) / Math.max(words.length, 1);
  if (words.length <= 5 && avgLength <= 4.3) return "基础";
  if (words.length <= 8 && avgLength <= 5) return "四级";
  if (words.length <= 11 && avgLength <= 5.6) return "六级";
  if (words.length <= 16 && avgLength <= 6.1) return "考研";
  return "更高阶";
}

export function extractHighlights(text) {
  const words = tokenize(text).filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  const phrases = [];

  for (let index = 0; index < words.length - 1; index += 1) {
    const pair = `${words[index]} ${words[index + 1]}`;
    if (!STOP_WORDS.has(words[index]) && !STOP_WORDS.has(words[index + 1])) {
      phrases.push(pair);
    }
  }

  return {
    words: [...new Set(words)].slice(0, 6),
    phrases: [...new Set(phrases)].slice(0, 4)
  };
}

export function buildLocalAnalysis(english, chinese) {
  const { words, phrases } = extractHighlights(english);
  const grammar = [];

  if (/\bwhen\b/i.test(english)) grammar.push("时间从句");
  if (/\bthen\b/i.test(english)) grammar.push("顺承连接");
  if (/\byou\b/i.test(english)) grammar.push("口语直接表达");
  if (!grammar.length) grammar.push("基础陈述句");

  return {
    summary: chinese
      ? `这句适合练节奏、重音和信息块表达。对应中文：${chinese}`
      : "这句适合练节奏、重音和信息块表达。",
    highlights: [
      ...words.map((item) => ({ type: "word", value: item })),
      ...phrases.map((item) => ({ type: "phrase", value: item }))
    ],
    grammar,
    pronunciation: /\b(stays|speaking|repeated)\b/i.test(english)
      ? "注意连读、尾音和重读位置。"
      : "优先练语调和停顿，不要逐词去读。"
  };
}

export function parseSubtitles(raw) {
  const input = raw.trim();
  if (!input) return [];

  if (input.includes("-->")) {
    return input
      .split(/\n\s*\n/)
      .map((block, index) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const timing = lines.find((line) => line.includes("-->"));
        if (!timing) return null;

        const [startToken, endToken] = timing.split("-->").map((item) => item.trim());
        const textLines = lines.filter((line) => line !== timing && !/^\d+$/.test(line));
        const english = textLines.find((line) => /[a-zA-Z]/.test(line)) || textLines[0] || "";
        const chinese = textLines.find((line) => /[\u4e00-\u9fff]/.test(line)) || "";

        return {
          id: `${index + 1}`,
          start: parseTimeToken(startToken),
          end: parseTimeToken(endToken),
          english,
          chinese,
          difficultyTag: getDifficultyTag(english),
          analysis: buildLocalAnalysis(english, chinese)
        };
      })
      .filter(Boolean);
  }

  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [english, chinese = ""] = line.split("||").map((item) => item.trim());
      return {
        id: `${index + 1}`,
        start: index * 5,
        end: index * 5 + 4,
        english,
        chinese,
        difficultyTag: getDifficultyTag(english),
        analysis: buildLocalAnalysis(english, chinese)
      };
    });
}

export function createCardsFromMaterial(material) {
  const counts = new Map();

  material.cues.forEach((cue) => {
    tokenize(cue.english).forEach((word) => {
      if (word.length < 3 || STOP_WORDS.has(word)) return;
      counts.set(word, (counts.get(word) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([word, count], index) => {
      const sourceCue = material.cues.find((cue) => normalizeText(cue.english).includes(word));
      return {
        id: uid(`card_${index}`),
        type: "单词卡",
        sourceMaterialId: material.id,
        sourceCueId: sourceCue?.id || "",
        title: word,
        phonetic: `/${word}/`,
        meaning: sourceCue?.chinese || "待补充释义",
        example: sourceCue?.english || "",
        note: `${material.title} · 自动生成`,
        difficultyTag: sourceCue?.difficultyTag || "四级",
        sourceType: "AI 推荐生成",
        status: "新建",
        reviewLevel: 0,
        nextReviewAt: nowIso(),
        reviewCount: 0,
        createdAt: nowIso(),
        count
      };
    });
}

export function scoreDictation(input, expected) {
  const userWords = tokenize(input);
  const expectedWords = tokenize(expected);
  if (!expectedWords.length) return { score: 0, missing: [], extra: [] };

  const missing = expectedWords.filter((word) => !userWords.includes(word));
  const extra = userWords.filter((word) => !expectedWords.includes(word));
  const matched = expectedWords.length - missing.length;

  return {
    score: Math.round((matched / expectedWords.length) * 100),
    missing,
    extra
  };
}

export function createSampleMaterial() {
  const cues = parseSubtitles(SAMPLE_SUBTITLES);
  return {
    id: "material_sample",
    title: "Shadowing Starter",
    sourceTitle: "YouTube 示例素材",
    sourceType: "视频 + 字幕",
    youtubeUrl: SAMPLE_MATERIAL_URL,
    videoId: parseYouTubeId(SAMPLE_MATERIAL_URL),
    importedAt: nowIso(),
    durationMinutes: 1,
    difficulty: "四级",
    learningGoal: "跟读",
    topic: "口语表达",
    status: "学习中",
    archiveState: "活跃",
    tags: ["shadowing", "字幕学习", "入门"],
    subtitleOffset: 0,
    cues,
    description: "用于演示字幕学习、跟读、听写和卡片复习的示例素材。"
  };
}

export function buildDefaultApiServices() {
  return [
    {
      id: "service_local",
      providerName: "本地分析",
      providerType: "local",
      baseUrl: "",
      model: "heuristic",
      apiKey: "",
      enabled: true,
      isDefault: true,
      status: "可用",
      lastCheckedAt: nowIso(),
      capabilities: ["字幕分析", "难度判断", "卡片生成"]
    }
  ];
}

export function buildInitialPlatformState() {
  const material = createSampleMaterial();
  const cards = createCardsFromMaterial(material);

  return {
    ui: {
      sidebarCollapsed: true,
      language: "zh"
    },
    importDraft: {
      title: material.title,
      youtubeUrl: material.youtubeUrl,
      sourceType: "视频 + 字幕",
      learningGoal: "跟读",
      topic: "口语表达",
      difficulty: "四级",
      tags: "shadowing, 字幕学习",
      rawSubtitles: SAMPLE_SUBTITLES
    },
    materials: [material],
    currentMaterialId: material.id,
    currentCueId: material.cues[0]?.id || "",
    selectedWord: "",
    cards,
    currentCardId: cards[0]?.id || "",
    practice: {
      mode: "精读模式",
      dictationInput: "",
      recordings: [],
      recordingState: "idle",
      autoShowTranslation: true
    },
    analytics: {
      lastAiResult: "",
      lastGeneratedItems: []
    },
    settings: {
      apiServices: buildDefaultApiServices(),
      preferences: {
        subtitleDisplay: "中英双语",
        autoShowTranslation: true,
        flashcardRule: "按素材优先归类",
        scoringPreference: "均衡",
        aiTagLevel: "考研及以上"
      },
      storage: {
        saveStrategy: "localStorage",
        archivePolicy: "完成 7 天后可归档",
        autoCreateLogs: true,
        autoGenerateCards: true
      }
    },
    logs: [
      {
        id: uid("log"),
        type: "导入素材",
        message: `导入素材《${material.title}》`,
        createdAt: nowIso(),
        materialId: material.id
      }
    ],
    status: "准备就绪"
  };
}

export function buildPersistedSnapshot(state) {
  return {
    ui: state.ui,
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
    logs: state.logs
  };
}

