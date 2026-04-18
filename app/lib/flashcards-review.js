function searchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function addHours(isoString, hours) {
  return new Date(new Date(isoString).getTime() + hours * 3600 * 1000).toISOString();
}

function addDays(isoString, days) {
  return new Date(new Date(isoString).getTime() + days * 24 * 3600 * 1000).toISOString();
}

export function buildFlashcardLibraryItems(cards, materials) {
  return cards.map((card) => {
    const sourceMaterial = materials.find((material) => material.id === card.sourceMaterialId);
    return {
      ...card,
      sourceMaterialTitle: sourceMaterial?.title || "",
    };
  });
}

export function filterFlashcards(
  cards,
  { type = "all", favoriteOnly = false, status = "all", search = "" },
) {
  const needle = searchValue(search);

  return cards.filter((card) => {
    if (type !== "all" && card.type !== type) return false;
    if (favoriteOnly && !card.favorite) return false;
    if (status !== "all" && card.status !== status) return false;
    if (!needle) return true;

    const haystack = [card.title, card.meaning, card.example, card.sourceMaterialTitle]
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });
}

export function buildTodayReviewQueue(cards, now) {
  const nowTime = new Date(now).getTime();
  return cards
    .filter((card) => new Date(card.nextReviewAt).getTime() <= nowTime)
    .sort((left, right) => new Date(left.nextReviewAt) - new Date(right.nextReviewAt));
}

export function buildFlashcardOverview(cards, now) {
  const nowDate = new Date(now).toDateString();
  const typeCounts = {};

  cards.forEach((card) => {
    typeCounts[card.type] = (typeCounts[card.type] || 0) + 1;
  });

  return {
    dueCount: buildTodayReviewQueue(cards, now).length,
    newTodayCount: cards.filter((card) => new Date(card.createdAt).toDateString() === nowDate).length,
    masteredCount: cards.filter((card) => card.status === "已掌握").length,
    typeCounts,
  };
}

export function applyReviewFeedback(card, feedback, now) {
  const nextReviewMap = {
    forgot: { status: "待复习", reviewLevel: 0, nextReviewAt: addHours(now, 4) },
    fuzzy: { status: "学习中", reviewLevel: 1, nextReviewAt: addDays(now, 1) },
    known: { status: "学习中", reviewLevel: 2, nextReviewAt: addDays(now, 3) },
    mastered: { status: "已掌握", reviewLevel: 4, nextReviewAt: addDays(now, 14) },
  };

  const nextState = nextReviewMap[feedback];
  if (!nextState) return card;

  return {
    ...card,
    ...nextState,
    reviewCount: (card.reviewCount || 0) + 1,
    lastReviewedAt: now,
  };
}
