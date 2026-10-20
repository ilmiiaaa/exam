import { Exam, Question } from '../types';
import { GameQuestion, GamePlayer, RaceVehicleType, GameRoomSettings } from '../types/game';

export const VEHICLE_OPTIONS: Array<{ type: RaceVehicleType; label: string; emoji: string; color: string }> = [
  { type: 'car_red', label: 'Mobil Balap Merah', emoji: '🏎️', color: '#EF4444' },
  { type: 'car_blue', label: 'Mobil Balap Biru', emoji: '🚙', color: '#3B82F6' },
  { type: 'car_yellow', label: 'Mobil Balap Kuning', emoji: '🚕', color: '#EAB308' },
  { type: 'car_green', label: 'Mobil Balap Hijau', emoji: '🚗', color: '#10B981' },
  { type: 'car_purple', label: 'Mobil Balap Ungu', emoji: '🛞', color: '#8B5CF6' },
  { type: 'runner', label: 'Pelari Cepat', emoji: '🏃', color: '#F97316' },
  { type: 'rocket', label: 'Roket Turbo', emoji: '🚀', color: '#EC4899' },
];

export const AVATAR_OPTIONS = ['🐯', '🦁', '🦊', '🐼', '🐵', '🦄', '🦅', '🐬', '🤖', '⚡'];

/**
 * Generate a clean 6-digit room PIN
 */
export function generateRoomPin(): string {
  const min = 100000;
  const max = 999999;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Maps standard Exam questions to Game questions without modifying original data.
 * Questions are formatted for fast-paced game interactivity.
 */
export function mapExamQuestionsToGameQuestions(
  exam: Exam,
  settings?: Partial<GameRoomSettings>
): GameQuestion[] {
  if (!exam || !exam.questions || exam.questions.length === 0) {
    return [];
  }

  const defaultLimit = settings?.questionTimeLimit || 20;

  return exam.questions.map((q: Question, idx: number) => {
    const qType = q.type || 'multiple_choice';

    let options: string[] = [];
    let correctAnswerIndex: number | undefined = undefined;

    if (qType === 'multiple_choice' || qType === 'image_question') {
      options = Array.isArray(q.options) ? [...q.options] : [];
      correctAnswerIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
    } else if (qType === 'true_false') {
      options = ['BENAR', 'SALAH'];
      correctAnswerIndex = q.correctBool === false ? 1 : 0;
    } else if (qType === 'short_answer') {
      options = []; // Players can type or quick fill
    } else if (qType === 'matching') {
      // For matching, we provide options based on the matches
      options = q.matchingPairs ? q.matchingPairs.map((p) => p.match) : [];
    }

    const gq: GameQuestion = {
      id: `gq_${q.id || idx}_${Date.now()}`,
      originalQuestionId: q.id || `q_${idx}`,
      type: qType,
      question: q.question || 'Pertanyaan tanpa teks',
      options,
      points: q.points > 0 ? q.points : 100,
      timeLimitSeconds: defaultLimit,
    };

    if (q.imageUrl) gq.imageUrl = q.imageUrl;
    if (q.imageCaption) gq.imageCaption = q.imageCaption;
    if (typeof correctAnswerIndex === 'number') gq.correctAnswerIndex = correctAnswerIndex;
    if (typeof q.correctBool === 'boolean') gq.correctBool = q.correctBool;
    if (typeof q.correctText === 'string') gq.correctText = q.correctText;
    if (Array.isArray(q.matchingPairs)) gq.matchingPairs = [...q.matchingPairs];
    if (q.explanation) gq.explanation = q.explanation;

    return gq;
  });
}

/**
 * Recursively removes all undefined fields from an object or array
 * so that Firestore setDoc() or updateDoc() does not throw an Unsupported field value error.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  }
  return data;
}

/**
 * Calculates score awarded for an answer based on speed and streak
 */
export function calculateGameScore(params: {
  isCorrect: boolean;
  basePoints: number;
  timeSpentMs: number;
  timeLimitSeconds: number;
  currentStreak: number;
  speedBonusEnabled?: boolean;
  streakBonusEnabled?: boolean;
}): number {
  const {
    isCorrect,
    basePoints,
    timeSpentMs,
    timeLimitSeconds,
    currentStreak,
    speedBonusEnabled = true,
    streakBonusEnabled = true,
  } = params;

  if (!isCorrect) return 0;

  let total = basePoints || 100;

  // Speed Bonus: Up to +50 points if answered in first half of time limit
  if (speedBonusEnabled) {
    const totalTimeMs = timeLimitSeconds * 1000;
    const timeRemainingFraction = Math.max(0, (totalTimeMs - timeSpentMs) / totalTimeMs);
    const speedBonus = Math.round(timeRemainingFraction * 50);
    total += speedBonus;
  }

  // Streak Multiplier: +10 points per streak level (max +50)
  if (streakBonusEnabled && currentStreak > 1) {
    const streakBonus = Math.min((currentStreak - 1) * 10, 50);
    total += streakBonus;
  }

  return total;
}
