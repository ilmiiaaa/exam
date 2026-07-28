import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, ChevronLeft, ChevronRight, AlertTriangle, Send, Cloud, HelpCircle, ShieldAlert } from 'lucide-react';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Exam, Submission } from '../types';

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
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Compute submission ID uniquely per student & exam
  const submissionId = useRef(
    `${examToken.toUpperCase()}_${studentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
  ).current;

  const totalDurationSeconds = exam.durationMinutes * 60;
  const [timeLeft, setTimeLeft] = useState<number>(totalDurationSeconds);
  const startTimeRef = useRef<number>(Date.now());
  const isSubmittedRef = useRef<boolean>(false);

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
        if (data.status && data.status !== 'in_progress') {
          isSubmittedRef.current = true;
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
          maxScore: exam.questions.reduce((sum, q) => sum + (q.points || 20), 0),
          percentage: 0,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialSub, { merge: true });
      }
    }, (err) => {
      console.error('Firestore submission sync error:', err);
    });

    return () => unsubscribe();
  }, [submissionId, exam, studentName, schoolName, gradeName, totalDurationSeconds]);

  // Anti-Cheating: Detect Tab Switch or Window Minimize
  useEffect(() => {
    const handleAntiCheat = () => {
      if ((document.hidden || document.visibilityState === 'hidden') && !isSubmittedRef.current) {
        isSubmittedRef.current = true;
        console.warn('Anti-cheat triggered: Tab switched or window minimized.');
        handleSubmitFinal('cheated');
      }
    };

    // Listen for visibility change (tab switch, minimize window)
    document.addEventListener('visibilitychange', handleAntiCheat);

    return () => {
      document.removeEventListener('visibilitychange', handleAntiCheat);
    };
  }, []);

  // Real-time Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remain = Math.max(0, totalDurationSeconds - elapsed);
      setTimeLeft(remain);

      if (remain <= 0 && !isSubmittedRef.current) {
        clearInterval(timer);
        isSubmittedRef.current = true;
        handleAutoSubmitTimeUp();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [totalDurationSeconds]);

  // Handle Option Selection with instant Firestore Sync
  const handleSelectOption = async (questionId: string, optionIndex: number) => {
    const updatedAnswers = { ...answers, [questionId]: optionIndex };
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

  // Grade Exam Automatically
  const calculateFinalGrade = (status: 'submitted' | 'time_up' | 'cheated'): Submission => {
    let earnedScore = 0;
    let maxPoints = 0;

    exam.questions.forEach((q) => {
      const points = q.points || 20;
      maxPoints += points;
      if (answers[q.id] === q.correctAnswer) {
        earnedScore += points;
      }
    });

    const percentage = maxPoints > 0 ? Math.round((earnedScore / maxPoints) * 100) : 0;

    return {
      id: submissionId,
      examToken: exam.token,
      examTitle: exam.title,
      studentName,
      schoolName: schoolName || 'SD NEGERI BANGUNREJO KIDUL 1',
      gradeName: gradeName || 'Kelas 6',
      answers,
      score: earnedScore,
      maxScore: maxPoints,
      percentage,
      status,
      cheatDetected: status === 'cheated',
      startedAt: new Date(startTimeRef.current).toISOString(),
      submittedAt: new Date().toISOString(),
    };
  };

  // Final Submit Handler
  const handleSubmitFinal = async (status: 'submitted' | 'time_up' | 'cheated' = 'submitted') => {
    isSubmittedRef.current = true;
    setSubmitting(true);
    try {
      const finalSubmission = calculateFinalGrade(status);
      const docRef = doc(db, 'submissions', submissionId);
      await setDoc(docRef, finalSubmission, { merge: true });
      onFinishExam(finalSubmission);
    } catch (err) {
      console.error('Submit exam error:', err);
      alert('Gagal mengirim jawaban ke server. Periksa koneksi internet Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmitTimeUp = () => {
    handleSubmitFinal('time_up');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = exam.questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = exam.questions.length;
  const isTimeWarning = timeLeft < 120; // less than 2 minutes

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

            {/* Timer Badge */}
            <div
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-mono font-black text-sm md:text-base shadow-md transition-all ${
                isTimeWarning
                  ? 'bg-rose-600 text-white animate-pulse shadow-rose-900/50 border-b-2 border-rose-800'
                  : 'bg-slate-800 text-indigo-300 border border-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Anti-Cheating Warning Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-bold text-amber-900 flex items-center justify-center space-x-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
        <span>
          <strong>Fitur Anti-Kecurangan Aktif:</strong> Dilarang berpindah tab atau meminimalkan browser. Jika terdeteksi, ujian akan langsung dihentikan dan jawaban dikirim otomatis.
        </span>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Current Question Card */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="card-3d p-5 md:p-7 flex-1 flex flex-col justify-between">
            <div>
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <span className="inline-flex items-center space-x-1.5 text-xs font-black text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-100 shadow-xs">
                  <span>Soal No. {currentIdx + 1}</span>
                  <span className="text-indigo-300">/</span>
                  <span className="text-slate-500">{totalQuestions}</span>
                </span>

                <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                  Bobot: {currentQ?.points || 20} Poin
                </span>
              </div>

              {/* Question Text */}
              <p className="text-base md:text-lg font-extrabold text-slate-900 leading-relaxed mb-6 font-heading">
                {currentQ?.question}
              </p>

              {/* Options Radio List */}
              <div className="space-y-3">
                {currentQ?.options.map((opt, oIdx) => {
                  const isSelected = answers[currentQ.id] === oIdx;
                  const optionLabel = String.fromCharCode(65 + oIdx); // A, B, C, D

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleSelectOption(currentQ.id, oIdx)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between group cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold shadow-[0_4px_14px_rgba(79,70,229,0.15)] translate-x-1'
                          : 'border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start space-x-3.5">
                        <span
                          className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 transition-colors shadow-xs ${
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
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
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
                  onClick={() => setShowConfirmModal(true)}
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
          <div className="card-3d p-5">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between font-heading">
              <span>Navigasi Soal</span>
              <span className="text-indigo-600 font-extrabold">{answeredCount}/{totalQuestions} Terjawab</span>
            </h2>

            {/* Number Palette Grid */}
            <div className="grid grid-cols-5 gap-2.5 mb-5">
              {exam.questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
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
              onClick={() => setShowConfirmModal(true)}
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-3d max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white mx-auto flex items-center justify-center shadow-md border-b-2 border-emerald-700">
              <Send className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 font-heading">Kirim Jawaban Ujian?</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Anda telah menjawab <strong>{answeredCount}</strong> dari <strong>{totalQuestions}</strong> soal.
                {answeredCount < totalQuestions && (
                  <span className="block text-rose-600 font-extrabold mt-1">
                    Masih ada {totalQuestions - answeredCount} soal yang belum terisi!
                  </span>
                )}
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
                disabled={submitting}
                onClick={() => handleSubmitFinal('submitted')}
                className="flex-1 py-3 rounded-2xl btn-3d-emerald text-white text-xs font-black flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
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
    </div>
  );
};
