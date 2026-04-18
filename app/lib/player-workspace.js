export function findActiveCueIdAtTime(cues, time) {
  if (!Array.isArray(cues) || !cues.length) return "";

  for (let index = cues.length - 1; index >= 0; index -= 1) {
    if (time >= cues[index].start) {
      return cues[index].id;
    }
  }

  return cues[0].id;
}

export function getAdjacentCueId(cues, currentCueId, delta) {
  if (!Array.isArray(cues) || !cues.length) return "";
  const currentIndex = Math.max(0, cues.findIndex((cue) => cue.id === currentCueId));
  const targetIndex = Math.min(cues.length - 1, Math.max(0, currentIndex + delta));
  return cues[targetIndex]?.id || cues[0].id;
}

export function clampSplitRatio(value) {
  return Math.min(0.74, Math.max(0.42, Number(value) || 0.6));
}

export function clampSubtitleFontSize(value) {
  return Math.min(24, Math.max(14, Math.round(Number(value) || 18)));
}

export function buildCueCardDraft({ cue, material, type = "表达卡" }) {
  return {
    title: cue.english,
    type,
    meaning: cue.chinese || "",
    example: cue.english,
    note: `${material.title} · 来自学习播放页`,
    sourceType: "手动创建",
    difficultyTag: cue.difficultyTag || "四级",
  };
}

export function shouldScrollCueIntoView(containerRect, cueRect) {
  if (!containerRect || !cueRect) return false;
  return cueRect.top < containerRect.top || cueRect.bottom > containerRect.bottom;
}

const COMMON_WORDS = [
  "i", "have", "a", "meeting", "at", "can", "t", "be", "late", "again",
  "did", "you", "set", "your", "alarm", "for", "tomorrow", "yeah", "it",
  "s", "one", "hour", "to", "improve", "english", "listening", "skills",
  "actually", "getting", "up", "early", "this", "time", "the", "new",
  "mac", "mini", "so", "is", "and", "not", "only", "but", "also",
];

function splitPlainWord(run) {
  const lower = run.toLowerCase();
  const memo = new Map();

  function walk(index) {
    if (index >= lower.length) return { words: [], score: 0 };
    if (memo.has(index)) return memo.get(index);

    let best = null;
    for (let end = index + 1; end <= lower.length; end += 1) {
      const part = lower.slice(index, end);
      const next = walk(end);
      const isKnown = COMMON_WORDS.includes(part);
      const candidate = {
        words: [part, ...next.words],
        score:
          next.score +
          (isKnown ? part.length * 12 : -(part.length * 4 + 14)),
      };

      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }

    memo.set(index, best);
    return best;
  }

  const result = walk(0);
  return result.words.join(" ");
}

export function formatCueEnglishForDisplay(text) {
  const input = String(text || "").trim();
  if (!input) return "";
  if (/\s/.test(input)) return input;

  return input
    .replace(/([0-9]+)/g, " $1 ")
    .split(/(\d[\d:]*|\')/g)
    .filter(Boolean)
    .map((chunk) => {
      if (/^\d[\d:]*$/.test(chunk)) return chunk;
      if (chunk === "'") return chunk;
      return splitPlainWord(chunk);
    })
    .join(" ")
    .replace(/\s+'/g, "'")
    .replace(/\b([a-z])\s+([a-z])'\s*([a-z])\b/g, "$1$2'$3")
    .replace(/\b([a-z])\s+([a-z])'s\b/g, "$1$2's")
    .replace(/\b([a-z])\s+'([a-z])\b/g, "$1'$2")
    .replace(/(\d)\s*:\s*(\d)/g, "$1:$2")
    .replace(/\s+/g, " ")
    .trim();
}
