function toTimestamp(value) {
  return value ? new Date(value).getTime() : 0;
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function buildThumbnailUrl(material) {
  if (material.sourceMediaKind === "youtube" && material.videoId) {
    return `https://i.ytimg.com/vi/${material.videoId}/hqdefault.jpg`;
  }
  return "";
}

function countDueReviews(materialId, cards, now) {
  const nowTime = new Date(now).getTime();
  return cards.filter((card) => {
    if (card.sourceMaterialId !== materialId || !card.nextReviewAt) return false;
    return new Date(card.nextReviewAt).getTime() <= nowTime;
  }).length;
}

function countMaterialCards(materialId, cards) {
  return cards.filter((card) => card.sourceMaterialId === materialId).length;
}

export function buildLearningSpaceSummary({ materials, cards, now }) {
  return materials.map((material) => {
    const totalCardCount = countMaterialCards(material.id, cards);
    const dueReviewCount = countDueReviews(material.id, cards, now);
    const totalDurationSeconds = Math.max(1, (material.durationMinutes || 0) * 60);
    const progressPercent = material.lastPositionSeconds
      ? Math.min(100, Math.round((material.lastPositionSeconds / totalDurationSeconds) * 100))
      : 0;

    return {
      ...material,
      cueCount: Array.isArray(material.cues) ? material.cues.length : 0,
      totalCardCount,
      dueReviewCount,
      thumbnailUrl: buildThumbnailUrl(material),
      progressPercent,
    };
  });
}

export function rankRecentMaterials(materials) {
  return materials
    .filter((material) => material.lastStudiedAt)
    .sort((left, right) => toTimestamp(right.lastStudiedAt) - toTimestamp(left.lastStudiedAt));
}

export function buildLearningSpaceFilters(materials) {
  const topics = [...new Set(materials.map((material) => material.topic).filter(Boolean))].sort();
  const goals = [...new Set(materials.map((material) => material.learningGoal).filter(Boolean))].sort();

  return { topics, goals };
}

export function filterLearningSpaceMaterials(
  materials,
  { tab = "all", search = "", topic = "all", learningGoal = "all" },
) {
  const searchValue = normalizeSearch(search);

  return materials.filter((material) => {
    if (tab === "favorites" && !material.favorite) return false;
    if (tab === "learning" && material.status !== "学习中") return false;
    if (tab === "review" && material.dueReviewCount <= 0) return false;
    if (tab === "completed" && material.status !== "已完成") return false;
    if (topic !== "all" && material.topic !== topic) return false;
    if (learningGoal !== "all" && material.learningGoal !== learningGoal) return false;

    if (!searchValue) return true;
    const haystack = [
      material.title,
      material.topic,
      material.learningGoal,
      material.sourceType,
      ...(material.tags || []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchValue);
  });
}
