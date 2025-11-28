export enum AppPhase {
  INTRO = 'INTRO',
  LANDING = 'LANDING',
  LOADING = 'LOADING',
  RESPONSE = 'RESPONSE',
  BROWSER_VIEW = 'BROWSER_VIEW',
  LEADERBOARD = 'LEADERBOARD'
}

export interface DKGResponseData {
  title: string;
  explanation: string;
  sourceHash: string;
  sourceType: 'dkg' | 'ai' | 'error';
  ual?: string;
  explorerUrl?: string;
}

export interface TruthSignals {
  proofScore: number;
  embeddingSimilarity: number;
  fingerprintIntegrity: number;
  publisherCommitment: number;
  paranetCuration: number;
  freshness: number;
}

export interface TruthScoreResult {
  composite: number;
  badges: {
    verifiedFingerprint: boolean;
    highAvailability: boolean;
    paranetCurated: boolean;
  };
}

export interface SearchState {
  query: string;
  isSearching: boolean;
  data: DKGResponseData | null;
  url?: string;
  favicon?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  url?: string;
  query?: string;
  timestamp: number;
  phase: AppPhase;
  favicon?: string;
}

export interface Tab {
  id: string;
  title: string;
  phase: AppPhase;
  searchState: SearchState;
  history: HistoryItem[];
  timestamp: number;
}

export interface UserStats {
  rank: number;
  totalMeters: number;
  totalMetersChange: number;
  topKeits: number;
  activityResponseTime: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  change: number; // positive or negative
  isCurrentUser?: boolean;
}