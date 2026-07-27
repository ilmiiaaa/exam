import React, { useState, useEffect } from 'react';
import { User, KeyRound, ArrowRight, ShieldCheck, Clock, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Exam } from '../types';

interface LoginScreenProps {
  onStartExam: (studentName: string, examToken: string, examData: Exam) => void;
  onOpenTeacherPanel: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onStartExam, onOpenTeacherPanel }) => {
  const [studentName, setStudentName] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeExams, setActiveExams] = useState<Exam[]>([]);

  // Listen to active tokens real-time from Firestore
  useEffect(() => {
    const q = query(collection(db, 'exams'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exams: Exam[] = [];
      snapshot.forEach((doc) => {
        exams.push({ id: doc.id, ...doc.data() } as Exam);
      });
      setActiveExams(exams);
    }, (err) => {
      console.error("Error fetching real-time tokens:", err);
    });

    return () => unsubscribe();
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = studentName.trim();
    const cleanToken = token.trim().toUpperCase();

    if (!cleanName) {
      setErrorMsg('Harap masukkan Nama Lengkap Anda.');
      return;
    }

    if (!cleanToken) {
      setErrorMsg('Harap masukkan Token Ujian.');
      return;
    }

    setLoading(true);

    try {
      // Find token in activeExams or check Firestore doc
      const match = activeExams.find(ex => ex.token.toUpperCase() === cleanToken);

      if (!match) {
        setErrorMsg('Token Ujian tidak ditemukan atau sedang tidak aktif.');
        setLoading(false);
        return;
      }

      if (!match.questions || match.questions.length === 0) {
        setErrorMsg('Ujian ini belum memiliki soal. Harap hubungi pengawas.');
        setLoading(false);
        return;
      }

      onStartExam(cleanName, cleanToken, match);
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat memverifikasi token. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const selectTokenChip = (selectedToken: string) => {
    setToken(selectedToken);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 md:p-6 font-sans">
      {/* Top Header Navigation */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">UjianRealtime</h1>
            <p className="text-xs text-slate-500 font-medium">Sistem Penilaian Otomatis & Sync Real-time</p>
          </div>
        </div>

        <button
          onClick={onOpenTeacherPanel}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-200/80 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-slate-300/60"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Panel Guru / Monitor</span>
        </button>
      </header>

      {/* Main Login Form Container */}
      <main className="max-w-md mx-auto w-full my-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Masuk Ujian Online</h2>
            <p className="text-xs text-slate-500 mt-1">
              Masukkan nama lengkap dan token ujian yang diberikan oleh pengawas
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label htmlFor="studentNameInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap Peserta
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="studentNameInput"
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 text-slate-900 font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tokenInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Token Ujian
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="tokenInput"
                  type="text"
                  required
                  placeholder="Contoh: UJIAN2026"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 text-slate-900 font-mono font-bold tracking-widest uppercase transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Mulai Kerjakan Ujian</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Active Token Selector Helper */}
          {activeExams.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Token Ujian Tersedia ({activeExams.length})
                </span>
                <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  Real-time Active
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeExams.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => selectTokenChip(ex.token)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      token.toUpperCase() === ex.token.toUpperCase()
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-500/30'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                          {ex.token}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">
                          {ex.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <BookOpen className="w-3 h-3" />
                          <span>{ex.questions?.length || 0} Soal</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{ex.durationMinutes} Menit</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-600 font-semibold group-hover:underline">Pilih &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200/60 max-w-4xl mx-auto w-full">
        Aplikasi Ujian Realtime &copy; {new Date().getFullYear()} &bull; Firebase Powered Auto-Grading System
      </footer>
    </div>
  );
};
