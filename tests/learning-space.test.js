import assert from "node:assert/strict";

import {
  buildLearningSpaceFilters,
  buildLearningSpaceSummary,
  filterLearningSpaceMaterials,
  rankRecentMaterials,
} from "../app/lib/learning-space.js";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const MATERIALS = [
  {
    id: "m1",
    title: "Daily Clip",
    topic: "daily life",
    learningGoal: "跟读",
    difficulty: "四级",
    sourceType: "视频 + 字幕",
    sourceMediaKind: "youtube",
    videoId: "dQw4w9WgXcQ",
    tags: ["daily", "speaking"],
    cues: [{ id: "1" }, { id: "2" }],
    status: "学习中",
    favorite: true,
    importedAt: "2026-03-23T02:00:00.000Z",
    lastStudiedAt: "2026-03-25T01:00:00.000Z",
    lastPositionSeconds: 40,
    durationMinutes: 2,
  },
  {
    id: "m2",
    title: "Travel Notes",
    topic: "travel",
    learningGoal: "精读",
    difficulty: "六级",
    sourceType: "本地视频 + 字幕",
    sourceMediaKind: "local-video",
    localVideoFileName: "travel.mp4",
    tags: ["travel"],
    cues: [{ id: "1" }],
    status: "未开始",
    favorite: false,
    importedAt: "2026-03-24T02:00:00.000Z",
    lastStudiedAt: "",
    lastPositionSeconds: 0,
    durationMinutes: 1,
  },
  {
    id: "m3",
    title: "Interview English",
    topic: "career",
    learningGoal: "复习",
    difficulty: "考研",
    sourceType: "视频 + 字幕",
    sourceMediaKind: "youtube",
    videoId: "abcdefghijk",
    tags: ["career"],
    cues: [{ id: "1" }, { id: "2" }, { id: "3" }],
    status: "已完成",
    favorite: false,
    importedAt: "2026-03-22T02:00:00.000Z",
    lastStudiedAt: "2026-03-24T02:00:00.000Z",
    lastPositionSeconds: 180,
    durationMinutes: 3,
  },
];

const FLASHCARDS = [
  {
    id: "c1",
    sourceMaterialId: "m1",
    nextReviewAt: "2026-03-25T01:00:00.000Z",
    status: "待复习",
  },
  {
    id: "c2",
    sourceMaterialId: "m1",
    nextReviewAt: "2026-03-28T01:00:00.000Z",
    status: "学习中",
  },
  {
    id: "c3",
    sourceMaterialId: "m3",
    nextReviewAt: "2026-03-24T01:00:00.000Z",
    status: "待复习",
  },
];

run("buildLearningSpaceSummary derives truthful card metrics", () => {
  const cards = buildLearningSpaceSummary({
    materials: MATERIALS,
    cards: FLASHCARDS,
    now: "2026-03-25T02:00:00.000Z",
  });

  assert.equal(cards.length, 3);
  assert.equal(cards[0].id, "m1");
  assert.equal(cards[0].dueReviewCount, 1);
  assert.equal(cards[0].totalCardCount, 2);
  assert.equal(cards[0].thumbnailUrl, "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  assert.equal(cards[1].thumbnailUrl, "");
});

run("rankRecentMaterials returns only truly studied materials", () => {
  const recent = rankRecentMaterials(
    buildLearningSpaceSummary({
      materials: MATERIALS,
      cards: FLASHCARDS,
      now: "2026-03-25T02:00:00.000Z",
    }),
  );

  assert.equal(recent.length, 2);
  assert.equal(recent[0].id, "m1");
  assert.equal(recent[1].id, "m3");
});

run("buildLearningSpaceFilters uses actual imported metadata", () => {
  const filters = buildLearningSpaceFilters(MATERIALS);

  assert.deepEqual(filters.topics, ["career", "daily life", "travel"]);
  assert.deepEqual(filters.goals, ["复习", "精读", "跟读"]);
});

run("filterLearningSpaceMaterials applies tab and search filters", () => {
  const summaries = buildLearningSpaceSummary({
    materials: MATERIALS,
    cards: FLASHCARDS,
    now: "2026-03-25T02:00:00.000Z",
  });

  const favorites = filterLearningSpaceMaterials(summaries, {
    tab: "favorites",
    search: "",
    topic: "all",
    learningGoal: "all",
  });
  assert.equal(favorites.length, 1);
  assert.equal(favorites[0].id, "m1");

  const waitingReview = filterLearningSpaceMaterials(summaries, {
    tab: "review",
    search: "",
    topic: "all",
    learningGoal: "all",
  });
  assert.equal(waitingReview.length, 2);

  const searched = filterLearningSpaceMaterials(summaries, {
    tab: "all",
    search: "travel",
    topic: "all",
    learningGoal: "all",
  });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, "m2");
});
