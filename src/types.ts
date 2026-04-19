export type FlashcardType = 'word' | 'phrase' | 'expression' | 'pattern';
export type FlashcardStatus = 'new' | 'learning' | 'mastered';

export interface FlashcardMeta {
  id: string;
  type: FlashcardType;
  content: string; // English
  translation: string; // Chinese
  
  sourceVideoId: string;
  sourceVideoTitle: string;
  sourceSentence: string;
  sourceTimestamp: number;
  
  tags: string[];
  status: FlashcardStatus;
  isBookmarked: boolean;
  createdAt: string;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  
  // SM-2 SRS Data
  interval: number;
  repetition: number;
  easeFactor: number;
  
  reviewCount: number; // Keep for metrics
  masteryLevel: number; // 0-100 (Can be derived or kept for UI progress bar)
  
  // Specifics
  phonetic?: string;
  partOfSpeech?: string;
  enExplanation?: string;
  
  context?: string;
  collocations?: string[];
  
  scene?: string;
  tone?: string;
  synonyms?: string[];
  authenticExpressions?: string[];
  
  template?: string;
  variants?: string[];
}

export interface TranscriptLine {
  id: string;
  start: number;
  end: number;
  en: string;
  zh: string;
  words: { word: string; start: number; end: number }[];
}

export interface VideoMeta {
  id: string;
  youtubeId?: string;
  source: 'youtube' | 'local' | 'bilibili';
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  accent: string;
  tags: string[];
  aiTags: string[];
  
  // Learning Status
  status: 'processing' | 'not_started' | 'learning' | 'to_review' | 'completed';
  progress: number; // 0-100
  learnedSentences: number;
  totalSentences: number;
  lastLearnedAt?: string;
  isBookmarked: boolean;
  file?: File | Blob; // Storage for local videos

  // Processing Status
  processingStatus: {
    isProcessing: boolean;
    step: 'parsing' | 'transcribing' | 'aligning' | 'analyzing' | 'done' | 'error';
    percent: number;
    errorMsg?: string;
    // Added for detailed status display in Library
    subtitles?: 'done' | 'processing' | 'none';
    bilingual?: 'done' | 'processing' | 'none';
    expressions?: 'done' | 'processing' | 'none';
    flashcards?: 'done' | 'processing' | 'none';
  };
}

export interface LearningLog {
  id: string;
  timestamp: string;
  type: 'play' | 'shadowing' | 'flashcard_review' | 'asset_add';
  duration?: number; // minutes
  videoId?: string;
  cardId?: string;
  metadata?: any;
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'doubao' | 'custom';
export type AIScenario = 'explanation' | 'pronunciation' | 'translation' | 'general';

export interface AIProviderProfile {
  id: AIProvider;
  name: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  isOnlineEnabled: boolean;
}

export interface GlobalAIConfig {
  profiles: Record<AIProvider, AIProviderProfile>;
  scenarioMapping: Record<AIScenario, AIProvider>;
  lastUpdated: string;
}

// Keep the old AIConfig for backward compatibility if needed, or replace it
// Here we replace it with the new Profile concept for individual calls
export type AIConfig = AIProviderProfile;

export interface SentenceExplanation {
  translation: string;
  grammarPoints: string[];
  authenticExpressions: {
    text: string;
    tag: string;
  }[];
}
