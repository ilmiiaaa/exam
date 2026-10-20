import { Question } from '../types';

/**
 * Deterministically shuffles questions for a given student and exam.
 * Using Mulberry32 PRNG with a seed derived from studentName + token.
 * This guarantees:
 * 1. Different students get different randomized question sequences.
 * 2. The same student consistently gets the exact same question order across reloads/reconnects.
 */
export function getShuffledQuestionsForStudent(
  questions: Question[],
  studentName: string,
  token: string
): Question[] {
  if (!questions || questions.length <= 1) return questions;

  const str = `${studentName.trim().toUpperCase()}_${token.trim().toUpperCase()}`;
  let seed = 0;
  for (let i = 0; i < str.length; i++) {
    seed = (seed << 5) - seed + str.charCodeAt(i);
    seed |= 0;
  }
  seed = Math.abs(seed) || 5381;

  function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
