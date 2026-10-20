import React from 'react';
import { GamePlayer } from '../../types/game';
import { VEHICLE_OPTIONS } from '../../lib/gameAdapter';
import { Flag, Trophy, Flame } from 'lucide-react';

interface GameRaceTrackProps {
  players: GamePlayer[];
  maxDisplayLanes?: number;
  highlightPlayerId?: string;
}

export const GameRaceTrack: React.FC<GameRaceTrackProps> = ({
  players,
  maxDisplayLanes = 8,
  highlightPlayerId,
}) => {
  // Sort players by progress (descending) so top racers are prominent
  const displayPlayers = players.slice(0, maxDisplayLanes);

  const getVehicleEmoji = (player: GamePlayer) => {
    const found = VEHICLE_OPTIONS.find((v) => v.type === player.vehicle);
    return found ? found.emoji : '🏎️';
  };

  return (
    <div className="w-full bg-slate-900 rounded-3xl p-4 sm:p-6 border-4 border-amber-400 shadow-2xl relative overflow-hidden">
      {/* Track Header / Banner */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🏁</span>
          <span className="text-white font-black text-sm sm:text-base tracking-wider uppercase">
            Sirkuit Balap Edukasi
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs font-bold text-amber-300">
          <span className="flex items-center space-x-1">
            <Flag className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">START: 0%</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center space-x-1">
            <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="text-amber-400 font-black">FINISH: 100%</span>
          </span>
        </div>
      </div>

      {/* Lanes Container */}
      <div className="space-y-3 relative">
        {displayPlayers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium">
            <p className="text-3xl mb-2">🏎️💨</p>
            <p>Menunggu pembalap memasuki garis start...</p>
          </div>
        ) : (
          displayPlayers.map((player, index) => {
            const isMe = player.id === highlightPlayerId;
            const progress = Math.min(100, Math.max(0, player.progress || 0));

            return (
              <div
                key={player.id}
                className={`relative rounded-2xl p-2.5 transition-all ${
                  isMe
                    ? 'bg-indigo-950/70 border-2 border-indigo-400 shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-800/80 border border-slate-700/60'
                }`}
              >
                {/* Lane Info */}
                <div className="flex items-center justify-between text-xs mb-1.5 px-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        index === 0
                          ? 'bg-amber-400 text-slate-900 shadow-sm'
                          : index === 1
                          ? 'bg-slate-300 text-slate-900'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-black text-white truncate max-w-[140px] sm:max-w-xs">
                      {player.name} {isMe && <span className="text-indigo-300">(Kamu)</span>}
                    </span>
                    {player.streak >= 2 && (
                      <span className="bg-orange-500/30 text-orange-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center space-x-0.5">
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span>{player.streak}x</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 font-bold text-[11px]">
                    <span className="text-amber-400">{player.score} Poin</span>
                    <span className="text-slate-400">({progress}%)</span>
                  </div>
                </div>

                {/* Track Lane Road */}
                <div className="h-10 bg-slate-950 rounded-xl relative overflow-hidden border border-slate-800 flex items-center">
                  {/* Road Center Dashed Line */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-slate-700/60 pointer-events-none" />

                  {/* Finish Line Checkered Pattern on Right */}
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-repeat-y bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#fff_75%),linear-gradient(-45deg,transparent_75%,#fff_75%)] bg-[size:8px_8px] opacity-40 border-l border-white/20" />

                  {/* Moving Racer along track */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out z-10 flex items-center"
                    style={{ left: `calc(${progress}% * 0.88)` }}
                  >
                    <div className="relative group cursor-pointer flex items-center">
                      <span className="text-2xl transform hover:scale-125 transition-transform drop-shadow-md">
                        {getVehicleEmoji(player)}
                      </span>
                      <span className="text-sm -ml-1 drop-shadow">
                        {player.avatar}
                      </span>
                      {player.isFinished && (
                        <span className="ml-1 text-xs animate-bounce">🏆</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {players.length > maxDisplayLanes && (
        <div className="mt-3 text-center text-xs text-slate-400 font-medium">
          +{players.length - maxDisplayLanes} pembalap lainnya sedang melaju di lintasan
        </div>
      )}
    </div>
  );
};
