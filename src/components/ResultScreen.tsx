import React from 'react';
import { Trophy, CheckCircle2, XCircle, ArrowLeft, RotateCcw, BookOpen, Award, Check, X, ShieldCheck, Building, GraduationCap } from 'lucide-react';
import { Submission, Exam } from '../types';

interface ResultScreenProps {
  submission: Submission;
  exam: Exam;
  onReset: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ submission, exam, onReset }) => {
  const isPassed = submission.percentage >= 60;

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

        <button
          onClick={onReset}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all border-b-2 border-amber-600 active:translate-y-0.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Ke Beranda</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto w-full my-6 space-y-6">
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

        {/* Detailed Answer Key Review Section */}
        <div className="card-3d p-6 space-y-5">
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
            {exam.questions.map((q, qIdx) => {
              const studentAnswerIdx = submission.answers[q.id];
              const isCorrect = studentAnswerIdx === q.correctAnswer;
              const pointsEarned = isCorrect ? (q.points || 20) : 0;

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
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {q.question}
                      </h4>
                    </div>

                    <span
                      className={`text-xs font-black shrink-0 px-3 py-1 rounded-xl border ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
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
