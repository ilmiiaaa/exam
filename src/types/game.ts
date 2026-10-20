import type { QuestionType } from '../types';

export type GameRoomStatus = 'waiting' | 'starting' | 'in_progress' | 'finished' | 'abandoned';

export type RaceVehicleType = 'car_red' | 'car_blue' | 'car_yellow' | 'car_green' | 'car_purple' | 'runner' | 'rocket';

export interface GamePlayer {
  id: string; // unique ID within room (e.g. random or auth uid)
  roomId: string;
  name: string;
  school?: string;
  grade?: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  streak: number;
  highestStreak: number;
  progress: number; // 0 to 100 (%)
  currentQuestionIndex: number;
  isFinished: boolean;
  avatar: string; // emoji or avatar icon identifier
  color: string; // hex or tailwind color class
  vehicle: RaceVehicleType;
  lastAnswerCorrect?: boolean;
  lastAnswerTimeMs?: number;
  joinedAt: string;
  lastActiveAt?: string;
}

export interface GameQuestion {
  id: string;
  originalQuestionId: string;
  type: QuestionType;
  question: string;
  imageUrl?: string;
  imageCaption?: string;
  options: string[];
  correctAnswerIndex?: number;
  correctBool?: boolean;
  correctText?: string;
  matchingPairs?: Array<{ id: string; premise: string; match: string }>;
  points: number;
  timeLimitSeconds: number;
  explanation?: string;
}

export interface GameRoomSettings {
  questionTimeLimit: number; // in seconds (default 15-20)
  speedBonus: boolean; // bonus points for faster answers
  streakMultiplier: boolean; // 1.1x, 1.2x for consecutive correct
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  theme: 'racing' | 'space' | 'safari';
}

export interface GameRoom {
  id: string; // 6-digit PIN (e.g. "829415")
  title: string;
  examToken: string;
  examTitle: string;
  hostName: string;
  status: GameRoomStatus;
  currentQuestionIndex: number; // for host-controlled or global sync
  totalQuestions: number;
  questions: GameQuestion[];
  playerCount: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  settings: GameRoomSettings;
}

export interface GameAnswer {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  questionId: string;
  questionIndex: number;
  answer: any;
  isCorrect: boolean;
  timeSpentMs: number;
  pointsAwarded: number;
  answeredAt: string;
}

export interface GameLeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  school?: string;
  grade?: string;
  score: number;
  correctCount: number;
  progress: number;
  avatar: string;
  color: string;
  vehicle: RaceVehicleType;
}

export interface GameResult {
  id: string;
  roomId: string;
  roomTitle: string;
  examToken: string;
  examTitle: string;
  hostName: string;
  createdAt: string;
  finishedAt: string;
  totalQuestions: number;
  totalPlayers: number;
  leaderboard: GameLeaderboardEntry[];
}
