import React, { useState, useEffect } from 'react';
import { GameRoom, GamePlayer, GameResult, RaceVehicleType } from '../../types/game';
import { Exam } from '../../types';
import {
  listenToGameRoom,
  listenToGamePlayers,
  updateGameRoomStatus,
  finalizeGameResults,
} from '../../lib/gameService';
import { GameModeEntry } from './GameModeEntry';
import { GameLobby } from './GameLobby';
import { GamePlayerScreen } from './GamePlayerScreen';
import { GameHostScreen } from './GameHostScreen';
import { GameResultScreen } from './GameResultScreen';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface GameManagerProps {
  initialRoom?: GameRoom | null;
  initialPlayer?: GamePlayer | null;
  isHost?: boolean;
  onExitGame: () => void;
  onOpenTeacherPanel?: () => void;
}

export const GameManager: React.FC<GameManagerProps> = ({
  initialRoom = null,
  initialPlayer = null,
  isHost = false,
  onExitGame,
}) => {
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(initialRoom);
  const [currentPlayer, setCurrentPlayer] = useState<GamePlayer | null>(initialPlayer);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  const roomId = currentRoom?.id;

  // Real-time listener for Room state
  useEffect(() => {
    if (!roomId) return;
    const unsubRoom = listenToGameRoom(roomId, (room) => {
      if (room) {
        setCurrentRoom(room);
        if (room.status === 'finished') {
          // Fetch game result doc
          getDoc(doc(db, 'gameResults', roomId)).then((snap) => {
            if (snap.exists()) {
              setGameResult(snap.data() as GameResult);
            }
          });
        }
      }
    });

    const unsubPlayers = listenToGamePlayers(roomId, (list) => {
      setPlayers(list);
      if (currentPlayer) {
        const me = list.find((p) => p.id === currentPlayer.id);
        if (me) setCurrentPlayer(me);
      }
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomId, currentPlayer?.id]);

  // Handle student join from entry screen
  const handleJoinSuccess = (room: GameRoom, player: GamePlayer) => {
    setCurrentRoom(room);
    setCurrentPlayer(player);
  };

  // Host starts the game
  const handleStartGame = async () => {
    if (!roomId) return;
    try {
      await updateGameRoomStatus(roomId, 'in_progress');
    } catch (err) {
      console.error('Error starting game:', err);
      alert('Gagal memulai balapan: ' + (err as Error).message);
    }
  };

  // Update vehicle / avatar in lobby
  const handleUpdateVehicle = async (vehicle: RaceVehicleType, avatar: string) => {
    if (!roomId || !currentPlayer) return;
    try {
      await updateDoc(doc(db, 'gameRooms', roomId, 'players', currentPlayer.id), {
        vehicle,
        avatar,
      });
    } catch (err) {
      console.error('Failed to update vehicle:', err);
    }
  };

  // Handle finish game results display
  const handleShowResults = async () => {
    if (!roomId) return;
    try {
      const snap = await getDoc(doc(db, 'gameResults', roomId));
      if (snap.exists()) {
        setGameResult(snap.data() as GameResult);
      }
    } catch (err) {
      console.error('Error fetching result:', err);
    }
  };

  // 1. Result Screen
  if (gameResult) {
    return (
      <GameResultScreen
        result={gameResult}
        onBackToHome={onExitGame}
        isHost={isHost}
      />
    );
  }

  // 2. No room joined yet -> Entry Screen
  if (!currentRoom) {
    return (
      <GameModeEntry
        onJoinSuccess={handleJoinSuccess}
        onBackToExamLogin={onExitGame}
      />
    );
  }

  // 3. Lobby waiting screen (status === 'waiting')
  if (currentRoom.status === 'waiting') {
    return (
      <GameLobby
        room={currentRoom}
        players={players}
        currentPlayer={currentPlayer}
        isHost={isHost}
        onStartGame={handleStartGame}
        onLeaveLobby={onExitGame}
        onUpdateVehicle={handleUpdateVehicle}
      />
    );
  }

  // 4. In Progress -> Player Screen or Host Screen
  if (currentRoom.status === 'in_progress') {
    if (isHost) {
      return (
        <GameHostScreen
          room={currentRoom}
          players={players}
          onFinishGame={handleShowResults}
          onExit={onExitGame}
        />
      );
    }

    if (currentPlayer) {
      return (
        <GamePlayerScreen
          room={currentRoom}
          player={currentPlayer}
          allPlayers={players}
          onFinishGame={handleShowResults}
        />
      );
    }
  }

  // Fallback Lobby
  return (
    <GameLobby
      room={currentRoom}
      players={players}
      currentPlayer={currentPlayer}
      isHost={isHost}
      onStartGame={handleStartGame}
      onLeaveLobby={onExitGame}
    />
  );
};
