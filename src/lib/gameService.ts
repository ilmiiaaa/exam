import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  GameRoom,
  GamePlayer,
  GameQuestion,
  GameAnswer,
  GameResult,
  GameLeaderboardEntry,
  GameRoomStatus,
} from '../types/game';
import { Exam } from '../types';
import {
  generateRoomPin,
  mapExamQuestionsToGameQuestions,
  calculateGameScore,
  AVATAR_OPTIONS,
  VEHICLE_OPTIONS,
  sanitizeForFirestore,
} from './gameAdapter';

/**
 * Creates a new Game Room in Firestore under `gameRooms` collection
 */
export async function createGameRoom(params: {
  exam: Exam;
  hostName: string;
  title?: string;
  questionTimeLimit?: number;
  speedBonus?: boolean;
  streakMultiplier?: boolean;
  theme?: 'racing' | 'space' | 'safari';
}): Promise<GameRoom> {
  const {
    exam,
    hostName,
    title,
    questionTimeLimit = 20,
    speedBonus = true,
    streakMultiplier = true,
    theme = 'racing',
  } = params;

  let roomId = generateRoomPin();
  let roomRef = doc(db, 'gameRooms', roomId);

  // Ensure unique PIN (check existence)
  let existing = await getDoc(roomRef);
  let attempts = 0;
  while (existing.exists() && attempts < 5) {
    roomId = generateRoomPin();
    roomRef = doc(db, 'gameRooms', roomId);
    existing = await getDoc(roomRef);
    attempts++;
  }

  const questions: GameQuestion[] = mapExamQuestionsToGameQuestions(exam, {
    questionTimeLimit,
    speedBonus,
    streakMultiplier,
  });

  const roomData: GameRoom = {
    id: roomId,
    title: title ? title.trim() : `Game Race - ${exam.title}`,
    examToken: exam.token,
    examTitle: exam.title,
    hostName: hostName || 'Guru Pengawas',
    status: 'waiting',
    currentQuestionIndex: 0,
    totalQuestions: questions.length,
    questions,
    playerCount: 0,
    createdAt: new Date().toISOString(),
    settings: {
      questionTimeLimit,
      speedBonus,
      streakMultiplier,
      shuffleQuestions: false,
      shuffleOptions: false,
      theme: 'racing',
    },
  };

  await setDoc(roomRef, sanitizeForFirestore(roomData));
  return roomData;
}

/**
 * Real-time listener for a specific Game Room
 */
export function listenToGameRoom(roomId: string, callback: (room: GameRoom | null) => void) {
  const roomRef = doc(db, 'gameRooms', roomId);
  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as GameRoom);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error('Error listening to game room:', err);
      callback(null);
    }
  );
}

/**
 * Joins a player into a game room
 */
export async function joinGameRoom(params: {
  roomId: string;
  playerId: string;
  name: string;
  school?: string;
  grade?: string;
  avatar?: string;
  vehicleType?: any;
}): Promise<GamePlayer> {
  const { roomId, playerId, name, school = '', grade = '', avatar, vehicleType } = params;

  const roomRef = doc(db, 'gameRooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) {
    throw new Error('Kode PIN Game Race tidak ditemukan!');
  }

  const room = roomSnap.data() as GameRoom;
  if (room.status === 'finished' || room.status === 'abandoned') {
    throw new Error('Sesi Game Race ini sudah berakhir.');
  }

  const randomVehicle = VEHICLE_OPTIONS[Math.floor(Math.random() * VEHICLE_OPTIONS.length)];
  const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];

  const playerRef = doc(db, 'gameRooms', roomId, 'players', playerId);
  const playerSnap = await getDoc(playerRef);

  let playerData: GamePlayer;

  if (playerSnap.exists()) {
    // Rejoin existing player in room
    playerData = { ...playerSnap.data(), lastActiveAt: new Date().toISOString() } as GamePlayer;
    await updateDoc(playerRef, { lastActiveAt: new Date().toISOString() });
  } else {
    playerData = {
      id: playerId,
      roomId,
      name: name.trim().toUpperCase(),
      school,
      grade,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      streak: 0,
      highestStreak: 0,
      progress: 0,
      currentQuestionIndex: 0,
      isFinished: false,
      avatar: avatar || randomAvatar,
      color: randomVehicle.color,
      vehicle: vehicleType || randomVehicle.type,
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    await setDoc(playerRef, sanitizeForFirestore(playerData));

    // Increment player count in room
    await updateDoc(roomRef, {
      playerCount: (room.playerCount || 0) + 1,
    });
  }

  return playerData;
}

/**
 * Real-time listener for players in a room
 */
