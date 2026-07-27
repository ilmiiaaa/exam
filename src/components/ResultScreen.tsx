import React from 'react';
import { Trophy, CheckCircle2, XCircle, ArrowLeft, RotateCcw, BookOpen, Award, Check, X, ShieldCheck } from 'lucide-react';
import { Submission, Exam } from '../types';

interface ResultScreenProps {
  submission: Submission;
  exam: Exam;
  onReset: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ submission, exam, onReset }) => {
  const isPassed = submission.percentage >= 60;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans p-4 md:p-6">
      {/* Top Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Hasil Ujian & Penilaian Otomatis</h1>
            <p className="text-xs text-slate-500">Nilai langsung dihitung secara real-time</p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Ke Beranda</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto w-full my-6 space-y-6">
        {/* Main Score Hero Card */}
        <div className={`rounded-3xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden ${
          isPassed ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900' : 'bg-gradient-to-br from-rose-600 via-slate-800 to-slate-900'
        }`}>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20">
                <Award className="w-3.5 h-3.5" />
                <span>{exam.title}</span>
              </span>

              <h2 className="text-xl md:text-2xl font-black tracking-tight pt-1">
                {submission.studentName}
              </h2>

              <p className="text-xs text-slate-200">
                Token: <strong className="font-mono bg-black/20 px-1.5 py-0.5 rounded">{submission.examToken}</strong> &bull; Waktu Selesai: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
              </p>

              <div className="pt-2">
                <span className={`inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl font-bold text-xs shadow-md ${
                  isPassed ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-slate-950'
                }`}>
                  {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>Status: {isPassed ? 'LULUS UJIAN' : 'PERLU REMIDI'}</span>
                </span>
              </div>
            </div>

            {/* Score Big Display */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-center shrink-0 min-w-[200px] shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block mb-1">
                NILAI AKHIR
              </span>
              <div className="text-4xl md:text-5xl font-black tracking-tight text-white">
                {submission.score}
                <span className="text-lg font-normal text-slate-300"> / {submission.maxScore}</span>
              </div>
              <div className="text-xs font-semibold text-emerald-300 mt-1">
                Persentase: {submission.percentage}%
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Answer Key Review Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Pembahasan Soal & Kunci Jawaban</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Sistem Penilaian Otomatis
            </span>
          </div>

          <div className="space-y-4">
            {exam.questions.map((q, qIdx) => {
              const studentAnswerIdx = submission.answers[q.id];
              const isCorrect = studentAnswerIdx === q.correctAnswer;
              const pointsEarned = isCorrect ? (q.points || 20) : 0;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCorrect
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  {/* Question header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start space-x-2">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {qIdx + 1}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                        {q.question}
                      </h4>
                    </div>

                    <span
                      className={`text-xs font-bold shrink-0 px-2.5 py-0.5 rounded-full border ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {isCorrect ? `+${pointsEarned} Poin` : '0 Poin'}
                    </span>
                  </div>

                  {/* Options review */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                    {q.options.map((opt, oIdx) => {
                      const isStudentSelected = studentAnswerIdx === oIdx;
                      const isOptionCorrect = q.correctAnswer === oIdx;
                      const optionLabel = String.fromCharCode(65 + oIdx);

                      let badgeStyle = 'bg-slate-50 border-slate-200 text-slate-600';
                      if (isOptionCorrect) {
                        badgeStyle = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-semibold';
                      } else if (isStudentSelected && !isOptionCorrect) {
                        badgeStyle = 'bg-rose-100 border-rose-400 text-rose-950 font-semibold';
                      }

                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${badgeStyle}`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">{optionLabel}.</span>
                            <span>{opt}</span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            {isOptionCorrect && (
                              <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                                <Check className="w-3 h-3" />
                                <span>Kunci</span>
                              </span>
                            )}
                            {isStudentSelected && !isOptionCorrect && (
                              <span className="text-[10px] font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                                <X className="w-3 h-3" />
                                <span>Jawaban Anda</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation if available */}
                  {q.explanation && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                      <strong>Penjelasan:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-center space-x-3 pt-2">
          <button
            onClick={onReset}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-lg flex items-center space-x-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Masuk</span>
          </button>
        </div>
      </main>
    </div>
  );
};
