import { useEffect, useState } from 'react';
import type { Color } from '../logic/chessLogic';

interface GameEndData {
  status: number;
  winner: number | null;
  endReason: number;
}

interface GameStateMinimal {
  status: number;
  winner: number | null;
  endReason: number;
}

export interface GameOverInfo {
  title: string;
  message: string;
  emoji: string;
  color: 'green' | 'red' | 'gray';
}

export function useGameOver(
  gameState: GameStateMinimal | null | undefined,
  playerColor: Color
) {
  const [showModal, setShowModal] = useState(false);
  const [endData, setEndData] = useState<GameEndData | null>(null);

  useEffect(() => {
    if (!gameState) return;

    if (gameState.status !== 0 && !showModal) {
      setEndData({
        status: gameState.status,
        winner: gameState.winner,
        endReason: gameState.endReason,
      });
      setShowModal(true);
    } else if (gameState.status === 0 && showModal) {
      setShowModal(false);
      setEndData(null);
    }
  }, [gameState?.status, gameState?.winner, gameState?.endReason, showModal]);

  const gameOverInfo = endData ? buildGameOverInfo(endData, playerColor) : null;

  return {
    showModal,
    gameOverInfo,
    closeModal: () => setShowModal(false),
  };
}

function buildGameOverInfo(end: GameEndData, playerColor: Color): GameOverInfo {
  const isPlayerWinner =
    (end.winner === 0 && playerColor === 'white') ||
    (end.winner === 1 && playerColor === 'black');

  if (end.status === 3) {
    return {
      title: 'Draw!',
      message: 'The game ended in a stalemate.',
      emoji: '🤝',
      color: 'gray',
    };
  }

  if (end.endReason === 4) {
    if (isPlayerWinner) {
      return {
        title: 'You Win!',
        message: 'Your opponent disconnected.',
        emoji: '🎉',
        color: 'green',
      };
    }
    return {
      title: 'Game Over',
      message: 'You disconnected from the game.',
      emoji: '😔',
      color: 'red',
    };
  }

  if (end.endReason === 3) {
    if (isPlayerWinner) {
      return {
        title: 'You Win!',
        message: 'Your opponent surrendered.',
        emoji: '🎉',
        color: 'green',
      };
    }
    return {
      title: 'You Surrendered',
      message: 'Better luck next time!',
      emoji: '😔',
      color: 'red',
    };
  }

  if (end.endReason === 1) {
    if (isPlayerWinner) {
      return {
        title: 'Checkmate! You Win!',
        message: 'Congratulations on your victory!',
        emoji: '🎉',
        color: 'green',
      };
    }
    return {
      title: 'Checkmate! You Lost',
      message: 'Better luck next time!',
      emoji: '😔',
      color: 'red',
    };
  }

  if (isPlayerWinner) {
    return {
      title: 'You Win!',
      message: 'Congratulations!',
      emoji: '🎉',
      color: 'green',
    };
  }

  return {
    title: 'You Lost',
    message: 'Better luck next time!',
    emoji: '😔',
    color: 'red',
  };
}
