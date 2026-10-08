import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Send,
  Cloud,
  HelpCircle,
  ShieldAlert,
  AlertCircle,
  ListChecks,
  ToggleLeft,
  GitMerge,
  Type,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Exam, Submission, Question, QuestionType } from '../types';
import { getShuffledQuestionsForStudent } from '../lib/shuffle';

interface ExamScreenProps {
  studentName: string;
  schoolName?: string;
  gradeName?: string;
  examToken: string;
  exam: Exam;
  onFinishExam: (submission: Submission) => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  studentName,
  schoolName,
  gradeName,
  examToken,
  exam,
  onFinishExam,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  const [cheatCount, setCheatCount] = useState<number>(0);
  const cheatCountRef = useRef<number>(0);
  const [showCheatModal, setShowCheatModal] = useState<boolean>(false);

  // Compute submission ID uniquely per student & exam
  const submissionId = useRef(
    `${examToken.toUpperCase()}_${studentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  ).current;

  // Randomize questions uniquely and deterministically for this student
  const rawShuffledQuestions = useRef<Question[]>(
    getShuffledQuestionsForStudent(exam.questions, studentName, examToken)
  ).current;

  // Sanitized questions exposed to student UI - strictly stripped of any answer keys or explanations
  const shuffledQuestions = useRef(
    rawShuffledQuestions.map(q => {
      let randomizedMatchChoices: string[] = [];
      if (q.matchingPairs && q.matchingPairs.length > 0) {
        // Collect matches and sort alphabetically for choice selection
        randomizedMatchChoices = [...q.matchingPairs.map(p => p.match)].sort();
      }

      return {
        id: q.id,
        type: (q.type || 'multiple_choice') as QuestionType,
        question: q.question,
        options: q.options || [],
        points: q.points || 20,
        matchingPairs: q.matchingPairs?.map(p => ({
          id: p.id,
          premise: p.premise,
          match: '', // Stripped from student UI to prevent any answer key exposure
        })),
        matchChoices: randomizedMatchChoices,
        imageUrl: q.imageUrl,
        imageCaption: q.imageCaption,
      };
    })
  ).current;

  const totalDurationSeconds = Math.max(60, (Number(exam.durationMinutes) || 15) * 60);
  const [timeLeft, setTimeLeft] = useState<number>(totalDurationSeconds);
  const startTimeRef = useRef<number>(Date.now());
  const isSubmittedRef = useRef<boolean>(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState<boolean>(false);
  const [showUnansweredModal, setShowUnansweredModal] = useState<boolean>(false);
  const answersRef = useRef<Record<string, any>>(answers);

  // Keep answersRef synced with latest state
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Initialize or Sync session state in Firestore
  useEffect(() => {
    const docRef = doc(db, 'submissions', submissionId);

    // Subscribe to real-time submission doc in Firestore
    const unsubscribe = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Submission;
        if (data.answers) {
          setAnswers(data.answers);
        }
        if (data.cheatCount !== undefined && data.cheatCount > cheatCountRef.current) {
          cheatCountRef.current = data.cheatCount;
          setCheatCount(data.cheatCount);
        }
        if (data.status && data.status !== 'in_progress') {
          isSubmittedRef.current = true;
          onFinishExam(data);
          return;
        }
        if (data.startedAt) {
          const startedMs = new Date(data.startedAt).getTime();
          startTimeRef.current = startedMs;
          const elapsedSecs = Math.floor((Date.now() - startedMs) / 1000);
          const remain = Math.max(0, totalDurationSeconds - elapsedSecs);
          setTimeLeft(remain);
        }
      } else {
        // Create initial submission document
        const initialSub: Partial<Submission> = {
          id: submissionId,
          examToken: exam.token,
          examTitle: exam.title,
          studentName,
          schoolName: schoolName || 'SD NEGERI BANGUNREJO KIDUL 1',
          gradeName: gradeName || 'Kelas 6',
          answers: {},
          score: 0,
          maxScore: shuffledQuestions.reduce((sum, q) => sum + (q.points || 20), 0),
          percentage: 0,
          status: 'in_progress',
          cheatCount: 0,
          startedAt: new Date().toISOString(),
          shuffledQuestionIds: shuffledQuestions.map(q => q.id),
        };
        await setDoc(docRef, initialSub, { merge: true });
      }
    }, (err) => {
      console.error('Firestore submission sync error:', err);
    });

    return () => unsubscribe();
  }, [submissionId, exam, studentName, schoolName, gradeName, totalDurationSeconds, shuffledQuestions, onFinishExam]);

  // Anti-Cheating: Detect Tab Switch or Window Minimize
  useEffect(() => {
    const handleAntiCheat = async () => {
      if ((document.hidden || document.visibilityState === 'hidden') && !isSubmittedRef.current) {
        const newCount = cheatCountRef.current + 1;
        cheatCountRef.current = newCount;
        setCheatCount(newCount);

        console.warn(`Anti-cheat triggered: Tab switched or window minimized. Violation #${newCount}`);

        // Sync cheat count to Firestore immediately
        try {
          const docRef = doc(db, 'submissions', submissionId);
          await updateDoc(docRef, { cheatCount: newCount, cheatDetected: true });
        } catch (err) {
          console.error('Failed to sync cheat count:', err);
        }

        if (newCount > 3) {
          isSubmittedRef.current = true;
          console.warn('Anti-cheat triggered: Exceeded 3 chances. Stopping exam with score 0.');
          handleSubmitFinal('cheated');
        } else {
          setShowCheatModal(true);
        }
      }
    };

    // Listen for visibility change (tab switch, minimize window)
    document.addEventListener('visibilitychange', handleAntiCheat);

    return () => {
      document.removeEventListener('visibilitychange', handleAntiCheat);
    };
  }, [submissionId]);

  // Grade Exam Automatically using latest answers from ref
  const calculateFinalGrade = (status: 'submitted' | 'time_up' | 'cheated'): Submission => {
    const currentAnswers = answersRef.current;
    let earnedScore = 0;
    let maxPoints = 0;

    rawShuffledQuestions.forEach((q) => {
      const points = q.points || 20;
      maxPoints += points;
      const type = (q.type || 'multiple_choice') as QuestionType;
      const studentAns = currentAnswers[q.id];

      if (studentAns !== undefined && studentAns !== null) {
        if (type === 'multiple_choice' || type === 'image_question') {
          if (studentAns === q.correctAnswer) {
            earnedScore += points;
          }
        } else if (type === 'true_false') {
          const expected = q.correctBool ?? (q.correctAnswer === 0);
          if (studentAns === expected) {
            earnedScore += points;
          }
        } else if (type === 'matching') {
          const pairs = q.matchingPairs || [];
          if (pairs.length > 0 && typeof studentAns === 'object') {
            let correctCount = 0;
            pairs.forEach((p) => {
              if (
                studentAns[p.id] &&
                studentAns[p.id].toString().trim().toLowerCase() === p.match.trim().toLowerCase()
              ) {
                correctCount++;
              }
            });
            const ratio = correctCount / pairs.length;
            earnedScore += Math.round(ratio * points);
          }
        } else if (type === 'short_answer') {
          if (typeof studentAns === 'string' && q.correctText) {
            const normalizedStudent = studentAns.trim().toLowerCase();
            const validAlternatives = q.correctText
              .split(/[,;\/]/)
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);

            if (validAlternatives.includes(normalizedStudent)) {
              earnedScore += points;
            }
          }
        }
      }
    });

    if (status === 'cheated') {
      earnedScore = 0;
    }

    const percentage = maxPoints > 0 ? Math.round((earnedScore / maxPoints) * 100) : 0;

    return {
      id: submissionId,
      examToken: exam.token,
      examTitle: exam.title,
      studentName,
      schoolName: schoolName || 'SD NEGERI BANGUNREJO KIDUL 1',
      gradeName: gradeName || 'Kelas 6',
      answers: currentAnswers,
      score: earnedScore,
      maxScore: maxPoints,
      percentage,
      status,
      cheatDetected: status === 'cheated' || cheatCountRef.current > 0,
      cheatCount: cheatCountRef.current,
      startedAt: new Date(startTimeRef.current).toISOString(),
      submittedAt: new Date().toISOString(),
      timeRemainingSeconds: Math.max(0, timeLeft),
      shuffledQuestionIds: shuffledQuestions.map((q) => q.id),
    };
  };

  // Helper to determine if a question has been fully answered
  const isQuestionAnswered = (
    q: (typeof shuffledQuestions)[0],
    currentAnswers: Record<string, any>
  ): boolean => {
    const ans = currentAnswers[q.id];
    if (ans === undefined || ans === null) return false;

    const type = q.type || 'multiple_choice';

    if (type === 'multiple_choice' || type === 'image_question') {
      return typeof ans === 'number' && ans >= 0;
    }
    if (type === 'true_false') {
      return typeof ans === 'boolean';
    }
    if (type === 'matching') {
      if (typeof ans !== 'object' || ans === null) return false;
      const requiredPairs = q.matchingPairs || [];
      if (requiredPairs.length === 0) return true;
      return requiredPairs.every((p) => Boolean(ans[p.id]?.toString().trim()));
    }
    if (type === 'short_answer') {
      return typeof ans === 'string' && ans.trim().length > 0;
    }
    return false;
  };

  // Final Submit Handler
  const handleSubmitFinal = async (status: 'submitted' | 'time_up' | 'cheated' = 'submitted') => {
    // If student manually submits, verify that all questions are answered
    if (status === 'submitted') {
      const currentAnswers = answersRef.current;
      const missing = shuffledQuestions.filter((q) => !isQuestionAnswered(q, currentAnswers));
      if (missing.length > 0) {
        setShowUnansweredModal(true);
        setShowConfirmModal(false);
        return;
      }
    }

    if (isSubmittedRef.current && status !== 'time_up' && status !== 'cheated') {
      return;
    }
    isSubmittedRef.current = true;
    setSubmitting(true);
    if (status === 'time_up') {
      setShowTimeUpModal(true);
    }

    const finalSubmission = calculateFinalGrade(status);

    // CRITICAL RESILIENCE: Save immediately to localStorage so the app STAYS on ResultScreen across any reload/screenshot
    try {
      localStorage.setItem('exam_edu_active_screen', 'result');
      localStorage.setItem('exam_edu_current_submission', JSON.stringify(finalSubmission));
      localStorage.setItem('exam_edu_current_exam', JSON.stringify(exam));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    try {
      const docRef = doc(db, 'submissions', submissionId);
      await setDoc(docRef, finalSubmission, { merge: true });
    } catch (err) {
      console.error('Submit exam error or offline sync:', err);
      // Background retry
      setTimeout(async () => {
        try {
          const docRef = doc(db, 'submissions', submissionId);
          await setDoc(docRef, finalSubmission, { merge: true });
        } catch (e) {
          console.error('Background retry failed:', e);
        }
      }, 2000);
    } finally {
      setSubmitting(false);
      onFinishExam(finalSubmission);
    }
  };

  // Real-time Countdown Timer with Auto-Submit on Zero
  useEffect(() => {
    const updateCountdown = () => {
      if (isSubmittedRef.current) return;

      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remain = Math.max(0, totalDurationSeconds - elapsed);
      setTimeLeft(remain);

      if (remain <= 0) {
        if (!isSubmittedRef.current) {
          isSubmittedRef.current = true;
          setShowTimeUpModal(true);
          handleSubmitFinal('time_up');
        }
      }
    };

    // Run once immediately
    updateCountdown();

    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [totalDurationSeconds]);

  // Handle Answer Selection with instant Firestore Sync
  const handleSetAnswer = async (questionId: string, value: any) => {
    const updatedAnswers = { ...answers, [questionId]: value };
    setAnswers(updatedAnswers);
    setSavingStatus('saving');

    try {
      const docRef = doc(db, 'submissions', submissionId);
      await updateDoc(docRef, {
        answers: updatedAnswers,
        lastUpdated: new Date().toISOString()
      });
      setSavingStatus('saved');
    } catch (err) {
      console.error('Failed to sync answer to Firestore:', err);
      setSavingStatus('error');
    }
  };

  const formatTime = (secs: number) => {
    const clampedSecs = Math.max(0, secs);
    const h = Math.floor(clampedSecs / 3600);
    const m = Math.floor((clampedSecs % 3600) / 60);
    const s = clampedSecs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = shuffledQuestions[currentIdx];
  const totalQuestions = shuffledQuestions.length;
  const unansweredNumbers = shuffledQuestions
    .map((q, idx) => (!isQuestionAnswered(q, answers) ? idx + 1 : null))
    .filter((n): n is number => n !== null);
  const answeredCount = totalQuestions - unansweredNumbers.length;
  const hasUnanswered = unansweredNumbers.length > 0;

  const handleAttemptFinish = () => {
    if (hasUnanswered) {
      setShowUnansweredModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };
  const isTimeCritical = timeLeft > 0 && timeLeft <= 60; // 1 minute remaining
  const isTimeWarning = timeLeft > 60 && timeLeft <= 300; // 5 minutes remaining
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / totalDurationSeconds) * 100));

  return (
    <div className="min-h-screen bg-colorful-light-mesh text-slate-800 flex flex-col font-sans">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-[0_8px_25px_rgba(15,23,42,0.4)] px-4 py-3 border-b border-indigo-900/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 border-b-2 border-indigo-700 flex items-center justify-center font-black text-white text-base shadow-md">
              {exam.subject ? exam.subject.charAt(0) : 'E'}
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold font-heading leading-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {exam.title}
              </h1>
              <div className="flex items-center space-x-2 text-[11px] text-indigo-200 font-semibold">
                <span>Peserta: <strong className="text-white">{studentName}</strong></span>
                <span>&bull;</span>
                <span className="font-mono bg-slate-800/90 px-2 py-0.5 rounded-lg text-amber-300 border border-slate-700">Token: {exam.token}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Real-time Cloud Sync Status Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 shadow-inner">
              <Cloud className={`w-3.5 h-3.5 ${savingStatus === 'saving' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
              <span className="text-[11px] font-bold">
                {savingStatus === 'saving' ? 'Menyimpan...' : savingStatus === 'saved' ? 'Cloud Synced' : 'Error Sync'}
              </span>
            </div>

            {/* Prominent Real-time Countdown Timer Badge */}
            <div
              className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-2xl font-mono shadow-md transition-all ${
                isTimeCritical
                  ? 'bg-rose-600 text-white animate-pulse border-2 border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.6)] scale-105'
                  : isTimeWarning
                  ? 'bg-amber-500/25 text-amber-300 border-2 border-amber-500/60'
                  : 'bg-slate-800 text-indigo-200 border-2 border-slate-700'
              }`}
              title="Hitung Mundur Waktu Ujian"
            >
              <Clock className={`w-4 h-4 shrink-0 ${isTimeCritical ? 'animate-spin text-rose-200' : isTimeWarning ? 'text-amber-300' : 'text-indigo-400'}`} />
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-sans font-bold leading-none text-slate-400 tracking-wider">
                  Sisa Waktu
                </span>
                <span className="text-sm sm:text-base font-black tracking-tight leading-tight">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Visual Time Remaining Progress Bar along Header */}
        <div className="w-full bg-slate-800/90 h-1 overflow-hidden mt-3 rounded-full">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${
              isTimeCritical
                ? 'bg-rose-500 animate-pulse'
                : isTimeWarning
                ? 'bg-amber-400'
                : 'bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Anti-Cheating Warning Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-bold text-amber-900 flex items-center justify-center space-x-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
        <span>
          <strong>Fitur Anti-Kecurangan Aktif:</strong> Dilarang berpindah tab. Diberikan batas 3 kali toleransi. Jika melanggar lebih dari 3x, ujian dihentikan dengan nilai 0.
          {cheatCount > 0 && (
            <span className="ml-2 bg-rose-600 text-white font-black px-2 py-0.5 rounded-md text-[11px] inline-flex items-center space-x-1">
              <span>Pelanggaran: {cheatCount}/3</span>
            </span>
          )}
        </span>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Current Question Card */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div
            key={`exam_card_${currentQ?.id}_${currentIdx}`}
            className="card-3d p-5 md:p-7 flex-1 flex flex-col justify-between select-none"
          >
            <div>
              {/* Question Header with Type Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1.5 text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-xs">
                    <span>Soal No. {currentIdx + 1}</span>
                    <span className="text-indigo-300">/</span>
                    <span className="text-slate-500">{totalQuestions}</span>
                  </span>

                  {/* Type Badge */}
                  {currentQ?.type === 'true_false' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                      <ToggleLeft className="w-3.5 h-3.5 text-purple-600" />
                      <span>Benar / Salah</span>
                    </span>
                  )}
                  {currentQ?.type === 'matching' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <GitMerge className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Menjodohkan</span>
                    </span>
                  )}
                  {currentQ?.type === 'short_answer' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                      <Type className="w-3.5 h-3.5 text-amber-600" />
                      <span>Isian Singkat</span>
                    </span>
                  )}
                  {currentQ?.type === 'image_question' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-pink-100 text-pink-800 border border-pink-200">
                      <ImageIcon className="w-3.5 h-3.5 text-pink-600" />
                      <span>Soal Bergambar</span>
                    </span>
                  )}
                  {(!currentQ?.type || currentQ?.type === 'multiple_choice') && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                      <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pilihan Ganda</span>
                    </span>
                  )}
                </div>

                <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                  Bobot: {currentQ?.points || 20} Poin
                </span>
              </div>

              {/* Optional Image Banner for image_question */}
              {currentQ?.type === 'image_question' && currentQ?.imageUrl && (
                <div className="mb-5 p-2 bg-slate-50 rounded-2xl border-2 border-slate-200/90 flex flex-col items-center justify-center">
                  <img
                    src={currentQ.imageUrl}
                    alt="Visual Soal"
                    className="max-h-64 sm:max-h-72 w-auto max-w-full rounded-xl object-contain shadow-xs border border-slate-200"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60';
                    }}
                  />
                  {currentQ.imageCaption && (
                    <p className="text-[11px] text-slate-500 font-semibold mt-2 italic text-center">
                      {currentQ.imageCaption}
                    </p>
                  )}
                </div>
              )}

              {/* Question Text */}
              <p className="text-base md:text-lg font-extrabold text-slate-900 leading-relaxed mb-6 font-heading">
                {currentQ?.question}
              </p>

              {/* 1. Multiple Choice / 5. Image Question Options */}
              {(!currentQ?.type || currentQ?.type === 'multiple_choice' || currentQ?.type === 'image_question') && (
                <div key={`options_list_${currentQ?.id}`} className="space-y-3">
                  {currentQ?.options.map((opt, oIdx) => {
                    const isSelected = answers[currentQ.id] === oIdx;
                    const optionLabel = String.fromCharCode(65 + oIdx); // A, B, C, D

                    return (
                      <button
                        key={`${currentQ.id}_opt_${oIdx}`}
                        type="button"
                        onClick={() => handleSetAnswer(currentQ.id, oIdx)}
                        className={`w-full text-left p-4 rounded-2xl border-2 flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold shadow-[0_4px_14px_rgba(79,70,229,0.15)] translate-x-1'
                            : 'border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-start space-x-3.5">
                          <span
                            className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 shadow-xs ${
                              isSelected
                                ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white border-b-2 border-indigo-800'
                                : 'bg-white border-2 border-slate-300 text-slate-600 group-hover:border-indigo-400 group-hover:text-indigo-600'
                            }`}
                          >
                            {optionLabel}
                          </span>
                          <span className="text-sm font-bold pt-1 leading-snug">{opt}</span>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                              : 'border-slate-300 group-hover:border-indigo-400'
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. True / False Selection Cards */}
              {currentQ?.type === 'true_false' && (
                <div key={`tf_list_${currentQ?.id}`} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card BENAR */}
                  {(() => {
                    const isBenar = answers[currentQ.id] === true;
                    return (
                      <button
                        type="button"
                        onClick={() => handleSetAnswer(currentQ.id, true)}
                        className={`p-5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                          isBenar
                            ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 font-black shadow-md ring-2 ring-emerald-500/20 translate-y-[-2px]'
                            : 'border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                              isBenar
                                ? 'bg-emerald-600 text-white border-b-2 border-emerald-800'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            <Check className="w-6 h-6 stroke-[3]" />
                          </div>
                          <div className="text-left">
                            <span className="text-base font-black tracking-wide block">BENAR</span>
                            <span className="text-[11px] text-slate-500 font-semibold leading-tight">
                              Pernyataan di atas adalah Benar
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isBenar ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isBenar && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })()}

                  {/* Card SALAH */}
                  {(() => {
                    const isSalah = answers[currentQ.id] === false;
                    return (
                      <button
                        type="button"
                        onClick={() => handleSetAnswer(currentQ.id, false)}
                        className={`p-5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                          isSalah
                            ? 'border-rose-600 bg-rose-50/90 text-rose-950 font-black shadow-md ring-2 ring-rose-500/20 translate-y-[-2px]'
                            : 'border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                              isSalah
                                ? 'bg-rose-600 text-white border-b-2 border-rose-800'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            <X className="w-6 h-6 stroke-[3]" />
                          </div>
                          <div className="text-left">
                            <span className="text-base font-black tracking-wide block">SALAH</span>
                            <span className="text-[11px] text-slate-500 font-semibold leading-tight">
                              Pernyataan di atas adalah Salah
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSalah ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isSalah && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* 3. Matching Questions Interactive UI */}
              {currentQ?.type === 'matching' && (
                <div key={`matching_list_${currentQ?.id}`} className="space-y-3.5">
                  <div className="p-3 bg-indigo-50/90 rounded-2xl border border-indigo-200/70 text-xs font-bold text-indigo-950 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center space-x-2">
                      <GitMerge className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Pasangkan setiap premis di kolom kiri dengan pilihan yang tepat di sebelah kanan:</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-200/80 font-mono text-[11px] font-black text-indigo-900">
                      {
                        Object.keys(answers[currentQ.id] || {}).filter((k) =>
                          Boolean(answers[currentQ.id]?.[k]?.toString().trim())
                        ).length
                      }{' '}
                      / {currentQ.matchingPairs?.length || 0} Terhubung
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {currentQ.matchingPairs?.map((pair, pIdx) => {
                      const selectedMatch = answers[currentQ.id]?.[pair.id] || '';

                      return (
                        <div
                          key={pair.id}
                          className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center space-x-3 sm:max-w-[45%]">
                            <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {pIdx + 1}
                            </span>
                            <span className="text-xs font-extrabold text-slate-800 leading-snug">
                              {pair.premise}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 flex-1 sm:max-w-[52%]">
                            <span className="text-indigo-400 font-black text-xs hidden sm:inline">➜</span>
                            <select
                              value={selectedMatch}
                              onChange={(e) => {
                                const currentMap = { ...(answers[currentQ.id] || {}) };
                                currentMap[pair.id] = e.target.value;
                                handleSetAnswer(currentQ.id, currentMap);
                              }}
                              className={`w-full p-2.5 rounded-xl text-xs font-bold border-2 focus:outline-none transition-colors cursor-pointer ${
                                selectedMatch
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-2xs'
                                  : 'bg-white border-slate-300 text-slate-600 focus:border-indigo-500'
                              }`}
                            >
                              <option value="">-- Pilih Pasangan yang Sesuai --</option>
                              {currentQ.matchChoices?.map((choice, cIdx) => (
                                <option key={cIdx} value={choice}>
                                  {choice}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Short Answer Input UI */}
              {currentQ?.type === 'short_answer' && (
                <div key={`short_ans_${currentQ?.id}`} className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-semibold flex items-center space-x-2">
                    <Type className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Petunjuk:</strong> Ketik jawaban singkat secara langsung di bawah ini. Sistem tidak membedakan huruf besar/kecil.
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => handleSetAnswer(currentQ.id, e.target.value)}
                      placeholder="Ketik jawaban singkat Anda di sini..."
                      className="w-full p-4 pr-24 rounded-2xl border-2 border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white text-sm font-extrabold text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-xs transition-colors"
                    />
                    {typeof answers[currentQ.id] === 'string' && answers[currentQ.id].trim().length > 0 && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-700 text-xs font-black bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                        ✓ Terisi
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Question Controls */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              {currentIdx < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 py-2.5 rounded-xl btn-3d-slate text-white text-xs font-black flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAttemptFinish}
                  className="px-5 py-2.5 rounded-xl btn-3d-emerald text-white text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Jawaban</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Question Grid Navigation & Status */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Real-time Countdown Timer Widget */}
          <div className={`card-3d p-4 border-2 transition-all ${
            isTimeCritical
              ? 'bg-rose-50/95 border-rose-300 shadow-md animate-pulse'
              : isTimeWarning
              ? 'bg-amber-50/90 border-amber-300'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${
                  isTimeCritical
                    ? 'bg-rose-600 text-white'
                    : isTimeWarning
                    ? 'bg-amber-500 text-white'
                    : 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-heading">
                    Sisa Waktu Ujian
                  </span>
                  <span className={`text-2xl font-black font-mono tracking-tight leading-none ${
                    isTimeCritical ? 'text-rose-600' : isTimeWarning ? 'text-amber-700' : 'text-slate-900'
                  }`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                Durasi {exam.durationMinutes || 15}m
              </span>
            </div>

            {/* Time progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2 border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isTimeCritical ? 'bg-rose-600' : isTimeWarning ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-600 to-emerald-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500">
              <span>
                {isTimeCritical ? (
                  <strong className="text-rose-600 animate-pulse">⚠️ Waktu hampir habis!</strong>
                ) : isTimeWarning ? (
                  <strong className="text-amber-600">Kurang dari 5 menit tersisa</strong>
                ) : (
                  'Hitung mundur real-time'
                )}
              </span>
              <span className="text-slate-400">Otomatis kirim jika 00:00</span>
            </div>
          </div>

          <div className="card-3d p-5">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between font-heading">
              <span>Navigasi Soal</span>
              <span className="text-indigo-600 font-extrabold">{answeredCount}/{totalQuestions} Terjawab</span>
            </h2>

            {/* Number Palette Grid */}
            <div className="grid grid-cols-5 gap-2.5 mb-5">
              {shuffledQuestions.map((q, idx) => {
                const isAnswered = isQuestionAnswered(q, answers);
                const isCurrent = currentIdx === idx;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-11 rounded-2xl text-xs font-black flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md border-b-2 border-indigo-800 scale-105'
                        : isAnswered
                        ? 'bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white border-b-2 border-emerald-700 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{idx + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-500">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded-lg bg-indigo-600"></span>
                <span>Soal Sedang Dibuka</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded-lg bg-emerald-500"></span>
                <span>Sudah Dijawab</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded-lg bg-slate-200"></span>
                <span>Belum Dijawab</span>
              </div>
            </div>

            {/* Finish Exam Button */}
            <button
              type="button"
              onClick={handleAttemptFinish}
              className="w-full mt-5 py-3.5 px-4 btn-3d-emerald text-white font-black text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Selesaikan & Kirim Ujian</span>
            </button>
          </div>

          {/* Quick Real-time Info Banner */}
          <div className="bg-gradient-to-r from-indigo-50 to-sky-50 rounded-2xl border border-indigo-100 p-4 text-xs text-indigo-900 flex items-start space-x-3 shadow-xs">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-semibold">
              Jawaban Anda disimpan secara real-time ke cloud. Jika terputus atau ter-refresh, jawaban & sisa waktu otomatis pulih.
            </p>
          </div>
        </div>
      </main>

      {/* Confirmation Modal (Only accessible when all questions are answered) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-3d max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white mx-auto flex items-center justify-center shadow-md border-b-2 border-emerald-700">
              <Send className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">Kirim Jawaban Ujian?</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Semua <strong>{totalQuestions}</strong> soal telah Anda jawab dengan lengkap.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting || hasUnanswered}
                onClick={() => handleSubmitFinal('submitted')}
                className="flex-1 py-3 rounded-2xl btn-3d-emerald text-white text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Ya, Selesaikan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unanswered Questions Blocking Modal */}
      {showUnansweredModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="card-3d max-w-md w-full p-6 text-center space-y-4 bg-white border-2 border-rose-300 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white mx-auto flex items-center justify-center shadow-md border-b-2 border-rose-700">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 mb-2 border border-rose-200">
                Pemeriksaan Kelengkapan Soal
              </span>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Jawaban Belum Lengkap!
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2">
                Jawaban <strong className="text-rose-600">tidak bisa dikirim</strong> karena masih ada{' '}
                <strong className="text-rose-600">{unansweredNumbers.length} soal</strong> yang belum Anda kerjakan.
              </p>

              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left">
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-2 font-heading">
                  Daftar Nomor Soal yang Belum Terisi:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {unansweredNumbers.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                        setShowUnansweredModal(false);
                        setCurrentIdx(num - 1);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 font-black text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                      title={`Klik untuk langsung mengerjakan nomor ${num}`}
                    >
                      No. {num}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-semibold mt-2">
                  *Klik salah satu nomor di atas untuk langsung menuju soal tersebut.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                setShowUnansweredModal(false);
                if (unansweredNumbers.length > 0) {
                  setCurrentIdx(unansweredNumbers[0] - 1);
                }
              }}
              className="w-full py-3.5 px-4 btn-3d-indigo text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>Lengkapi Sekarang (Menuju Soal No. {unansweredNumbers[0]})</span>
            </button>
          </div>
        </div>
      )}

      {/* Anti-Cheating Warning Modal for Tolerances (1 to 3) */}
      {showCheatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="card-3d max-w-sm w-full p-6 text-center space-y-4 bg-white border-2 border-rose-200 shadow-2xl relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white mx-auto flex items-center justify-center shadow-lg border-b-2 border-rose-800 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 mb-2 border border-rose-200">
                Peringatan Kecurangan ({cheatCount}/3)
              </span>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Terdeteksi Berpindah Layar!
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2">
                Sistem mendeteksi Anda meninggalkan atau berpindah dari tab ujian.{' '}
                <strong>Kesempatan tersisa: {Math.max(0, 3 - cheatCount)}x lagi.</strong>
              </p>
              <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] font-bold text-left">
                ⚠️ PERHATIAN: Jika melanggar lebih dari 3 kali (mencapai batas toleransi), ujian akan dihentikan secara otomatis dan nilai Anda menjadi 0.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCheatModal(false)}
              className="w-full py-3.5 px-4 btn-3d-indigo text-white text-xs font-black rounded-2xl shadow-md transition-all cursor-pointer"
            >
              Saya Mengerti & Lanjutkan Ujian
            </button>
          </div>
        </div>
      )}

      {/* Time's Up Auto-Submit Modal */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="card-3d max-w-sm w-full p-6 text-center space-y-4 bg-white border-2 border-rose-300 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white mx-auto flex items-center justify-center shadow-lg border-b-2 border-rose-800 animate-bounce">
              <Clock className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 mb-2 border border-rose-200">
                Waktu Ujian Berakhir
              </span>
              <h3 className="text-xl font-black text-slate-900 font-heading">
                Waktu Ujian Telah Habis!
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2">
                Batas waktu pengerjaan telah mencapai <strong>00:00</strong>. Sistem sedang memproses dan mengumpulkan seluruh jawaban Anda secara otomatis ke server...
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center space-x-2 text-xs font-bold text-indigo-700">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Mengirim & Menilai Jawaban Otomatis...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