export function listenToGamePlayers(roomId: string, callback: (players: GamePlayer[]) => void) {
  const playersRef = collection(db, 'gameRooms', roomId, 'players');
  return onSnapshot(
    playersRef,
    (snapshot) => {
      const list: GamePlayer[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as GamePlayer);
      });
      // Sort by score desc, then progress desc
      list.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.progress - a.progress;
      });
      callback(list);
    },
    (err) => {
      console.error('Error listening to game players:', err);
      callback([]);
    }
  );
}

/**
 * Host updates game room status (e.g. from 'waiting' to 'in_progress' or 'finished')
 */
export async function updateGameRoomStatus(roomId: string, status: GameRoomStatus) {
  const roomRef = doc(db, 'gameRooms', roomId);
  const updatePayload: Partial<GameRoom> = { status };
  if (status === 'in_progress') {
    updatePayload.startedAt = new Date().toISOString();
  } else if (status === 'finished') {
    updatePayload.finishedAt = new Date().toISOString();
  }
  await updateDoc(roomRef, updatePayload);
}

/**
 * Player submits an answer for a question
 */
export async function submitGameAnswer(params: {
  roomId: string;
  playerId: string;
  playerName: string;
  question: GameQuestion;
  questionIndex: number;
  totalQuestions: number;
  answer: any;
  timeSpentMs: number;
  currentStreak: number;
  speedBonusEnabled?: boolean;
  streakMultiplierEnabled?: boolean;
}): Promise<{ isCorrect: boolean; pointsAwarded: number; newStreak: number; newProgress: number }> {
  const {
    roomId,
    playerId,
    playerName,
    question,
    questionIndex,
    totalQuestions,
    answer,
    timeSpentMs,
    currentStreak,
    speedBonusEnabled,
    streakMultiplierEnabled,
  } = params;

  // Determine correctness
  let isCorrect = false;
  if (question.type === 'multiple_choice' || question.type === 'image_question') {
    isCorrect = Number(answer) === question.correctAnswerIndex;
  } else if (question.type === 'true_false') {
    isCorrect = Boolean(answer) === question.correctBool;
  } else if (question.type === 'short_answer') {
    const cleanAnswer = String(answer || '').trim().toLowerCase();
    const cleanKey = String(question.correctText || '').trim().toLowerCase();
    isCorrect = cleanAnswer.length > 0 && cleanAnswer === cleanKey;
  } else {
    // Default fallback
    isCorrect = Boolean(answer);
  }

  const newStreak = isCorrect ? currentStreak + 1 : 0;
  const pointsAwarded = calculateGameScore({
    isCorrect,
    basePoints: question.points || 100,
    timeSpentMs,
    timeLimitSeconds: question.timeLimitSeconds,
    currentStreak: newStreak,
    speedBonusEnabled,
    streakBonusEnabled: streakMultiplierEnabled,
  });

  const nextIndex = questionIndex + 1;
  const isFinished = nextIndex >= totalQuestions;
  const newProgress = Math.min(100, Math.round((nextIndex / totalQuestions) * 100));

  // Save answer doc in subcollection `gameRooms/{roomId}/answers`
  const answerDocRef = doc(collection(db, 'gameRooms', roomId, 'answers'));
  const answerRecord: GameAnswer = {
    id: answerDocRef.id,
    roomId,
    playerId,
    playerName,
    questionId: question.id,
    questionIndex,
    answer,
    isCorrect,
    timeSpentMs,
    pointsAwarded,
    answeredAt: new Date().toISOString(),
  };
  await setDoc(answerDocRef, sanitizeForFirestore(answerRecord));

  // Update player doc
  const playerRef = doc(db, 'gameRooms', roomId, 'players', playerId);
  const playerSnap = await getDoc(playerRef);

  if (playerSnap.exists()) {
    const cur = playerSnap.data() as GamePlayer;
    const updatedScore = (cur.score || 0) + pointsAwarded;
    const updatedCorrect = (cur.correctCount || 0) + (isCorrect ? 1 : 0);
    const updatedWrong = (cur.wrongCount || 0) + (isCorrect ? 0 : 1);
    const updatedHighestStreak = Math.max(cur.highestStreak || 0, newStreak);

    await updateDoc(
      playerRef,
      sanitizeForFirestore({
        score: updatedScore,
        correctCount: updatedCorrect,
        wrongCount: updatedWrong,
        streak: newStreak,
        highestStreak: updatedHighestStreak,
        progress: newProgress,
        currentQuestionIndex: nextIndex,
        isFinished,
        lastAnswerCorrect: isCorrect,
        lastAnswerTimeMs: timeSpentMs,
        lastActiveAt: new Date().toISOString(),
      })
    );
  }

  return { isCorrect, pointsAwarded, newStreak, newProgress };
}

