import React, { useState, useEffect, useRef } from 'react';
import { GameRoom, GamePlayer, RaceVehicleType } from '../../types/game';
import { Users, Play, Copy, Check, ArrowLeft, Sparkles, Car, Shield, Flame, Volume2, VolumeX, X } from 'lucide-react';
import { VEHICLE_OPTIONS, AVATAR_OPTIONS } from '../../lib/gameAdapter';
import { gameSound } from '../../lib/gameSound';
import { kickPlayerFromRoom } from '../../lib/gameService';

interface GameLobbyProps {
  room: GameRoom;
  players: GamePlayer[];
  currentPlayer?: GamePlayer | null;
  isHost: boolean;
  onStartGame: () => void;
  onLeaveLobby: () => void;
  onUpdateVehicle?: (vehicle: RaceVehicleType, avatar: string) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onStartGame,
  onLeaveLobby,
  onUpdateVehicle,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => gameSound.getMuted());
  const [countdown, setCountdown] = useState<number | null>(null);
  const prevPlayerCountRef = useRef<number>(players.length);

  // Play blip sound when a new player connects
  useEffect(() => {
    if (players.length > prevPlayerCountRef.current) {
      gameSound.playPlayerJoin();
    }
    prevPlayerCountRef.current = players.length;
  }, [players.length]);

  const handleToggleSound = () => {
    const next = gameSound.toggleMute();
    setIsMuted(next);
  };

  const handleKick = async (playerId: string, playerName: string) => {
    if (!isHost) return;
    const confirmKick = window.confirm(`Keluarkan "${playerName}" dari ruang balapan?`);
    if (!confirmKick) return;
    try {
      gameSound.playClick();
      await kickPlayerFromRoom(room.id, playerId);
    } catch (err) {
      console.error('Failed to kick player:', err);
    }
  };

  const [selectedVehicle, setSelectedVehicle] = useState<RaceVehicleType>(
    currentPlayer?.vehicle || 'car_red'
  );
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    currentPlayer?.avatar || '🦁'
  );

  const handleCopyPin = () => {
    gameSound.playClick();
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSelectVehicle = (v: RaceVehicleType) => {
    gameSound.playClick();
    setSelectedVehicle(v);
    if (onUpdateVehicle) onUpdateVehicle(v, selectedAvatar);
  };

  const handleSelectAvatar = (a: string) => {
    gameSound.playClick();
    setSelectedAvatar(a);
    if (onUpdateVehicle) onUpdateVehicle(selectedVehicle, a);
  };

  const handleStartWithCountdown = () => {
    if (countdown !== null) return;
    gameSound.playCountdown(false);
    setCountdown(3);

    let currentCount = 3;
    const timer = setInterval(() => {
      currentCount--;
      if (currentCount > 0) {
        setCountdown(currentCount);
        gameSound.playCountdown(false);
      } else {
        clearInterval(timer);
        setCountdown(0); // GO!
        gameSound.playCountdown(true);
        setTimeout(() => {
          onStartGame();
        }, 500);
      }
    }, 900);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onLeaveLobby}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 font-bold text-sm bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm cursor-pointer transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Keluar Ruang</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-slate-100 border-slate-300 text-slate-400'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}
            title={isMuted ? 'Nyalakan Efek Suara' : 'Bisukan Suara'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-2xl font-black text-xs">
            <Car className="w-4 h-4 text-indigo-600" />
            <span>Mode Balapan Cepat</span>
          </div>
        </div>
      </div>

      {/* Hero PIN Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden border-4 border-indigo-400/40">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/30 text-indigo-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ruang Game Race Aktif</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            {room.title}
          </h1>

          <p className="text-indigo-200 text-xs sm:text-sm font-medium max-w-lg mx-auto">
            Bagikan 6-digit PIN ini kepada para peserta. Peserta dapat bergabung melalui menu Game Race di layar utama.
          </p>

          {/* Big Interactive PIN Display */}
          <div className="pt-2 pb-1">
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border-2 border-white/20 shadow-inner">
              <span className="font-mono text-4xl sm:text-6xl font-black tracking-widest text-amber-300 drop-shadow-md">
                {room.id}
              </span>
              <button
                onClick={handleCopyPin}
                title="Salin PIN"
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 p-3 rounded-2xl font-black cursor-pointer shadow-md transition-all active:scale-95 flex items-center space-x-1"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-800" /> : <Copy className="w-5 h-5" />}
                <span className="text-xs font-bold hidden sm:inline">{copied ? 'Tersalin!' : 'Salin'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-indigo-300 pt-2">
            <span>Paket Soal: <strong className="text-white">{room.examTitle}</strong></span>
            <span>•</span>
            <span>Jumlah Soal: <strong className="text-amber-300">{room.totalQuestions} Butir</strong></span>
            <span>•</span>
            <span>Waktu per Soal: <strong className="text-amber-300">{room.settings?.questionTimeLimit || 20} Detik</strong></span>
          </div>
        </div>
      </div>

      {/* Vehicle / Avatar Selector (if player) */}
      {!isHost && currentPlayer && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-slate-200 space-y-4">
          <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center space-x-2">
            <Car className="w-5 h-5 text-indigo-600" />
            <span>Pilih Kendaraan & Karakter Balapmu</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Pilih Kendaraan:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {VEHICLE_OPTIONS.map((v) => (
                <button
                  key={v.type}
                  type="button"
                  onClick={() => handleSelectVehicle(v.type)}
                  className={`p-3 rounded-2xl border-2 flex items-center space-x-2 text-left cursor-pointer transition-all ${
                    selectedVehicle === v.type
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-2xl">{v.emoji}</span>
                  <div className="truncate">
                    <div className="text-xs font-black text-slate-800 truncate">{v.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Pilih Maskot:</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectAvatar(emoji)}
                  className={`w-11 h-11 text-xl rounded-2xl flex items-center justify-center border-2 cursor-pointer transition-all ${
                    selectedAvatar === emoji
                      ? 'border-amber-500 bg-amber-50 scale-110 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Player List */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm sm:text-base">
                Pembalap di Garis Start ({players.length})
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {isHost ? 'Tekan Mulai Balapan saat semua siswa sudah siap.' : 'Menunggu aba-aba start dari Guru...'}
              </p>
            </div>
          </div>

          {/* Host Start Button */}
          {isHost && (
            <button
              onClick={handleStartWithCountdown}
              disabled={players.length === 0 || countdown !== null}
              className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center space-x-2 shadow-lg transition-all ${
                players.length > 0 && countdown === null
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-emerald-500/30'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{countdown !== null ? `Memulai dalam ${countdown}...` : 'Mulai Balapan Sekarang!'}</span>
            </button>
          )}
        </div>

        {/* Big Start Countdown Overlay */}
        {countdown !== null && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <div className="text-center space-y-4 animate-bounce">
              <div className="text-8xl sm:text-9xl font-black text-amber-400 drop-shadow-2xl">
                {countdown === 0 ? '🏁 GO!' : countdown}
              </div>
              <p className="text-lg sm:text-2xl font-black text-indigo-200 uppercase tracking-widest">
                {countdown === 0 ? 'Sirkuit Dibuka! Selamat Berlomba!' : 'Pembalap Bersiap di Garis Start...'}
              </p>
            </div>
          </div>
        )}

        {/* Players Grid */}
        {players.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium">
            <p className="text-4xl mb-2 animate-pulse">🚦</p>
            <p className="font-bold text-slate-600">Belum ada pembalap yang bergabung</p>
            <p className="text-xs mt-1">Siswa dapat memasukkan PIN <strong>{room.id}</strong> di menu Game Race.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {players.map((p) => (
              <div
                key={p.id}
                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 p-3 rounded-2xl flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-xs shrink-0">
                    {p.avatar || '🏎️'}
                  </div>
                  <div className="truncate">
                    <div className="font-black text-xs text-slate-800 truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {p.school ? `${p.school}` : 'Peserta'} {p.grade && `(${p.grade})`}
                    </div>
                  </div>
                </div>

                {isHost && (
                  <button
                    type="button"
                    onClick={() => handleKick(p.id, p.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 ml-1"
                    title={`Keluarkan ${p.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
