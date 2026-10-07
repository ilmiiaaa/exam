export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index 0-based
  points: number;
  explanation?: string;
}

export interface Exam {
  id: string; // Document ID, usually same as uppercase token
  token: string;
  title: string;
  subject: string;
  durationMinutes: number;
  questions: Question[];
  createdAt: string;
  active: boolean;
  showReviewAfterExam?: boolean; // If false/undefined, student cannot view questions, answers, and explanations
}

export interface Submission {
  id: string;
  examToken: string;
  examTitle: string;
  studentName: string;
  schoolName?: string;
  gradeName?: string;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  score: number;
  maxScore: number;
  percentage: number;
  status: 'in_progress' | 'submitted' | 'time_up' | 'cheated';
  cheatDetected?: boolean;
  cheatCount?: number;
  startedAt: string; // ISO string or timestamp
  submittedAt?: string;
  timeRemainingSeconds?: number;
  shuffledQuestionIds?: string[];
}

export type ParticipantSystemMode = 'umum' | 'terdaftar';

export interface RegisteredStudent {
  id: string;
  name: string;
  school: string;
  grade: string;
  createdAt: string;
}

export interface ParticipantSystemSettings {
  mode: ParticipantSystemMode;
  updatedAt?: string;
}

export interface ResultDisplaySettings {
  showQuestionsReview: boolean; // default false: siswa hanya melihat halaman hasil
  updatedAt?: string;
}
