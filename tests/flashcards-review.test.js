import assert from "node:assert/strict";

import {
  applyReviewFeedback,
  buildFlashcardOverview,
  buildFlashcardLibraryItems,
  buildTodayReviewQueue,
  filterFlashcards,
} from "../app/lib/flashcards-review.js";

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
  { id: "m1", title: "Daily Clip" },
  { id: "m2", title: "Interview English" },
];

const CARDS = [
  {
    id: "c1",
    title: "small talk",
    type: "短语卡",
    sourceMaterialId: "m1",
    sourceCueId: "1",
    sourceType: "手动创建",
    status: "待复习",
    favorite: true,
    nextReviewAt: "2026-03-25T00:00:00.000Z",
    reviewLevel: 0,
    reviewCount: 1,
    createdAt: "2026-03-24T00:00:00.000Z",
  },
  {
    id: "c2",
    title: "How are you?",
    type: "表达卡",
    sourceMaterialId: "m1",
    sourceCueId: "2",
    sourceType: "手动创建",
    status: "学习中",
    favorite: false,
    nextReviewAt: "2026-03-26T00:00:00.000Z",
    reviewLevel: 2,
    reviewCount: 2,
    createdAt: "2026-03-24T00:00:00.000Z",
  },
  {
    id: "c3",
    title: "If I were you",
    type: "句型卡",
    sourceMaterialId: "m2",
    sourceCueId: "3",
    sourceType: "手动创建",
    status: "已掌握",
    favorite: false,
    nextReviewAt: "2026-03-24T00:00:00.000Z",
    reviewLevel: 4,
    reviewCount: 5,
    createdAt: "2026-03-22T00:00:00.000Z",
  },
];

run("buildFlashcardLibraryItems joins cards with real source titles", () => {
  const items = buildFlashcardLibraryItems(CARDS, MATERIALS);

  assert.equal(items[0].sourceMaterialTitle, "Daily Clip");
  assert.equal(items[2].sourceMaterialTitle, "Interview English");
});

run("filterFlashcards supports type, favorite and search filters", () => {
  const items = buildFlashcardLibraryItems(CARDS, MATERIALS);

  const favorites = filterFlashcards(items, {
    type: "all",
    favoriteOnly: true,
    status: "all",
    search: "",
  });
  assert.equal(favorites.length, 1);
  assert.equal(favorites[0].id, "c1");

  const phrases = filterFlashcards(items, {
    type: "短语卡",
    favoriteOnly: false,
    status: "all",
    search: "",
  });
  assert.equal(phrases.length, 1);
  assert.equal(phrases[0].id, "c1");

  const searched = filterFlashcards(items, {
    type: "all",
    favoriteOnly: false,
    status: "all",
    search: "interview",
  });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, "c3");
});

run("buildTodayReviewQueue uses only actually due cards", () => {
  const queue = buildTodayReviewQueue(CARDS, "2026-03-25T12:00:00.000Z");

  assert.equal(queue.length, 2);
  assert.equal(queue[0].id, "c3");
  assert.equal(queue[1].id, "c1");
});

run("buildFlashcardOverview derives real dashboard metrics from cards", () => {
  const overview = buildFlashcardOverview(CARDS, "2026-03-25T12:00:00.000Z");

  assert.equal(overview.dueCount, 2);
  assert.equal(overview.newTodayCount, 0);
  assert.equal(overview.masteredCount, 1);
  assert.equal(overview.typeCounts["短语卡"], 1);
});

run("applyReviewFeedback schedules the next review from real feedback", () => {
  const base = CARDS[0];

  const forgot = applyReviewFeedback(base, "forgot", "2026-03-25T12:00:00.000Z");
  assert.equal(forgot.status, "待复习");
  assert.equal(forgot.reviewLevel, 0);
  assert.equal(forgot.nextReviewAt, "2026-03-25T16:00:00.000Z");

  const fuzzy = applyReviewFeedback(base, "fuzzy", "2026-03-25T12:00:00.000Z");
  assert.equal(fuzzy.status, "学习中");
  assert.equal(fuzzy.reviewLevel, 1);
  assert.equal(fuzzy.nextReviewAt, "2026-03-26T12:00:00.000Z");

  const known = applyReviewFeedback(base, "known", "2026-03-25T12:00:00.000Z");
  assert.equal(known.status, "学习中");
  assert.equal(known.reviewLevel, 2);
  assert.equal(known.nextReviewAt, "2026-03-28T12:00:00.000Z");

  const mastered = applyReviewFeedback(base, "mastered", "2026-03-25T12:00:00.000Z");
  assert.equal(mastered.status, "已掌握");
  assert.equal(mastered.reviewLevel, 4);
  assert.equal(mastered.nextReviewAt, "2026-04-08T12:00:00.000Z");
});
