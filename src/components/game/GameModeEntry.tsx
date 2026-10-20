import React, { useState } from 'react';
import { GameRoom, GamePlayer } from '../../types/game';
import { joinGameRoom } from '../../lib/gameService';
import { SCHOOL_LIST, GRADE_LIST } from '../../data/schools';
import { Car, KeyRound, User, ArrowRight, ArrowLeft, AlertCircle, Sparkles, Building, GraduationCap } from 'lucide-react';

interface GameModeEntryProps {
  onJoinSuccess: (room: GameRoom, player: GamePlayer) => void;
  onBackToExamLogin: () => void;
  initialName?: string;
  initialSchool?: string;
  initialGrade?: string;
}

export const GameModeEntry: React.FC<GameModeEntryProps> = ({
  onJoinSuccess,
  onBackToExamLogin,
  initialName = '',
  initialSchool = '',
  initialGrade = '',
}) => {
  const [studentName, setStudentName] = useState(initialName);
  const [schoolName, setSchoolName] = useState(initialSchool || SCHOOL_LIST[0]);
  const [gradeName, setGradeName] = useState(initialGrade || GRADE_LIST[3]);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = studentName.trim().toUpperCase();
    const cleanPin = pin.trim().replace(/\s+/g, '');

    if (!cleanName) {
      setErrorMsg('Harap isi Nama Lengkap Anda.');
      return;
    }
    if (!cleanPin || cleanPin.length < 5) {
      setErrorMsg('Harap masukkan 6-digit PIN Ruang Game yang valid.');
      return;
    }

    setLoading(true);
    try {
      const playerId = `p_${cleanName.replace(/[^A-Z0-9]/g, '_')}_${Date.now()}`;
      const player = await joinGameRoom({
        roomId: cleanPin,
        playerId,
        name: cleanName,
        school: schoolName,
        grade: gradeName,
      });

      // Construct minimal room data or fetch it
      const dummyRoom: GameRoom = {
        id: cleanPin,
        title: 'Game Race',
        examToken: '',
        examTitle: '',
        hostName: '',
        status: 'waiting',
        currentQuestionIndex: 0,
        totalQuestions: 0,
        questions: [],
        playerCount: 1,
        createdAt: new Date().toISOString(),
        settings: {
          questionTimeLimit: 20,
          speedBonus: true,
          streakMultiplier: true,
          shuffleQuestions: false,
          shuffleOptions: false,
          theme: 'racing',
        },
      };

      onJoinSuccess(dummyRoom, player);
    } catch (err) {
      console.error('Failed to join game room:', err);
      setErrorMsg((err as Error).message || 'Gagal bergabung ke ruang game race. Periksa kembali PIN Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border-2 border-amber-400/40 shadow-2xl relative z-10 space-y-6">
        {/* Top Navigation Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <button
            onClick={onBackToExamLogin}
            type="button"
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Ujian Online</span>
          </button>

          <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-400/30">
            Mode Balapan
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-lg shadow-amber-500/20">
            🏎️
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Game Race Edukasi
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Masukkan Nama dan PIN Game yang diberikan oleh Guru untuk mulai bertanding!
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Entry Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Nama Lengkap Peserta
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="CONTOH: AHMAD FAUZI"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-700 text-white font-bold text-sm focus:border-amber-400 focus:outline-none uppercase placeholder:text-slate-500 placeholder:normal-case"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Asal Sekolah
              </label>
              <select
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-slate-900/80 border border-slate-700 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
              >
                {SCHOOL_LIST.map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Kelas
              </label>
              <select
                value={gradeName}
                onChange={(e) => setGradeName(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-slate-900/80 border border-slate-700 text-white font-bold text-xs focus:border-amber-400 focus:outline-none"
              >
                {GRADE_LIST.map((g) => (
                  <option key={g} value={g} className="bg-slate-900 text-white">
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center justify-between">
              <span>PIN Ruang Game Race (6 Digit)</span>
              <span className="text-[10px] text-slate-400 font-normal">Diberikan oleh Guru</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="CONTOH: 829415"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-900 border-2 border-amber-400 text-amber-300 font-mono font-black text-xl tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Memasuki Sirkuit...</span>
            ) : (
              <>
                <span>Masuk ke Arena Balapan!</span>
                <ArrowRight className="w-5 h-5 text-slate-950" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
