import assert from "node:assert/strict";

import {
  buildCueCardDraft,
  clampSplitRatio,
  clampSubtitleFontSize,
  formatCueEnglishForDisplay,
  findActiveCueIdAtTime,
  getAdjacentCueId,
  shouldScrollCueIntoView,
} from "../app/lib/player-workspace.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const CUES = [
  { id: "1", start: 0, end: 2, english: "Hello there.", chinese: "你好。" },
  { id: "2", start: 2.1, end: 5, english: "How are you?", chinese: "你好吗？" },
  { id: "3", start: 6, end: 8, english: "See you soon.", chinese: "回头见。" },
];

run("findActiveCueIdAtTime follows playback time", () => {
  assert.equal(findActiveCueIdAtTime(CUES, 0.5), "1");
  assert.equal(findActiveCueIdAtTime(CUES, 2.5), "2");
  assert.equal(findActiveCueIdAtTime(CUES, 5.6), "2");
  assert.equal(findActiveCueIdAtTime(CUES, 6.1), "3");
});

run("getAdjacentCueId clamps at the boundaries", () => {
  assert.equal(getAdjacentCueId(CUES, "1", -1), "1");
  assert.equal(getAdjacentCueId(CUES, "1", 1), "2");
  assert.equal(getAdjacentCueId(CUES, "3", 1), "3");
});

run("player layout preferences are clamped", () => {
  assert.equal(clampSplitRatio(0.2), 0.42);
  assert.equal(clampSplitRatio(0.95), 0.74);
  assert.equal(clampSplitRatio(0.61), 0.61);

  assert.equal(clampSubtitleFontSize(10), 14);
  assert.equal(clampSubtitleFontSize(30), 24);
  assert.equal(clampSubtitleFontSize(18), 18);
});

run("buildCueCardDraft creates a sentence-derived flashcard payload", () => {
  const payload = buildCueCardDraft({
    cue: CUES[1],
    material: { title: "Daily Clip" },
    type: "表达卡",
  });

  assert.equal(payload.title, "How are you?");
  assert.equal(payload.type, "表达卡");
  assert.equal(payload.meaning, "你好吗？");
  assert.match(payload.note, /Daily Clip/);
});

run("shouldScrollCueIntoView only scrolls when the active cue is outside the viewport", () => {
  assert.equal(
    shouldScrollCueIntoView(
      { top: 100, bottom: 600 },
      { top: 180, bottom: 240 },
    ),
    false,
  );

  assert.equal(
    shouldScrollCueIntoView(
      { top: 100, bottom: 600 },
      { top: 40, bottom: 90 },
    ),
    true,
  );

  assert.equal(
    shouldScrollCueIntoView(
      { top: 100, bottom: 600 },
      { top: 610, bottom: 690 },
    ),
    true,
  );
});

run("formatCueEnglishForDisplay improves tightly packed subtitles for display only", () => {
  assert.equal(
    formatCueEnglishForDisplay("didyousetyouralarmfortomorrow"),
    "did you set your alarm for tomorrow",
  );
  assert.equal(
    formatCueEnglishForDisplay("yeahit'ssetfor7:15"),
    "yeah it's set for 7:15",
  );
});
