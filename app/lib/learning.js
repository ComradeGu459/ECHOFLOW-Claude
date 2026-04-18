export const SAMPLE_URL = "https://www.youtube.com/watch?v=ysz5S6PUM-U";

export const SAMPLE_SUBTITLES = `1
00:00:02,000 --> 00:00:06,000
I think speaking clearly takes repeated listening.
我觉得想把英语说清楚，先要反复听。

2
00:00:07,000 --> 00:00:11,500
When you shadow one sentence enough times, the rhythm stays with you.
当你把一句话跟读足够多次，节奏就会留在你身上。

3
00:00:12,000 --> 00:00:16,500
Click any word and turn it into a card you can review later.
点击任意单词，把它变成之后可以复习的卡片。

4
00:00:17,000 --> 00:00:22,000
Then use dictation and recording to test what you really remember.
然后用听写和录音检查你到底记住了什么。`;

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "it",
  "is", "are", "be", "am", "was", "were", "that", "this", "you", "your", "i",
  "we", "they", "he", "she", "them", "our", "my", "me", "his", "her", "their",
  "at", "by", "from", "as", "if", "but", "so", "not", "do", "does", "did",
  "have", "has", "had", "then", "than", "what", "when", "where", "how", "into",
  "can", "could", "will", "would", "should", "really"
]);

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
    if (embedIndex >= 0 && parts[embedIndex + 1]) {
      return parts[embedIndex + 1].slice(0, 11);
    }
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

export function parseSubtitles(raw) {
  const input = raw.trim();
  if (!input) return [];

  if (input.includes("-->")) {
    return input
      .split(/\n\s*\n/)
      .map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
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
          chinese
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
        chinese
      };
    });
}

export function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

export function buildCards(cues) {
  const counts = new Map();
  cues.forEach((cue) => {
    tokenize(cue.english).forEach((word) => {
      if (word.length < 3 || STOP_WORDS.has(word)) return;
      counts.set(word, (counts.get(word) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count], index) => {
      const sample = cues.find((cue) => normalizeText(cue.english).includes(word));
      return {
        id: `${word}-${index}`,
        front: word,
        back: sample?.english || "",
        note: sample?.chinese || "复习这个词的发音、搭配和使用场景。",
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

export function buildWorkspaceSnapshot(state) {
  return {
    youtubeInput: state.youtubeInput,
    videoId: state.videoId,
    rawSubtitles: state.rawSubtitles,
    cues: state.cues,
    activeCueId: state.activeCueId,
    selectedWord: state.selectedWord,
    cards: state.cards,
    apiConfig: state.apiConfig
  };
}
