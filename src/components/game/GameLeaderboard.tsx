import React from 'react';
import { GamePlayer, GameLeaderboardEntry } from '../../types/game';
import { Trophy, Medal, Award, Flame } from 'lucide-react';

interface GameLeaderboardProps {
  players: (GamePlayer | GameLeaderboardEntry)[];
  title?: string;
  highlightPlayerId?: string;
}

export const GameLeaderboard: React.FC<GameLeaderboardProps> = ({
  players,
  title = 'Klasemen Balap Terkini',
  highlightPlayerId,
}) => {
  const topThree = players.slice(0, 3);
  const remaining = players.slice(3);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base sm:text-lg">{title}</h3>
            <p className="text-xs text-slate-500 font-medium">Diurutkan berdasarkan total skor dan kecepatan</p>
          </div>
        </div>
        <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-200">
          {players.length} Pembalap
        </span>
      </div>

      {/* Podium (Top 3) */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mb-6 pt-4">
          {/* Rank 2 (Silver) */}
          <div className="flex flex-col items-center">
            {topThree[1] ? (
              <>
                <div className="text-2xl mb-1">{topThree[1].avatar || '🏎️'}</div>
                <div className="font-black text-xs sm:text-sm text-slate-800 text-center truncate max-w-full">
                  {topThree[1].name}
                </div>
                <div className="text-[11px] font-black text-slate-500 mb-2">
                  {topThree[1].score} Pts
                </div>
                <div className="w-full bg-gradient-to-t from-slate-300 to-slate-200 h-20 sm:h-24 rounded-t-2xl flex flex-col items-center justify-center border-t-4 border-slate-400 shadow-md">
                  <Medal className="w-6 h-6 text-slate-600 mb-1" />
                  <span className="text-sm sm:text-base font-black text-slate-700">2</span>
                </div>
              </>
            ) : (
              <div className="h-20 sm:h-24 w-full bg-slate-100 rounded-t-2xl border-dashed border-2 border-slate-200" />
            )}
          </div>

          {/* Rank 1 (Gold) */}
          <div className="flex flex-col items-center -mt-4">
            {topThree[0] ? (
              <>
                <div className="text-3xl mb-1 animate-bounce">{topThree[0].avatar || '🏆'}</div>
                <div className="font-black text-xs sm:text-sm text-amber-900 text-center truncate max-w-full">
                  {topThree[0].name}
                </div>
                <div className="text-xs font-black text-amber-600 mb-2">
                  {topThree[0].score} Pts
                </div>
                <div className="w-full bg-gradient-to-t from-amber-400 to-amber-300 h-28 sm:h-32 rounded-t-2xl flex flex-col items-center justify-center border-t-4 border-amber-500 shadow-lg">
                  <Trophy className="w-8 h-8 text-amber-800 mb-1" />
                  <span className="text-base sm:text-lg font-black text-amber-900">JUARA 1</span>
                </div>
              </>
            ) : (
              <div className="h-28 sm:h-32 w-full bg-slate-100 rounded-t-2xl border-dashed border-2 border-slate-200" />
            )}
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="flex flex-col items-center">
            {topThree[2] ? (
              <>
                <div className="text-2xl mb-1">{topThree[2].avatar || '🚗'}</div>
                <div className="font-black text-xs sm:text-sm text-slate-800 text-center truncate max-w-full">
                  {topThree[2].name}
                </div>
                <div className="text-[11px] font-black text-amber-700 mb-2">
                  {topThree[2].score} Pts
                </div>
                <div className="w-full bg-gradient-to-t from-amber-200 to-amber-100 h-16 sm:h-20 rounded-t-2xl flex flex-col items-center justify-center border-t-4 border-amber-400 shadow-md">
                  <Award className="w-5 h-5 text-amber-700 mb-1" />
                  <span className="text-sm font-black text-amber-800">3</span>
                </div>
              </>
            ) : (
              <div className="h-16 sm:h-20 w-full bg-slate-100 rounded-t-2xl border-dashed border-2 border-slate-200" />
            )}
          </div>
        </div>
      )}

      {/* Ranks 4 and below Table */}
      {remaining.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
            Pembalap Lainnya
          </h4>
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {remaining.map((p, idx) => {
              const rank = idx + 4;
              const isMe = p.playerId === highlightPlayerId || (p as GamePlayer).id === highlightPlayerId;
              return (
                <div
                  key={p.playerId || (p as GamePlayer).id}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                    isMe
                      ? 'bg-indigo-50 border border-indigo-300 text-indigo-900'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className="w-6 text-center text-slate-400 font-black">{rank}</span>
                    <span className="text-base">{p.avatar || '🏎️'}</span>
                    <span className="truncate">{p.name}</span>
                    {('streak' in p && (p as GamePlayer).streak >= 2) && (
                      <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] flex items-center space-x-0.5">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span>{(p as GamePlayer).streak}x</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 font-black text-right">
                    <span className="text-indigo-600">{p.score} Pts</span>
                    <span className="text-slate-400 text-[10px]">({p.correctCount} benar)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
