import React, { useMemo, useState, useEffect } from 'react';
import { Trophy, CheckCircle2, XCircle, ArrowLeft, RotateCcw, BookOpen, Award, Check, X, ShieldCheck, Building, GraduationCap, ShieldAlert, Clock, Printer, Lock, FileText, CheckCheck } from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Submission, Exam, Question } from '../types';

interface ResultScreenProps {
  submission: Submission;
  exam: Exam;
  onReset: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ submission, exam, onReset }) => {
  const isPassed = submission.percentage >= 60;

  // Real-time Result Display Setting from Firestore (Default: false / hanya hasil)
  const [showQuestionsReview, setShowQuestionsReview] = useState<boolean>(() => {
    if (typeof exam.showReviewAfterExam === 'boolean') {
      return exam.showReviewAfterExam;
    }
    try {
      const cached = localStorage.getItem('exam_edu_show_questions_review');
      return cached === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'result_display'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.showQuestionsReview === 'boolean') {
          setShowQuestionsReview(data.showQuestionsReview);
          try {
            localStorage.setItem('exam_edu_show_questions_review', String(data.showQuestionsReview));
          } catch (e) {}
        }
      }
    }, (err) => {
      console.warn('Result display sync note:', err);
    });

    return () => unsub();
  }, []);

  const handleResetWithConfirm = () => {
    if (window.confirm("Pastikan Anda sudah menangkap layar (screenshot) atau mencatat hasil ujian Anda!\n\nApakah Anda yakin ingin kembali ke halaman utama/login?")) {
      onReset();
    }
  };

  const handlePrintOrSave = () => {
    window.print();
  };

  const displayQuestions = useMemo<Question[]>(() => {
    if (submission.shuffledQuestionIds && submission.shuffledQuestionIds.length > 0) {
      const qMap = new Map(exam.questions.map(q => [q.id, q]));
      const ordered = submission.shuffledQuestionIds.map(id => qMap.get(id)).filter((q): q is Question => q !== undefined);
      if (ordered.length === exam.questions.length) return ordered;
    }
    return exam.questions;
  }, [exam.questions, submission.shuffledQuestionIds]);

  return (
    <div className="min-h-screen bg-colorful-light-mesh text-slate-800 flex flex-col font-sans p-4 md:p-6">
      {/* Top Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 px-5 rounded-2xl bg-slate-900/90 text-white backdrop-blur-md shadow-[0_10px_25px_rgba(15,23,42,0.3)] border border-slate-700/60">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-black shadow-md border-b-2 border-indigo-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight font-heading">Hasil Exam Edu</h1>
            <p className="text-xs text-indigo-200 font-semibold">Penilaian Otomatis & Real-time</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrintOrSave}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-all cursor-pointer shadow-xs active:translate-y-0.5"
            title="Cetak atau Simpan Bukti Nilai Ujian"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak / Simpan</span>
          </button>

          <button
            onClick={handleResetWithConfirm}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all border-b-2 border-amber-600 active:translate-y-0.5 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ke Beranda</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full my-6 space-y-6">
        {/* Anti-Exit Screenshot Reminder Banner */}
        <div className="bg-indigo-950/90 text-white rounded-2xl p-3.5 px-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-indigo-800/80 shadow-md">
          <div className="flex items-center space-x-3 text-xs font-semibold">
            <span className="text-xl">📸</span>
            <div>
              <strong className="text-amber-300 block font-heading text-xs">Penting: Tangkap Layar (Screenshot) Hasil Ujian Anda</strong>
              <span className="text-slate-300 text-[11px]">
                Aplikasi akan tetap berada di halaman ini. Simpan atau tangkap layar hasil ini sebagai bukti sah pengerjaan ujian Anda.
              </span>
            </div>
          </div>
        </div>
        {(submission.status === 'cheated' || submission.cheatDetected) && (
          <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl p-4 text-rose-950 text-xs font-bold flex items-start space-x-3 shadow-md">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h4 className="font-black text-sm text-rose-900 font-heading uppercase">
                ⚠️ Terdeteksi Pelanggaran Anti-Kecurangan ({submission.cheatCount || 4}x)
              </h4>
              <p className="mt-1 text-rose-800 leading-relaxed font-semibold">
                Ujian Anda dihentikan secara otomatis dan nilai diset menjadi 0 karena terdeteksi berpindah tab browser atau meminimalkan jendela melebihi batas toleransi 3 kali.
              </p>
            </div>
          </div>
        )}

        {submission.status === 'time_up' && (
          <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-4 text-amber-950 text-xs font-bold flex items-start space-x-3 shadow-md">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-sm text-amber-900 font-heading uppercase">
                ⏰ Waktu Pengerjaan Ujian Habis
              </h4>
              <p className="mt-1 text-amber-800 leading-relaxed font-semibold">
                Ujian telah dikumpulkan dan dinilai secara otomatis oleh sistem saat batas waktu berakhir (00:00). Seluruh jawaban yang sempat Anda pilih telah tersimpan dengan aman.
              </p>
            </div>
          </div>
        )}

        {/* Main Score Hero Card */}
        <div className={`rounded-3xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden border-2 border-white/20 ${
          isPassed ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-slate-900' : 'bg-gradient-to-br from-rose-500 via-rose-700 to-slate-900'
        }`}>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-2">
              <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-md border border-white/30 shadow-xs">
                <Award className="w-3.5 h-3.5" />
                <span>{exam.title}</span>
              </span>

              <h2 className="text-2xl md:text-3xl font-black tracking-tight pt-1 font-heading">
                {submission.studentName}
              </h2>

              <p className="text-xs text-slate-200 font-semibold flex flex-wrap items-center gap-2">
                <span className="flex items-center space-x-1 bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                  <Building className="w-3.5 h-3.5 text-amber-300" />
                  <span>{submission.schoolName || 'SD NEGERI BANGUNREJO KIDUL 1'}</span>
                </span>
                <span className="flex items-center space-x-1 bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{submission.gradeName || 'Kelas 6'}</span>
                </span>
                <span>&bull;</span>
                <span>Token: <strong className="font-mono bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">{submission.examToken}</strong></span>
                <span>&bull;</span>
                <span>Waktu Selesai: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
              </p>

              <div className="pt-2">
                <span className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-2xl font-black text-xs shadow-md border-b-2 ${
                  isPassed ? 'bg-amber-400 text-slate-950 border-amber-600' : 'bg-rose-400 text-slate-950 border-rose-600'
                }`}>
                  {isPassed ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <XCircle className="w-4 h-4 text-slate-950" />}
                  <span>Status: {isPassed ? 'LULUS UJIAN' : 'PERLU REMIDI'}</span>
                </span>
              </div>
            </div>

            {/* Score Big Display */}
            <div className="bg-white/15 backdrop-blur-md border-2 border-white/30 rounded-3xl p-6 text-center shrink-0 min-w-[210px] shadow-2xl">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200 block mb-1 font-heading">
                NILAI AKHIR
              </span>
              <div className="text-4xl md:text-5xl font-black tracking-tight text-white font-heading">
                {submission.score}
                <span className="text-lg font-bold text-slate-200"> / {submission.maxScore}</span>
              </div>
              <div className="text-xs font-black text-amber-300 mt-1 bg-black/20 px-3 py-1 rounded-full inline-block">
                Persentase: {submission.percentage}%
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Answer Key Review Section or Locked Results Only */}
        {showQuestionsReview ? (
          <div className="card-3d p-6 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 font-heading flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Pembahasan Soal & Kunci Jawaban</span>
              </h3>
              <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-xl">
                Penilaian Otomatis
              </span>
            </div>

            <div className="space-y-4">
              {displayQuestions.map((q, qIdx) => {
                const type = q.type || 'multiple_choice';
                const studentAns = submission.answers[q.id];
                let isCorrect = false;
                let pointsEarned = 0;

                if (type === 'multiple_choice' || type === 'image_question') {
                  isCorrect = studentAns === q.correctAnswer;
                  pointsEarned = isCorrect ? (q.points || 20) : 0;
                } else if (type === 'true_false') {
                  const expected = q.correctBool ?? (q.correctAnswer === 0);
                  isCorrect = studentAns === expected;
                  pointsEarned = isCorrect ? (q.points || 20) : 0;
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
                    isCorrect = correctCount === pairs.length;
                    pointsEarned = Math.round((correctCount / pairs.length) * (q.points || 20));
                  }
                } else if (type === 'short_answer') {
                  if (typeof studentAns === 'string' && q.correctText) {
                    const normalizedStudent = studentAns.trim().toLowerCase();
                    const validAlternatives = q.correctText
                      .split(/[,;\/]/)
                      .map((s) => s.trim().toLowerCase())
                      .filter(Boolean);
                    isCorrect = validAlternatives.includes(normalizedStudent);
                    pointsEarned = isCorrect ? (q.points || 20) : 0;
                  }
                }

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      isCorrect
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-rose-50/60 border-rose-200'
                    }`}
                  >
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start space-x-2">
                        <span
                          className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 mt-0.5 border-b-2 ${
                            isCorrect ? 'bg-emerald-600 border-emerald-800 text-white' : 'bg-rose-600 border-rose-800 text-white'
                          }`}
                        >
                          {qIdx + 1}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-200/80 text-slate-700">
                              {type === 'true_false'
                                ? 'Benar / Salah'
                                : type === 'matching'
                                ? 'Menjodohkan'
                                : type === 'short_answer'
                                ? 'Isian Singkat'
                                : type === 'image_question'
                                ? 'Soal Bergambar'
                                : 'Pilihan Ganda'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {q.question}
                          </h4>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-black shrink-0 px-3 py-1 rounded-xl border ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}
                      >
                        {pointsEarned > 0 ? `+${pointsEarned} Poin` : '0 Poin'}
                      </span>
                    </div>

                    {/* Image preview for image_question */}
                    {type === 'image_question' && q.imageUrl && (
                      <div className="my-3 p-2 bg-white rounded-xl border border-slate-200 inline-block">
                        <img
                          src={q.imageUrl}
                          alt="Visual Soal"
                          className="max-h-40 rounded-lg object-contain"
                        />
                      </div>
                    )}

                    {/* Review for Multiple Choice & Image Question */}
                    {(type === 'multiple_choice' || type === 'image_question') && q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                        {q.options.map((opt, oIdx) => {
                          const isStudentSelected = studentAns === oIdx;
                          const isOptionCorrect = q.correctAnswer === oIdx;
                          const optionLabel = String.fromCharCode(65 + oIdx);

                          let badgeStyle = 'bg-white border-slate-200 text-slate-700';
                          if (isOptionCorrect) {
                            badgeStyle = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold shadow-xs';
                          } else if (isStudentSelected && !isOptionCorrect) {
                            badgeStyle = 'bg-rose-100 border-rose-400 text-rose-950 font-bold shadow-xs';
                          }

                          return (
                            <div
                              key={oIdx}
                              className={`p-3 rounded-xl border-2 text-xs flex items-center justify-between ${badgeStyle}`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-black">{optionLabel}.</span>
                                <span className="font-semibold">{opt}</span>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0">
                                {isOptionCorrect && (
                                  <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md flex items-center space-x-0.5 shadow-xs">
                                    <Check className="w-3 h-3" />
                                    <span>Kunci</span>
                                  </span>
                                )}
                                {isStudentSelected && !isOptionCorrect && (
                                  <span className="text-[10px] font-extrabold bg-rose-600 text-white px-2 py-0.5 rounded-md flex items-center space-x-0.5 shadow-xs">
                                    <X className="w-3 h-3" />
                                    <span>Jawaban Anda</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Review for True / False */}
                    {type === 'true_false' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                        {[true, false].map((tfVal) => {
                          const label = tfVal ? 'BENAR' : 'SALAH';
                          const expectedBool = q.correctBool ?? (q.correctAnswer === 0);
                          const isOptionCorrect = expectedBool === tfVal;
                          const isStudentSelected = studentAns === tfVal;

                          let style = 'bg-white border-slate-200 text-slate-700';
                          if (isOptionCorrect) {
                            style = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold';
                          } else if (isStudentSelected && !isOptionCorrect) {
                            style = 'bg-rose-100 border-rose-400 text-rose-950 font-bold';
                          }

                          return (
                            <div
                              key={label}
                              className={`p-3 rounded-xl border-2 text-xs flex items-center justify-between ${style}`}
                            >
                              <span className="font-black">{label}</span>
                              <div className="flex items-center space-x-1">
                                {isOptionCorrect && (
                                  <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                                    Kunci Benar
                                  </span>
                                )}
                                {isStudentSelected && !isOptionCorrect && (
                                  <span className="text-[10px] font-extrabold bg-rose-600 text-white px-2 py-0.5 rounded-md">
                                    Jawaban Anda
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Review for Matching */}
                    {type === 'matching' && q.matchingPairs && (
                      <div className="mt-3 space-y-2">
                        {q.matchingPairs.map((pair) => {
                          const userMatch = studentAns?.[pair.id] || '(Kosong)';
                          const isPairCorrect =
                            userMatch.trim().toLowerCase() === pair.match.trim().toLowerCase();

                          return (
                            <div
                              key={pair.id}
                              className={`p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${
                                isPairCorrect
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                  : 'bg-rose-50 border-rose-200 text-rose-950'
                              }`}
                            >
                              <div className="font-bold">
                                <span>{pair.premise}</span>
                                <span className="text-slate-400 mx-1.5">➜</span>
                                <span>Jawaban Siswa: <strong>{userMatch}</strong></span>
                              </div>
                              <div className="text-[11px] font-semibold text-slate-600">
                                Kunci Tepat: <strong className="text-emerald-700">{pair.match}</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Review for Short Answer */}
                    {type === 'short_answer' && (
                      <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span>Jawaban Siswa: <strong>{studentAns || '(Tidak diisi)'}</strong></span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isCorrect ? 'Tepat' : 'Tidak Sesuai'}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          Kunci Jawaban Guru: <strong className="text-emerald-700">{q.correctText}</strong>
                        </div>
                      </div>
                    )}

                    {/* Explanation if available */}
                    {q.explanation && (
                      <div className="mt-3 pt-2 border-t border-slate-200/60 text-xs text-slate-700 font-medium">
                        <strong>Penjelasan:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* OPSI HANYA HALAMAN HASIL (SOAL & PEMBAHASAN DIKUNCI OLEH PENGAWAS) */
          <div className="space-y-6 animate-fadeIn">
            {/* Ringkasan Pengerjaan Siswa */}
            <div className="card-3d p-6 bg-white border-2 border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 font-heading flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Ringkasan Hasil Evaluasi Ujian</span>
                </h3>
                <span className="text-xs font-black px-3 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Data Tersimpan di Server
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase block mb-1">
                    Total Soal
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {exam.questions.length} Soal
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-center">
                  <span className="text-[11px] font-extrabold text-indigo-700 uppercase block mb-1">
                    Soal Dijawab
                  </span>
                  <span className="text-xl font-black text-indigo-900">
                    {Object.keys(submission.answers || {}).length} Soal
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
                  <span className="text-[11px] font-extrabold text-emerald-700 uppercase block mb-1">
                    Nilai Akhir
                  </span>
                  <span className="text-xl font-black text-emerald-900">
                    {submission.percentage}%
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-center">
                  <span className="text-[11px] font-extrabold text-purple-700 uppercase block mb-1">
                    Status
                  </span>
                  <span className={`text-sm font-black px-2 py-0.5 rounded-lg inline-block ${
                    isPassed ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                  }`}>
                    {isPassed ? 'LULUS' : 'REMIDI'}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Proctored Security Notice Card */}
            <div className="card-3d p-6 md:p-8 bg-white border-2 border-indigo-200 rounded-3xl text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8 text-indigo-600" />
              </div>

              <div className="max-w-lg mx-auto space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>KEBIJAKAN KERAHASIAAN SOAL UJIAN</span>
                </div>

                <h3 className="text-lg font-black text-slate-900 font-heading">
                  Naskah Soal & Kunci Jawaban Ditutup
                </h3>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Sesuai kebijakan pengawas/guru, <strong>siswa hanya dapat melihat ringkasan hasil dan nilai akhir</strong>. Naskah butir soal, rincian pilihan jawaban, kunci jawaban yang benar, dan pembahasan tidak ditampilkan untuk menjaga integritas dan kerahasiaan evaluasi ujian.
                </p>
              </div>

              <div className="pt-2 text-xs font-semibold text-slate-500">
                Data pengerjaan Anda telah terekam secara resmi pada database sekolah.
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-center space-x-3 pt-2">
          <button
            onClick={onReset}
            className="px-6 py-3.5 rounded-2xl btn-3d-slate text-white text-xs font-black flex items-center space-x-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>
      </main>
    </div>
  );
};
