export type QuestionType =
  | 'multiple_choice' // 1. Pilihan Ganda
  | 'true_false'      // 2. Benar / Salah
  | 'matching'        // 3. Menjodohkan
  | 'short_answer'    // 4. Isian Singkat
  | 'image_question'; // 5. Soal Bergambar

export interface MatchingPair {
  id: string;
  premise: string; // Pertanyaan / Premis sebelah kiri (e.g., Ibu Kota Indonesia)
  match: string;   // Pasangan yang benar sebelah kanan (e.g., Nusantara)
}

export interface Question {
  id: string;
  type?: QuestionType; // Default: 'multiple_choice'
  question: string;
  points: number;
  explanation?: string;

  // 1. Pilihan Ganda & 5. Soal Bergambar
  options?: string[];
  correctAnswer?: number; // Index 0-based

  // 2. Benar / Salah
  correctBool?: boolean; // true = BENAR, false = SALAH

  // 3. Menjodohkan
  matchingPairs?: MatchingPair[];

  // 4. Isian Singkat
  correctText?: string; // Kunci jawaban teks singkat (case-insensitive & whitespace trimmed)

  // 5. Soal Bergambar
  imageUrl?: string;
  imageCaption?: string;
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
  allowedQuestionTypes?: QuestionType[]; // Opsi dalam 1 paket soal: 1 atau lebih jenis daftar soal
}

export interface Submission {
  id: string;
  examToken: string;
  examTitle: string;
  studentName: string;
  schoolName?: string;
  gradeName?: string;
  answers: Record<string, any>; // questionId -> selectedOptionIndex | boolean | matchingPairsMap | string
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
