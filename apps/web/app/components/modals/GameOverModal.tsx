import React from 'react';
import type { GameOverInfo } from '../../hooks/useGameOver';

interface Props {
  open: boolean;
  info: GameOverInfo | null;
  onReturnToLobby: () => void;
}

export function GameOverModal({ open, info, onReturnToLobby }: Props) {
  if (!open || !info) return null;

  const borderColor =
    info.color === 'green'
      ? 'border-green-500'
      : info.color === 'red'
      ? 'border-red-500'
      : 'border-gray-500';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border-4 ${borderColor}`}
      >
        <div className="text-8xl mb-4">{info.emoji}</div>
        <h2 className="text-3xl font-bold mb-3 text-zinc-800 dark:text-zinc-100">
          {info.title}
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
          {info.message}
        </p>
        <button
          onClick={onReturnToLobby}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
        >
          Return to Lobby
        </button>
      </div>
    </div>
  );
}
