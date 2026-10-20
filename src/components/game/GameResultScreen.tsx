import React from 'react';
import { GameResult } from '../../types/game';
import { Trophy, ArrowLeft, RotateCcw, Medal, Award, CheckCircle2, Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface GameResultScreenProps {
  result: GameResult;
  onBackToHome: () => void;
  isHost?: boolean;
}

export const GameResultScreen: React.FC<GameResultScreenProps> = ({
  result,
  onBackToHome,
  isHost,
}) => {
  const topThree = result.leaderboard.slice(0, 3);

  const handleExportExcel = () => {
    try {
      const data = result.leaderboard.map((item) => ({
        Peringkat: item.rank,
        'Nama Peserta': item.name,
        Sekolah: item.school || '-',
        Kelas: item.grade || '-',
        'Total Skor (Poin)': item.score,
        'Jumlah Benar': item.correctCount,
        'Persentase Selesai': `${item.progress}%`,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Hasil Game Race');
      XLSX.writeFile(wb, `Hasil_GameRace_${result.roomId}_${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Error exporting game results:', err);
      alert('Gagal mengunduh berkas Excel hasil balapan.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center space-x-2 text-slate-700 hover:text-slate-900 font-bold text-sm bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm cursor-pointer transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        <button
          onClick={handleExportExcel}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-2xl shadow-md cursor-pointer transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Rekap Excel</span>
        </button>
      </div>

      {/* Podium Winner Banner */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-indigo-900 rounded-3xl p-6 sm:p-10 text-white text-center shadow-2xl relative overflow-hidden border-4 border-amber-300">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-white/30 text-amber-100">
            <Trophy className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>Podium Juara Game Race</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight drop-shadow-md">
            Selamat Kepada Para Juara! 🏁
          </h1>

          <p className="text-amber-100 text-xs sm:text-sm font-medium max-w-md mx-auto">
            {result.roomTitle} • Total {result.totalPlayers} Pembalap Berpartisipasi
          </p>

          {/* 3D Podium Display */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-8 max-w-xl mx-auto">
            {/* Rank 2 (Silver) */}
            <div className="flex flex-col items-center">
              {topThree[1] ? (
                <>
                  <div className="text-3xl mb-1">{topThree[1].avatar || '🏎️'}</div>
                  <div className="font-black text-xs sm:text-sm text-white truncate max-w-full">
                    {topThree[1].name}
                  </div>
                  <div className="text-[11px] font-black text-amber-200 mb-2">
                    {topThree[1].score} Pts
                  </div>
                  <div className="w-full bg-slate-300/90 backdrop-blur-md h-24 sm:h-28 rounded-t-2xl flex flex-col items-center justify-center border-t-4 border-slate-400 shadow-lg text-slate-800">
                    <Medal className="w-6 h-6 text-slate-600 mb-1" />
                    <span className="text-sm sm:text-base font-black">JUARA 2</span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Rank 1 (Gold) */}
            <div className="flex flex-col items-center -mt-6">
              {topThree[0] ? (
                <>
                  <div className="text-4xl mb-1 animate-bounce">{topThree[0].avatar || '🏆'}</div>
                  <div className="font-black text-sm sm:text-base text-amber-100 truncate max-w-full">
                    {topThree[0].name}
                  </div>
                  <div className="text-xs font-black text-amber-200 mb-2">
                    {topThree[0].score} Pts
                  </div>
                  <div className="w-full bg-gradient-to-t from-amber-400 to-amber-300 h-32 sm:h-36 rounded-t-2xl flex flex-col items-center justify-center border-t-4 border-amber-200 shadow-2xl text-amber-950">
                    <Trophy className="w-8 h-8 text-amber-800 mb-1" />
                    <span className="text-base sm:text-lg font-black">JUARA 1</span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Rank 3 (Bronze) */}
            <div className="flex flex-col items-center">
              {topThree[2] ? (
                <>
                  <div className="text-3xl mb-1">{topThree[2].avatar || '🚗'}</div>
                  <div className="font-black text-xs sm:text-sm text-white truncate max-w-full">
                    {topThree[2].name}
                  </div>
                  <div className="text-[11px] font-black text-amber-200 mb-2">
                    {topThree[2].score} Pts
                  </div>
                  <div className="w-full bg-amber-700/80 backdrop-blur-md h-20 sm:h-24 rounded-t-2xl flex flex-col items-center justify-center border-t-4 border-amber-500 shadow-lg text-white">
                    <Award className="w-6 h-6 text-amber-200 mb-1" />
                    <span className="text-xs sm:text-sm font-black">JUARA 3</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Complete Scoreboard Table */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-slate-800 text-base">Rekapitulasi Lengkap Seluruh Pembalap</h3>
          </div>
          <span className="text-xs font-bold text-slate-500">{result.leaderboard.length} Peserta</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
                <th className="py-2.5 px-3">Peringkat</th>
                <th className="py-2.5 px-3">Pembalap</th>
                <th className="py-2.5 px-3">Sekolah & Kelas</th>
                <th className="py-2.5 px-3 text-center">Jawaban Benar</th>
                <th className="py-2.5 px-3 text-right">Skor Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
              {result.leaderboard.map((item) => (
                <tr key={item.playerId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3">
                    <span
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs ${
                        item.rank === 1
                          ? 'bg-amber-400 text-slate-900'
                          : item.rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : item.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td className="py-3 px-3 flex items-center space-x-2">
                    <span className="text-lg">{item.avatar || '🏎️'}</span>
                    <span className="font-black text-slate-900">{item.name}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {item.school || '-'} {item.grade && `(${item.grade})`}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-black text-[11px]">
                      {item.correctCount} / {result.totalQuestions}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-black text-sm text-indigo-600">
                    {item.score} Pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
