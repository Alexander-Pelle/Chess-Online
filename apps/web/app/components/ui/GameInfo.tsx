'use client';

import React from 'react';

interface GameInfoProps {
  gameId: number;
  turn: 'white' | 'black';
  playerColor: 'white' | 'black';
  connected: boolean;
  moveCount: number;
  capturedPieces: {
    white: number[];
    black: number[];
  };
}

const PIECE_SYMBOLS: { [key: number]: string } = {
  1: '♙', 2: '♘', 3: '♗', 4: '♖', 5: '♕', 6: '♔',
  7: '♟', 8: '♞', 9: '♝', 10: '♜', 11: '♛', 12: '♚'
};

export default function GameInfo({
  gameId,
  turn,
  playerColor,
  connected,
  moveCount,
  capturedPieces
}: GameInfoProps) {
  const isPlayerTurn = turn === playerColor;

  return (
    <div className="flex flex-col gap-4 min-w-[280px]">
      {/* Connection Status */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Game ID: {gameId}
        </div>
      </div>

      {/* Turn Indicator */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          Current Turn
        </div>
        <div className={`
          text-2xl font-bold capitalize
          ${turn === 'white' ? 'text-amber-100' : 'text-zinc-800 dark:text-zinc-200'}
        `}>
          {turn}
        </div>
        {isPlayerTurn && (
          <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-semibold">
            Your turn!
          </div>
        )}
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Move: {moveCount}
        </div>
      </div>


      {/* Captured Pieces */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
          Captured Pieces
        </div>
        
        {/* White captured (black pieces captured BY white) */}
        <div className="mb-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">White captured</div>
          <div className="flex flex-wrap gap-1 text-2xl min-h-[32px]">
            {capturedPieces.black.map((piece, idx) => (
              <span key={idx} className="text-black dark:text-zinc-200 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]">
                {PIECE_SYMBOLS[piece]}
              </span>
            ))}
            {capturedPieces.black.length === 0 && (
              <span className="text-xs text-zinc-400">None</span>
            )}
          </div>
        </div>

        {/* Black captured (white pieces captured BY black) */}
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Black captured</div>
          <div className="flex flex-wrap gap-1 text-2xl min-h-[32px]">
            {capturedPieces.white.map((piece, idx) => (
              <span key={idx} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {PIECE_SYMBOLS[piece]}
              </span>
            ))}
            {capturedPieces.white.length === 0 && (
              <span className="text-xs text-zinc-400">None</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

