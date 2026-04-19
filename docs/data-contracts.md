# Data Contracts: English Learning Studio

## 1. Video Meta (`VideoMeta`)
- **Source:** `src/types.ts`
- **Contract:**
    - `id`: Unique string (UUID/ULID).
    - `title`: Video title.
    - `source`: `'youtube' | 'local'`.
    - `status`: `'processing' | 'not_started' | 'learning' | 'completed'`.
    - `processingStatus`:
        - `isProcessing`: boolean.
        - `step`: `'parsing' | 'transcribing' | 'aligning' | 'analyzing' | 'done'`.
        - `percent`: 0-100.
    - `learnedSentences`: Number of sentences practiced in Studio.
    - `totalSentences`: Total sentences in video.

## 2. Flashcard Meta (`FlashcardMeta`)
- **Source:** `src/types.ts`
- **Contract:**
    - `id`: Unique string.
    - `expression`: The L2 phrase/word.
    - `meaning`: The L1 translation.
    - `context`: The original sentence from the video.
    - `sourceVideoId`: Reference to `VideoMeta.id`.
    - `status`: `'new' | 'learning' | 'mastered'`.
    - `masteryLevel`: 0-100.
    - `reviewCount`: Number of times reviewed.

## 3. Learning Log (`LearningLog`)
- **Source:** `src/types.ts`
- **Contract:**
    - `id`: Unique string.
    - `timestamp`: ISO string.
    - `type`: `'play' | 'shadowing' | 'asset_add' | 'flashcard_review'`.
    - `duration`: Number (seconds).
    - `videoId`: Optional reference to `VideoMeta.id`.
    - `cardId`: Optional reference to `FlashcardMeta.id`.

## 4. Analytics Data (`AnalyticsData`)
- **Source:** `src/types.ts`
- **Contract:**
    - `summary`:
        - `totalLearningTime`: Total duration from logs.
        - `inputTime`: Duration from `type: 'play'`.
        - `outputTime`: Duration from `type: 'shadowing'`.
        - `masteredExpressions`: Count of `FlashcardMeta.status === 'mastered'`.
        - `currentStreak`: Consecutive days with logs.
    - `trends`: Array of `{ date, input, output, review }`.
    - `categories`: Array of `{ name, value }` (topic distribution).
    - `skills`: Array of `{ name, value }` (e.g., Listening, Speaking).
