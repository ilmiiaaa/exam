import React, { useState, useEffect, useRef } from 'react';
import { GameRoom, GamePlayer, GameQuestion } from '../../types/game';
import { submitGameAnswer } from '../../lib/gameService';
import { Flame, Clock, Trophy, CheckCircle2, XCircle, ArrowRight, Zap, Award } from 'lucide-react';
import { GameRaceTrack } from './GameRaceTrack';

interface GamePlayerScreenProps {
  room: GameRoom;
  player: GamePlayer;
  allPlayers: GamePlayer[];
  onFinishGame: () => void;
}

export const GamePlayerScreen: React.FC<GamePlayerScreenProps> = ({
  room,
  player,
  allPlayers,
  onFinishGame,
}) => {
  const currentQIndex = player.currentQuestionIndex || 0;
  const isFinished = player.isFinished || currentQIndex >= room.questions.length;
  const currentQuestion: GameQuestion | undefined = room.questions[currentQIndex];

  // Answer state
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    show: boolean;
    isCorrect: boolean;
    pointsAwarded: number;
  } | null>(null);

  // Time remaining for current question
  const timeLimit = currentQuestion?.timeLimitSeconds || room.settings?.questionTimeLimit || 20;
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Reset timer on new question
  useEffect(() => {
    setTimeLeft(timeLimit);
    questionStartTimeRef.current = Date.now();
    setSelectedAnswer(null);
    setShortAnswerText('');
    setFeedback(null);
    setIsSubmitting(false);
  }, [currentQIndex, timeLimit]);

  // Countdown timer ticker
  useEffect(() => {
    if (isFinished || !currentQuestion || feedback?.show) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQIndex, isFinished, feedback?.show]);

  // Handle timeout (auto submit wrong answer)
  const handleTimeUp = async () => {
    if (isSubmitting || feedback?.show || !currentQuestion) return;
    await handleSubmitAnswer(-1, true);
  };

  const handleSubmitAnswer = async (answerVal: any, isTimeout = false) => {
    if (isSubmitting || feedback?.show || !currentQuestion) return;
    setIsSubmitting(true);

    const timeSpentMs = Date.now() - questionStartTimeRef.current;

    try {
      const result = await submitGameAnswer({
        roomId: room.id,
        playerId: player.id,
        playerName: player.name,
        question: currentQuestion,
        questionIndex: currentQIndex,
        totalQuestions: room.totalQuestions,
        answer: isTimeout ? null : answerVal,
        timeSpentMs,
        currentStreak: player.streak || 0,
        speedBonusEnabled: room.settings?.speedBonus,
        streakMultiplierEnabled: room.settings?.streakMultiplier,
      });

      setFeedback({
        show: true,
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded,
      });

      // Show feedback for 1.5 seconds then proceed
      setTimeout(() => {
        setFeedback(null);
        setIsSubmitting(false);
        if (currentQIndex + 1 >= room.totalQuestions) {
          onFinishGame();
        }
      }, 1400);
    } catch (err) {
      console.error('Error submitting game answer:', err);
      setIsSubmitting(false);
    }
  };

  // If player finished all questions, show Finish Wait Screen
  if (isFinished) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 text-center space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-emerald-400 space-y-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
            🏁
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
            Kamu Telah Menyelesaikan Balapan!
          </h2>
          <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">
            Luar biasa! Skor akhirmu telah tercatat di sirkuit. Menunggu pembalap lain menyelesaikan putaran mereka.
          </p>

          <div className="inline-flex items-center space-x-6 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl">
            <div>
              <div className="text-xs font-bold text-slate-400">Total Skor</div>
              <div className="text-2xl font-black text-indigo-600">{player.score} Pts</div>
            </div>
            <div className="border-r border-slate-200 h-8" />
            <div>
              <div className="text-xs font-bold text-slate-400">Jawaban Benar</div>
              <div className="text-2xl font-black text-emerald-600">{player.correctCount} / {room.totalQuestions}</div>
            </div>
            <div className="border-r border-slate-200 h-8" />
            <div>
              <div className="text-xs font-bold text-slate-400">Streak Tertinggi</div>
              <div className="text-2xl font-black text-orange-500">{player.highestStreak || player.streak || 0}x</div>
            </div>
          </div>
        </div>

        {/* Live track preview while waiting */}
        <GameRaceTrack players={allPlayers} highlightPlayerId={player.id} />
      </div>
    );
  }

  const timerFraction = (timeLeft / timeLimit) * 100;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Top Bar: Progress, Streak, Score */}
      <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
            Soal {currentQIndex + 1} / {room.totalQuestions}
          </span>
          {player.streak >= 2 && (
            <span className="flex items-center space-x-1 bg-orange-100 text-orange-700 font-black text-xs px-2.5 py-1 rounded-full animate-pulse">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>{player.streak}x Beruntun!</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Skor</span>
            <span className="text-lg font-black text-indigo-600">{player.score}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
            {player.avatar || '🏎️'}
          </div>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 5 ? 'bg-red-500 animate-pulse' : timeLeft <= 10 ? 'bg-amber-400' : 'bg-emerald-500'
          }`}
          style={{ width: `${timerFraction}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 relative overflow-hidden">
        {/* Time Left Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1.5 text-xs font-black text-slate-500">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Sisa Waktu: <strong className={timeLeft <= 5 ? 'text-red-500 font-black' : 'text-slate-700'}>{timeLeft}s</strong></span>
          </div>
          <span className="text-xs font-bold text-slate-400">Nilai: {currentQuestion.points} Poin</span>
        </div>

        {/* Question Image (if any) */}
        {currentQuestion.imageUrl && (
          <div className="mb-4 text-center">
            <img
              src={currentQuestion.imageUrl}
              alt="Soal"
              className="max-h-52 mx-auto rounded-2xl object-contain border border-slate-200 shadow-xs"
            />
            {currentQuestion.imageCaption && (
              <p className="text-xs text-slate-400 mt-1 italic">{currentQuestion.imageCaption}</p>
            )}
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug mb-6">
          {currentQuestion.question}
        </h2>

        {/* Interactive Options */}
        {currentQuestion.type === 'short_answer' ? (
          <div className="space-y-3">
            <input
              type="text"
              value={shortAnswerText}
              onChange={(e) => setShortAnswerText(e.target.value)}
              placeholder="Ketik jawaban singkat di sini..."
              disabled={isSubmitting || feedback?.show}
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-300 focus:border-indigo-600 focus:outline-none text-slate-800 font-bold"
            />
            <button
              onClick={() => handleSubmitAnswer(shortAnswerText)}
              disabled={!shortAnswerText.trim() || isSubmitting || feedback?.show}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm cursor-pointer shadow-lg disabled:bg-slate-300"
            >
              Kirim Jawaban
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((opt, idx) => {
              const optionLetters = ['A', 'B', 'C', 'D', 'E'];
              const letter = optionLetters[idx] || `${idx + 1}`;

              // Color accents for Kahoot/Quizizz feel
              const colorSchemes = [
                'border-red-200 hover:border-red-400 hover:bg-red-50/50 text-slate-800',
                'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-800',
                'border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-800',
                'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-800',
              ];
              const scheme = colorSchemes[idx % colorSchemes.length];

              return (
                <button
                  key={idx}
                  onClick={() => handleSubmitAnswer(idx)}
                  disabled={isSubmitting || feedback?.show}
                  className={`p-4 rounded-2xl border-2 text-left flex items-start space-x-3 transition-all cursor-pointer active:scale-98 disabled:opacity-50 ${scheme}`}
                >
                  <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700 shrink-0">
                    {letter}
                  </span>
                  <span className="font-bold text-sm sm:text-base leading-snug pt-0.5">
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Instant Answer Feedback Overlay */}
        {feedback?.show && (
          <div
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-sm transition-all ${
              feedback.isCorrect ? 'bg-emerald-600/95 text-white' : 'bg-red-600/95 text-white'
            }`}
          >
            {feedback.isCorrect ? (
              <div className="text-center space-y-2 animate-bounce">
                <CheckCircle2 className="w-16 h-16 mx-auto text-white drop-shadow" />
                <h3 className="text-2xl sm:text-3xl font-black">BENAR! LUAR BIASA!</h3>
                <p className="text-lg font-black text-amber-200">+{feedback.pointsAwarded} Poin</p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <XCircle className="w-16 h-16 mx-auto text-white drop-shadow" />
                <h3 className="text-2xl sm:text-3xl font-black">KURANG TEPAT!</h3>
                <p className="text-sm font-bold text-red-100">Tetap semangat, lanjutkan ke soal berikutnya!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mini Track showing current race progress */}
      <div className="pt-2">
        <GameRaceTrack players={allPlayers} maxDisplayLanes={4} highlightPlayerId={player.id} />
      </div>
    </div>
  );
};
