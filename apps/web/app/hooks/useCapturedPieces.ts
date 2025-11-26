import { useEffect, useState } from 'react';
import { STARTING_PIECES } from '../constants/chess';

export interface CapturedPieces {
  white: number[];
  black: number[];
}

export function useCapturedPieces(board?: number[] | null): CapturedPieces {
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({
    white: [],
    black: [],
  });

  useEffect(() => {
    if (!board) {
      setCapturedPieces({ white: [], black: [] });
      return;
    }

    const currentPieces = {
      white: [] as number[],
      black: [] as number[],
    };

    board.forEach((piece) => {
      if (piece >= 1 && piece <= 6) currentPieces.white.push(piece);
      else if (piece >= 7 && piece <= 12) currentPieces.black.push(piece);
    });

    const whitePiecesCopy = [...STARTING_PIECES.white];
    currentPieces.white.forEach((p) => {
      const idx = whitePiecesCopy.indexOf(p);
      if (idx > -1) whitePiecesCopy.splice(idx, 1);
    });

    const blackPiecesCopy = [...STARTING_PIECES.black];
    currentPieces.black.forEach((p) => {
      const idx = blackPiecesCopy.indexOf(p);
      if (idx > -1) blackPiecesCopy.splice(idx, 1);
    });

    setCapturedPieces({
      white: whitePiecesCopy,
      black: blackPiecesCopy,
    });
  }, [board]);

  return capturedPieces;
}