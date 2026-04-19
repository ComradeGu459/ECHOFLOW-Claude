export interface SRSData {
  interval: number; // days before next review (0 means learn again)
  repetition: number; // review count
  easeFactor: number; // difficulty multiplier (min 1.3, default 2.5)
  nextReviewAt?: string; // ISO string Date
}

/**
 * SuperMemo-2 Algorithm implementation
 * 
 * Quality:
 * 0: forgot (Wait, what was that?)
 * 1: hard (Took a lot of thinking)
 * 2: good (Remembered with slight hesitation)
 * 3: easy (Perfect response)
 */
export function calculateSM2(
  quality: 0 | 1 | 2 | 3,
  repetition: number,
  easeFactor: number,
  interval: number
): SRSData {
  let nextInterval = 0;
  let nextRepetition = repetition;
  let nextEaseFactor = easeFactor;

  // Normal SM-2 maps 0-5. Here we use 0-3.
  // We'll map our 0-3 to SM-2's 0-5 scale approximately:
  // 0 -> 0 (Complete blackout)
  // 1 -> 2 (Incorrect response, but remembered upon seeing answer / took huge effort)
  // 2 -> 4 (Correct response after a hesitation)
  // 3 -> 5 (Perfect response)
  const sm2QualityMap = { 0: 0, 1: 2, 2: 4, 3: 5 };
  const sm2Quality = sm2QualityMap[quality];

  if (quality >= 2) {
    if (repetition === 0) {
      nextInterval = 1;
    } else if (repetition === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * easeFactor);
    }
    nextRepetition++;
  } else {
    nextRepetition = 0;
    nextInterval = 0; // immediate review
  }

  nextEaseFactor = easeFactor + (0.1 - (5 - sm2Quality) * (0.08 + (5 - sm2Quality) * 0.02));
  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;

  const nextReviewDate = new Date();
  if (nextInterval > 0) {
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
  } else {
    // If interval is 0, schedule for 10 minutes later
    nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 10);
  }

  return {
    interval: nextInterval,
    repetition: nextRepetition,
    easeFactor: nextEaseFactor,
    nextReviewAt: nextReviewDate.toISOString(),
  };
}