/**
 * Saves completed game room results to `gameResults` collection for permanent leaderboard review
 */
export async function finalizeGameResults(roomId: string): Promise<GameResult> {
  const roomRef = doc(db, 'gameRooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) throw new Error('Ruang game tidak ditemukan');

  const room = roomSnap.data() as GameRoom;
  const playersSnap = await getDocs(collection(db, 'gameRooms', roomId, 'players'));

  const players: GamePlayer[] = [];
  playersSnap.forEach((d) => players.push({ id: d.id, ...d.data() } as GamePlayer));

  // Sort players for leaderboard
  players.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.progress - a.progress;
  });

  const leaderboard: GameLeaderboardEntry[] = players.map((p, index) => ({
    rank: index + 1,
    playerId: p.id,
    name: p.name,
    school: p.school,
    grade: p.grade,
    score: p.score,
    correctCount: p.correctCount,
    progress: p.progress,
    avatar: p.avatar,
    color: p.color,
    vehicle: p.vehicle,
  }));

  const gameResult: GameResult = {
    id: roomId,
    roomId,
    roomTitle: room.title,
    examToken: room.examToken,
    examTitle: room.examTitle,
    hostName: room.hostName,
    createdAt: room.createdAt,
    finishedAt: new Date().toISOString(),
    totalQuestions: room.totalQuestions,
    totalPlayers: players.length,
    leaderboard,
  };

  await setDoc(doc(db, 'gameResults', roomId), sanitizeForFirestore(gameResult));
  await updateDoc(roomRef, { status: 'finished', finishedAt: gameResult.finishedAt });

  return gameResult;
}

/**
 * Listen to active & recent game rooms for host/teacher
 */
