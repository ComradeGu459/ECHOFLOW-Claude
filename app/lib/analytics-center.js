function toDayKey(value) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

function listPastDays(now, days) {
  const base = new Date(now);
  const result = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() - index);
    result.push(toDayKey(date.toISOString()));
  }
  return result;
}

export function countContinuousStudyDays(logs, now) {
  const studyDays = new Set(
    logs.filter((log) => log.type === "学习会话").map((log) => toDayKey(log.createdAt)),
  );
  let streak = 0;
  const cursor = new Date(now);

  while (studyDays.has(toDayKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function buildDailyTrend(logs, now) {
  const days = listPastDays(now, 7);
  return days.map((day) => {
    const dayLogs = logs.filter((log) => toDayKey(log.createdAt) === day);
    return {
      day,
      studyMinutes: dayLogs
        .filter((log) => log.type === "学习会话")
        .reduce((sum, log) => sum + (log.minutes || 0), 0),
      shadowingCount: dayLogs.filter((log) => log.type === "跟读录音").length,
      dictationCount: dayLogs.filter((log) => log.type === "听写练习").length,
      reviewCount: dayLogs.filter((log) => log.type === "复习卡片").length,
    };
  });
}

export function buildTopicDistribution(logs, materials) {
  const topicMap = new Map();
  const materialMap = new Map(materials.map((material) => [material.id, material]));

  logs.forEach((log) => {
    const topic = materialMap.get(log.materialId)?.topic;
    if (!topic) return;
    topicMap.set(topic, (topicMap.get(topic) || 0) + 1);
  });

  return [...topicMap.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((left, right) => right.count - left.count);
}

export function buildStudyAnalytics({ logs, materials, cards, now }) {
  return {
    totalStudyMinutes: logs
      .filter((log) => log.type === "学习会话")
      .reduce((sum, log) => sum + (log.minutes || 0), 0),
    continuousStudyDays: countContinuousStudyDays(logs, now),
    shadowingCount: logs.filter((log) => log.type === "跟读录音").length,
    masteredExpressionCount: cards.filter((card) => card.status === "已掌握").length,
    dueReviewCount: cards.filter((card) => new Date(card.nextReviewAt).getTime() <= new Date(now).getTime()).length,
    trend: buildDailyTrend(logs, now),
    topicDistribution: buildTopicDistribution(logs, materials),
  };
}
