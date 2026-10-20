import React, { useState } from 'react';
import { GameRoom, GamePlayer } from '../../types/game';
import { updateGameRoomStatus, finalizeGameResults } from '../../lib/gameService';
import { Trophy, Flag, Users, ArrowLeft, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { GameRaceTrack } from './GameRaceTrack';
import { GameLeaderboard } from './GameLeaderboard';

interface GameHostScreenProps {
  room: GameRoom;
  players: GamePlayer[];
  onFinishGame: () => void;
  onExit: () => void;
}

export const GameHostScreen: React.FC<GameHostScreenProps> = ({
  room,
  players,
  onFinishGame,
  onExit,
}) => {
  const [isFinalizing, setIsFinalizing] = useState(false);

  const finishedCount = players.filter((p) => p.isFinished).length;
  const averageScore =
    players.length > 0
      ? Math.round(players.reduce((sum, p) => sum + (p.score || 0), 0) / players.length)
      : 0;

  const handleEndGameAndPodium = async () => {
    if (isFinalizing) return;
    const confirmEnd = window.confirm(
      'Apakah Anda yakin ingin menyelesaikan balapan sekarang dan menampilkan podium juara?'
    );
    if (!confirmEnd) return;

    setIsFinalizing(true);
    try {
      await finalizeGameResults(room.id);
      onFinishGame();
    } catch (err) {
      console.error('Error finalizing game:', err);
      alert('Gagal mengakhiri game: ' + (err as Error).message);
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={onExit}
            className="p-2 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all cursor-pointer"
            title="Keluar ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">🏁</span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {room.title}
              </h1>
              <span className="bg-emerald-100 text-emerald-800 font-black text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              PIN Ruang: <strong className="text-indigo-600 font-mono">{room.id}</strong> • Paket Soal: {room.examTitle} ({room.totalQuestions} Soal)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleEndGameAndPodium}
            disabled={isFinalizing}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
          >
            <Trophy className="w-4 h-4 text-slate-950" />
            <span>{isFinalizing ? 'Menghitung Hasil...' : 'Selesaikan & Lihat Podium'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pembalap</div>
            <div className="text-xl font-black text-slate-800">{players.length}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telah Finish</div>
            <div className="text-xl font-black text-emerald-600">
              {finishedCount} <span className="text-xs text-slate-400 font-medium">/ {players.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata Skor</div>
            <div className="text-xl font-black text-amber-600">{averageScore} Pts</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Sesi</div>
            <div className="text-base font-black text-purple-700">Sedang Melaju 🏎️</div>
          </div>
        </div>
      </div>

      {/* Main Race Track (Interactive High-Visibility Projector View) */}
      <GameRaceTrack players={players} maxDisplayLanes={10} />

      {/* Live Leaderboard Standings */}
      <GameLeaderboard players={players} title="Klasemen Balapan Langsung (Real-time)" />
    </div>
  );
};
