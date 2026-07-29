import React, { useState, useEffect } from 'react';
import { User, KeyRound, ArrowRight, ShieldCheck, AlertCircle, Sparkles, Lock, X, Building, GraduationCap, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Exam } from '../types';
import { SCHOOL_LIST, GRADE_LIST } from '../data/schools';

interface LoginScreenProps {
  onStartExam: (studentName: string, schoolName: string, gradeName: string, examToken: string, examData: Exam) => void;
  onOpenTeacherPanel: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onStartExam, onOpenTeacherPanel }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [studentName, setStudentName] = useState('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [gradeName, setGradeName] = useState<string>('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeExams, setActiveExams] = useState<Exam[]>([]);

  // Teacher password modal state
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherAuthError, setTeacherAuthError] = useState('');

  // Listen to active tokens real-time from Firestore for validation
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

  // Step 1: Validate identity and go to Step 2
  const handleNextToToken = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = studentName.trim();
    if (!cleanName) {
      setErrorMsg('Harap masukkan Nama Lengkap Anda.');
      return;
    }

    if (!schoolName) {
      setErrorMsg('Harap pilih Asal Sekolah Anda.');
      return;
    }

    if (!gradeName) {
      setErrorMsg('Harap pilih Kelas Anda.');
      return;
    }

    setStep(2);
  };

  // Step 2: Validate token and start exam
  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = studentName.trim();
    const cleanToken = token.trim().toUpperCase();

    if (!cleanName || !schoolName || !gradeName) {
      setErrorMsg('Data diri belum lengkap.');
      setStep(1);
      return;
    }

    if (!cleanToken) {
      setErrorMsg('Harap masukkan Token Ujian.');
      return;
    }

    setLoading(true);

    try {
      // Find token in activeExams
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

      onStartExam(cleanName, schoolName, gradeName, cleanToken, match);
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat memverifikasi token. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherAuthError('');

    if (teacherPassword === 'ilmiawan') {
      setShowTeacherModal(false);
      setTeacherPassword('');
      onOpenTeacherPanel();
    } else {
      setTeacherAuthError('Kata sandi guru tidak sesuai.');
    }
  };

  return (
    <div className="min-h-screen bg-colorful-blend text-slate-100 flex flex-col justify-between p-4 md:p-6 font-sans relative overflow-hidden">
      {/* Dynamic Background Glow Orbs */}
      <div className="absolute top-10 left-1/4 w-72 h-72 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-fuchsia-600/25 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header Navigation */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-3 px-5 rounded-2xl bg-slate-900/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-slate-700/60 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 p-1.5 flex items-center justify-center shadow-[0_6px_20px_rgba(139,92,246,0.3)] border border-slate-700/80 overflow-hidden shrink-0">
            <img
              src="https://iili.io/CvXmwBf.png"
              alt="Exam Edu Logo"
              className="w-full h-full object-contain filter drop-shadow-sm"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight leading-tight font-heading flex items-center gap-1.5">
              <span>Exam Edu</span>
              <span className="text-[10px] bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-xs">
                REAL-TIME PRO
              </span>
            </h1>
            <p className="text-xs text-indigo-200 font-semibold">Penilaian Otomatis & Sinergi Cloud</p>
          </div>
        </div>

        <button
          onClick={() => {
            setTeacherAuthError('');
            setTeacherPassword('');
            setShowTeacherModal(true);
          }}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 transition-all shadow-[0_4px_16px_rgba(245,158,11,0.35)] border-b-2 border-amber-600 active:translate-y-0.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
          <span>Panel Guru / Monitor</span>
        </button>
      </header>

      {/* Main Login Form Container */}
      <main className="max-w-md mx-auto w-full my-8 relative z-10">
        <div className="card-3d p-6 md:p-8 relative overflow-hidden bg-white text-slate-900 border-2 border-indigo-100 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-indigo-300 to-pink-300 rounded-full blur-2xl pointer-events-none opacity-60"></div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <button
              type="button"
              onClick={() => { setErrorMsg(''); setStep(1); }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                step === 1 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === 1 ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-700'
              }`}>1</span>
              <span>1. Data Diri</span>
            </button>
            <div className="w-6 h-0.5 bg-slate-200"></div>
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
              step === 2 ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-400'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === 2 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
              }`}>2</span>
              <span>2. Token Ujian</span>
            </div>
          </div>
          
          {step === 1 ? (
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-white mb-3 shadow-[0_8px_20px_rgba(79,70,229,0.35)] border-b-2 border-indigo-800">
                <User className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 font-heading">Data Diri Peserta</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Lengkapi nama, sekolah, dan kelas Anda sebelum memasukkan token
              </p>
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-emerald-500 text-slate-950 mb-3 shadow-[0_8px_20px_rgba(245,158,11,0.35)] border-b-2 border-amber-600">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 font-heading">Token Ujian</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Masukkan token ujian yang diberikan oleh pengawas
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: IDENTITY DETAILS */
            <form onSubmit={handleNextToToken} className="space-y-4">
              <div>
                <label htmlFor="studentNameInput" className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
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
                    className="w-full pl-10 pr-3.5 py-3 text-sm rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/90 text-slate-900 font-semibold shadow-inner transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="schoolSelect" className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Asal Sekolah
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <select
                    id="schoolSelect"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 text-xs md:text-sm rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/90 text-slate-900 font-bold shadow-inner transition-all cursor-pointer"
                  >
                    <option value="">-Sekolah-</option>
                    {SCHOOL_LIST.map((sch) => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="gradeSelect" className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kelas
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <select
                    id="gradeSelect"
                    value={gradeName}
                    onChange={(e) => setGradeName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 text-xs md:text-sm rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/90 text-slate-900 font-bold shadow-inner transition-all cursor-pointer"
                  >
                    <option value="">-Kelas-</option>
                    {GRADE_LIST.map((grd) => (
                      <option key={grd} value={grd}>
                        {grd}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-3.5 px-5 btn-3d-indigo text-white text-sm font-black rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <span className="font-heading tracking-wide">Lanjut ke Token Ujian</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: TOKEN ENTRY */
            <form onSubmit={handleStart} className="space-y-4">
              {/* Identity summary box */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1.5 relative">
                <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100">
                  <span className="font-extrabold text-indigo-900 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Identitas Peserta</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => { setErrorMsg(''); setStep(1); }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Ubah Data</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1 text-slate-800">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-black text-slate-900">{studentName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-bold text-slate-700">{schoolName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-bold text-slate-700">{gradeName}</span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="tokenInput" className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
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
                    autoFocus
                    placeholder="Masukkan Token Ujian"
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-3.5 py-3 text-sm rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/90 text-slate-900 font-mono font-black tracking-widest uppercase shadow-inner transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => { setErrorMsg(''); setStep(1); }}
                  disabled={loading}
                  className="px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-100 transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 px-5 btn-3d-indigo text-white text-sm font-black rounded-2xl flex items-center justify-center space-x-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="font-heading tracking-wide">Mulai Kerjakan Ujian</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Teacher Access Password Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-slate-100 space-y-4 relative card-3d">
            <button
              onClick={() => setShowTeacherModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-400 text-white mx-auto flex items-center justify-center mb-3 shadow-md border-b-2 border-indigo-700">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 font-heading">Akses Panel Guru</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Masukkan kata sandi guru untuk melanjutkan</p>
            </div>

            {teacherAuthError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{teacherAuthError}</span>
              </div>
            )}

            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                  Kata Sandi Guru
                </label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan Kata Sandi"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50 text-slate-900 font-semibold"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl btn-3d-indigo text-white text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  Masuk Panel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs font-semibold text-slate-400 py-4 border-t border-slate-200/60 max-w-4xl mx-auto w-full">
        Exam Edu &copy; {new Date().getFullYear()} &bull; Firebase Powered Auto-Grading System
      </footer>
    </div>
  );
};
