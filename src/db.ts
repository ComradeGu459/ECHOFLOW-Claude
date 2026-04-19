import Dexie, { Table } from 'dexie';
import { VideoMeta, FlashcardMeta, LearningLog, TranscriptLine } from './types';

export interface TranscriptData {
  videoId: string;
  lines: TranscriptLine[];
}

export class EnglishStudioDB extends Dexie {
  videos!: Table<VideoMeta, string>;
  flashcards!: Table<FlashcardMeta, string>;
  logs!: Table<LearningLog, string>;
  transcripts!: Table<TranscriptData, string>;

  constructor() {
    super('EnglishStudioDB_v2'); // renamed DB to start fresh
    this.version(1).stores({
      videos: 'id, status',
      flashcards: 'id, sourceVideoId, status',
      logs: 'id, timestamp, type, videoId',
      transcripts: 'videoId'
    });
  }
}

export const db = new EnglishStudioDB();

// Populate with mock data on the initial open if the DB is completely empty
db.on('populate', async () => {
  // Database initialized blank
});
