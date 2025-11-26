'use client';

import React from 'react';

interface ChessBoardProps {
  board: number[];
  onSquareClick: (square: number) => void;
  selectedSquare: number | null;
  validMoves: number[];
  playerColor: 'white' | 'black';
}

// Piece encoding: 0=empty, 1-6=white pieces, 7-12=black pieces
// 1=P, 2=N, 3=B, 4=R, 5=Q, 6=K (white)
// 7=p, 8=n, 9=b, 10=r, 11=q, 12=k (black)
const PIECE_SYMBOLS: { [key: number]: string } = {
  0: '',
  1: '♙', 2: '♘', 3: '♗', 4: '♖', 5: '♕', 6: '♔',
  7: '♟', 8: '♞', 9: '♝', 10: '♜', 11: '♛', 12: '♚'
};

export default function ChessBoard({
  board,
  onSquareClick,
  selectedSquare,
  validMoves,
  playerColor
}: ChessBoardProps) {
  const isLightSquare = (row: number, col: number) => (row + col) % 2 === 0;
  
  const getSquareIndex = (row: number, col: number) => {
    // If playing as black, flip the board
    if (playerColor === 'black') {
      return (7 - row) * 8 + (7 - col);
    }
    return row * 8 + col;
  };

  const getFileLabel = (col: number) => {
    const files = playerColor === 'white' 
      ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
    return files[col];
  };

  const getRankLabel = (row: number) => {
    return playerColor === 'white' ? 8 - row : row + 1;
  };

  return (
    <div className="relative inline-block">
      {/* File labels (a-h) */}
      <div className="flex pl-8">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(col => (
          <div 
            key={col} 
            className="w-16 h-6 flex items-center justify-center text-sm font-semibold text-zinc-600 dark:text-zinc-400"
          >
            {getFileLabel(col)}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Rank labels (1-8) */}
        <div className="flex flex-col">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(row => (
            <div 
              key={row} 
              className="w-8 h-16 flex items-center justify-center text-sm font-semibold text-zinc-600 dark:text-zinc-400"
            >
              {getRankLabel(row)}
            </div>
          ))}
        </div>

        {/* Chess board */}
        <div className="grid grid-cols-8 gap-0 border-4 border-zinc-800 dark:border-zinc-700 shadow-2xl rounded-lg overflow-hidden">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(row =>
            [0, 1, 2, 3, 4, 5, 6, 7].map(col => {
              const squareIndex = getSquareIndex(row, col);
              const piece = board[squareIndex];
              const isLight = isLightSquare(row, col);
              const isSelected = selectedSquare === squareIndex;
              const isValidMove = validMoves.includes(squareIndex);
              
              return (
                <button
                  key={squareIndex}
                  onClick={() => onSquareClick(squareIndex)}
                  className={`
                    w-16 h-16 flex items-center justify-center text-5xl
                    transition-all duration-150 relative
                    ${isLight 
                      ? 'bg-amber-100 dark:bg-amber-200' 
                      : 'bg-amber-700 dark:bg-amber-800'
                    }
                    ${isSelected 
                      ? 'ring-4 ring-blue-500 ring-inset' 
                      : ''
                    }
                    hover:opacity-80
                  `}
                >
                  {piece > 0 && (
                    <span className={`
                      ${piece <= 6 ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.3)]'}
                    `}>
                      {PIECE_SYMBOLS[piece]}
                    </span>
                  )}
                  {isValidMove && (
                    <div className={`
                      absolute inset-0 flex items-center justify-center
                      pointer-events-none
                    `}>
                      <div className={`
                        w-4 h-4 rounded-full
                        ${piece > 0 
                          ? 'border-4 border-green-500 w-14 h-14' 
                          : 'bg-green-500 opacity-40'
                        }
                      `} />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

