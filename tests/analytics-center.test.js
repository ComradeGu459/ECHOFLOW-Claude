import assert from "node:assert/strict";

import {
  buildDailyTrend,
  buildStudyAnalytics,
  buildTopicDistribution,
  countContinuousStudyDays,
} from "../app/lib/analytics-center.js";

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
  { id: "m1", title: "Daily Clip", topic: "daily life", learningGoal: "跟读" },
  { id: "m2", title: "Interview English", topic: "career", learningGoal: "复习" },
];

const CARDS = [
  { id: "c1", status: "已掌握", sourceMaterialId: "m1", nextReviewAt: "2026-03-28T00:00:00.000Z" },
  { id: "c2", status: "待复习", sourceMaterialId: "m1", nextReviewAt: "2026-03-25T00:00:00.000Z" },
  { id: "c3", status: "学习中", sourceMaterialId: "m2", nextReviewAt: "2026-03-24T00:00:00.000Z" },
];

const LOGS = [
  { id: "l1", type: "学习会话", createdAt: "2026-03-25T02:00:00.000Z", materialId: "m1", minutes: 14 },
  { id: "l2", type: "学习会话", createdAt: "2026-03-24T02:00:00.000Z", materialId: "m1", minutes: 12 },
  { id: "l3", type: "学习会话", createdAt: "2026-03-23T02:00:00.000Z", materialId: "m2", minutes: 8 },
  { id: "l4", type: "跟读录音", createdAt: "2026-03-25T02:10:00.000Z", materialId: "m1" },
  { id: "l5", type: "跟读录音", createdAt: "2026-03-24T02:20:00.000Z", materialId: "m1" },
  { id: "l6", type: "复习卡片", createdAt: "2026-03-25T03:00:00.000Z", materialId: "m2" },
  { id: "l7", type: "听写练习", createdAt: "2026-03-24T03:00:00.000Z", materialId: "m1" },
];

run("countContinuousStudyDays uses real study-session days", () => {
  const streak = countContinuousStudyDays(LOGS, "2026-03-25T10:00:00.000Z");
  assert.equal(streak, 3);
});

run("buildDailyTrend creates a 7 day series from real logs", () => {
  const trend = buildDailyTrend(LOGS, "2026-03-25T10:00:00.000Z");

  assert.equal(trend.length, 7);
  assert.equal(trend.at(-1).studyMinutes, 14);
  assert.equal(trend.at(-1).shadowingCount, 1);
  assert.equal(trend.at(-2).dictationCount, 1);
});

run("buildTopicDistribution groups activity by real material topic", () => {
  const distribution = buildTopicDistribution(LOGS, MATERIALS);

  assert.equal(distribution.length, 2);
  assert.equal(distribution[0].topic, "daily life");
  assert.equal(distribution[0].count, 5);
});

run("buildStudyAnalytics derives dashboard metrics from real local records", () => {
  const analytics = buildStudyAnalytics({
    logs: LOGS,
    materials: MATERIALS,
    cards: CARDS,
    now: "2026-03-25T10:00:00.000Z",
  });

  assert.equal(analytics.totalStudyMinutes, 34);
  assert.equal(analytics.continuousStudyDays, 3);
  assert.equal(analytics.shadowingCount, 2);
  assert.equal(analytics.masteredExpressionCount, 1);
  assert.equal(analytics.dueReviewCount, 2);
  assert.equal(analytics.trend.length, 7);
  assert.equal(analytics.topicDistribution.length, 2);
});