export function listenToActiveGameRooms(callback: (rooms: GameRoom[]) => void) {
  const qRooms = query(collection(db, 'gameRooms'), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(
    qRooms,
    (snapshot) => {
      const rooms: GameRoom[] = [];
      snapshot.forEach((d) => {
        rooms.push({ id: d.id, ...d.data() } as GameRoom);
      });
      callback(rooms);
    },
    (err) => {
      console.warn('Note on fetching game rooms:', err);
      callback([]);
    }
  );
}

/**
 * Get a single game room by ID
 */
export async function getGameRoom(roomId: string): Promise<GameRoom | null> {
  const roomSnap = await getDoc(doc(db, 'gameRooms', roomId));
  if (roomSnap.exists()) {
    return { id: roomSnap.id, ...roomSnap.data() } as GameRoom;
  }
  return null;
}

/**
 * Update an existing game room (Title, Settings, Status)
 */
export async function updateGameRoom(
  roomId: string,
  updates: Partial<GameRoom>
): Promise<void> {
  const roomRef = doc(db, 'gameRooms', roomId);
  await updateDoc(roomRef, sanitizeForFirestore(updates));
}

/**
 * Reset a game room so students can replay the race
 * Resets status to 'waiting', question index to 0, resets all player scores/progress,
 * and clears old answers.
 */
export async function resetGameRoom(roomId: string): Promise<void> {
  const roomRef = doc(db, 'gameRooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) throw new Error('Ruang game tidak ditemukan');

  // Reset room document
  await updateDoc(roomRef, {
    status: 'waiting',
    currentQuestionIndex: 0,
    startedAt: null,
    finishedAt: null,
  });

  // Reset all players in room
  const playersSnap = await getDocs(collection(db, 'gameRooms', roomId, 'players'));
  const resetPlayerPromises = playersSnap.docs.map((pDoc) =>
    updateDoc(doc(db, 'gameRooms', roomId, 'players', pDoc.id), {
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      streak: 0,
      highestStreak: 0,
      progress: 0,
      currentQuestionIndex: 0,
      isFinished: false,
      lastAnswerCorrect: null,
      lastAnswerTimeMs: null,
      lastActiveAt: new Date().toISOString(),
    })
  );
  await Promise.all(resetPlayerPromises);

  // Clear answers in room
  const answersSnap = await getDocs(collection(db, 'gameRooms', roomId, 'answers'));
  const deleteAnswerPromises = answersSnap.docs.map((aDoc) =>
    deleteDoc(doc(db, 'gameRooms', roomId, 'answers', aDoc.id))
  );
  await Promise.all(deleteAnswerPromises);
}

/**
 * Delete a game room and all its subcollections (players, answers) and results
 */
export async function deleteGameRoom(roomId: string): Promise<void> {
  // 1. Delete players subcollection
  try {
    const playersSnap = await getDocs(collection(db, 'gameRooms', roomId, 'players'));
    const deletePlayers = playersSnap.docs.map((d) =>
      deleteDoc(doc(db, 'gameRooms', roomId, 'players', d.id))
    );
    await Promise.all(deletePlayers);
  } catch (e) {
    console.warn('Delete players note:', e);
  }

  // 2. Delete answers subcollection
  try {
    const answersSnap = await getDocs(collection(db, 'gameRooms', roomId, 'answers'));
    const deleteAnswers = answersSnap.docs.map((d) =>
      deleteDoc(doc(db, 'gameRooms', roomId, 'answers', d.id))
    );
    await Promise.all(deleteAnswers);
  } catch (e) {
    console.warn('Delete answers note:', e);
  }

  // 3. Delete room document
  await deleteDoc(doc(db, 'gameRooms', roomId));

  // 4. Optionally delete gameResults
  try {
    await deleteDoc(doc(db, 'gameResults', roomId));
  } catch (e) {}
}

/**
 * Bulk delete finished or abandoned game rooms
 */
export async function bulkDeleteFinishedRooms(): Promise<number> {
  const roomsSnap = await getDocs(collection(db, 'gameRooms'));
  let deletedCount = 0;

  for (const roomDoc of roomsSnap.docs) {
    const data = roomDoc.data();
    if (data.status === 'finished' || data.status === 'abandoned') {
      await deleteGameRoom(roomDoc.id);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Duplicate / Clone an existing game room with a new unique PIN
 */
export async function duplicateGameRoom(sourceRoomId: string, hostName?: string): Promise<GameRoom> {
  const source = await getGameRoom(sourceRoomId);
  if (!source) throw new Error('Ruang sumber tidak ditemukan');

  let newRoomId = generateRoomPin();
  let roomRef = doc(db, 'gameRooms', newRoomId);
  let existing = await getDoc(roomRef);
  let attempts = 0;
  while (existing.exists() && attempts < 5) {
    newRoomId = generateRoomPin();
    roomRef = doc(db, 'gameRooms', newRoomId);
    existing = await getDoc(roomRef);
    attempts++;
  }

  const duplicatedRoom: GameRoom = {
    ...source,
    id: newRoomId,
    title: `${source.title} (Salinan)`,
    status: 'waiting',
    playerCount: 0,
    currentQuestionIndex: 0,
    createdAt: new Date().toISOString(),
    startedAt: undefined,
    finishedAt: undefined,
    hostName: hostName || source.hostName,
  };

  await setDoc(roomRef, sanitizeForFirestore(duplicatedRoom));
  return duplicatedRoom;
}

/**
 * Update a specific question in a game room
 */
export async function updateGameRoomQuestion(
  roomId: string,
  questionIndex: number,
  updatedQuestion: GameQuestion
): Promise<void> {
  const room = await getGameRoom(roomId);
  if (!room) throw new Error('Ruang game tidak ditemukan');

  const questions = [...room.questions];
  if (questionIndex < 0 || questionIndex >= questions.length) {
    throw new Error('Index soal tidak valid');
  }

  questions[questionIndex] = updatedQuestion;
  await updateGameRoom(roomId, { questions, totalQuestions: questions.length });
}

/**
 * Add a new question to a game room
 */
export async function addGameRoomQuestion(
  roomId: string,
  newQuestion: GameQuestion
): Promise<void> {
  const room = await getGameRoom(roomId);
  if (!room) throw new Error('Ruang game tidak ditemukan');

  const questions = [...(room.questions || []), newQuestion];
  await updateGameRoom(roomId, { questions, totalQuestions: questions.length });
}

/**
 * Delete a question from a game room
 */
export async function deleteGameRoomQuestion(
  roomId: string,
  questionIndex: number
): Promise<void> {
  const room = await getGameRoom(roomId);
  if (!room) throw new Error('Ruang game tidak ditemukan');

  const questions = room.questions.filter((_, idx) => idx !== questionIndex);
  if (questions.length === 0) {
    throw new Error('Ruang game minimal harus memiliki 1 butir soal!');
  }

  await updateGameRoom(roomId, { questions, totalQuestions: questions.length });
}

/**
 * Reorder questions in a game room
 */
export async function reorderGameRoomQuestions(
  roomId: string,
  newQuestions: GameQuestion[]
): Promise<void> {
  await updateGameRoom(roomId, { questions: newQuestions, totalQuestions: newQuestions.length });
}

/**
 * Kick / remove a player from a waiting game room
 */
export async function kickPlayerFromRoom(roomId: string, playerId: string): Promise<void> {
  const playerRef = doc(db, 'gameRooms', roomId, 'players', playerId);
  await deleteDoc(playerRef);

  const room = await getGameRoom(roomId);
  if (room && (room.playerCount || 0) > 0) {
    await updateGameRoom(roomId, { playerCount: Math.max(0, (room.playerCount || 1) - 1) });
  }
}

