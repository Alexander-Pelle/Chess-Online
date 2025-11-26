import type { GameState } from './gameProtocol.js';

export interface Move {
  from: number;
  to: number;
  promo: number;
}

export enum MoveStatus {
  Ok = 0,
  Illegal = 1,
  GameAlreadyOver = 2,
}

export interface ApplyMoveResult {
  status: MoveStatus;
  stateChanged: boolean;
}

/**
 * Core move application – wraps validity + status updates.
 */
export function applyMove(game: GameState, move: Move): ApplyMoveResult {
  const { from, to } = move;

  if (game.status !== 0) {
    console.log('Game is already over');
    return { status: MoveStatus.GameAlreadyOver, stateChanged: false };
  }

  if (!isValidMove(game, from, to)) {
    console.log(`Invalid move rejected: ${from} → ${to}`);
    return { status: MoveStatus.Illegal, stateChanged: false };
  }

  // Move piece
  game.board[to] = game.board[from];
  game.board[from] = 0;

  // TODO: handle promotion using move.promo

  // Switch turn and update move counters
  if (game.turn === 1) {
    game.fullmoveNumber++;
  }
  game.turn = game.turn === 0 ? 1 : 0;

  // Check for checkmate/stalemate
  checkGameStatus(game);

  return { status: MoveStatus.Ok, stateChanged: true };
}

/**
 * === Chess rule helpers ===
 */

export function findKing(board: number[], isWhite: boolean): number {
  const kingPiece = isWhite ? 6 : 12;
  for (let i = 0; i < 64; i++) {
    if (board[i] === kingPiece) return i;
  }
  return -1;
}

export function isValidMove(game: GameState, from: number, to: number): boolean {
  if (from < 0 || from >= 64 || to < 0 || to >= 64) return false;
  if (from === to) return false;

  const piece = game.board[from];
  const targetPiece = game.board[to];

  if (piece === 0) return false;

  const isWhitePiece = piece <= 6;
  const isWhiteTurn = game.turn === 0;

  if ((isWhitePiece && !isWhiteTurn) || (!isWhitePiece && isWhiteTurn)) {
    return false;
  }

  if (targetPiece > 0) {
    const isTargetWhite = targetPiece <= 6;
    if (isWhitePiece === isTargetWhite) return false;
  }

  const fromRow = Math.floor(from / 8);
  const fromCol = from % 8;
  const toRow = Math.floor(to / 8);
  const toCol = to % 8;
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  const pieceType = isWhitePiece ? piece : piece - 6;

  switch (pieceType) {
    case 1: {
      // Pawn
      const direction = isWhitePiece ? -1 : 1;
      const startRow = isWhitePiece ? 6 : 1;
      const targetPiece = game.board[to];

      if (fromCol === toCol) {
        if (toRow === fromRow + direction && targetPiece === 0) {
          return true;
        }
        if (
          fromRow === startRow &&
          toRow === fromRow + 2 * direction &&
          targetPiece === 0 &&
          game.board[(fromRow + direction) * 8 + fromCol] === 0
        ) {
          return true;
        }
      }
      if (
        colDiff === 1 &&
        toRow === fromRow + direction &&
        targetPiece > 0
      ) {
        return true;
      }
      return false;
    }

    case 2:
      // Knight
      return (
        (rowDiff === 2 && colDiff === 1) ||
        (rowDiff === 1 && colDiff === 2)
      );

    case 3: {
      // Bishop
      if (rowDiff !== colDiff) return false;
      const rowStep = toRow > fromRow ? 1 : -1;
      const colStep = toCol > fromCol ? 1 : -1;
      let r = fromRow + rowStep;
      let c = fromCol + colStep;
      while (r !== toRow) {
        if (game.board[r * 8 + c] !== 0) return false;
        r += rowStep;
        c += colStep;
      }
      return true;
    }

    case 4: {
      // Rook
      if (fromRow !== toRow && fromCol !== toCol) return false;
      if (fromRow === toRow) {
        const colStep = toCol > fromCol ? 1 : -1;
        let c = fromCol + colStep;
        while (c !== toCol) {
          if (game.board[fromRow * 8 + c] !== 0) return false;
          c += colStep;
        }
      } else {
        const rowStep = toRow > fromRow ? 1 : -1;
        let r = fromRow + rowStep;
        while (r !== toRow) {
          if (game.board[r * 8 + fromCol] !== 0) return false;
          r += rowStep;
        }
      }
      return true;
    }

    case 5: {
      // Queen
      if (fromRow === toRow || fromCol === toCol) {
        // rook-like
        if (fromRow === toRow) {
          const colStep = toCol > fromCol ? 1 : -1;
          let c = fromCol + colStep;
          while (c !== toCol) {
            if (game.board[fromRow * 8 + c] !== 0) return false;
            c += colStep;
          }
        } else {
          const rowStep = toRow > fromRow ? 1 : -1;
          let r = fromRow + rowStep;
          while (r !== toRow) {
            if (game.board[r * 8 + fromCol] !== 0) return false;
            r += rowStep;
          }
        }
        return true;
      }

      if (rowDiff === colDiff) {
        const rowStep = toRow > fromRow ? 1 : -1;
        const colStep = toCol > fromCol ? 1 : -1;
        let r = fromRow + rowStep;
        let c = fromCol + colStep;
        while (r !== toRow) {
          if (game.board[r * 8 + c] !== 0) return false;
          r += rowStep;
          c += colStep;
        }
        return true;
      }
      return false;
    }

    case 6:
      // King
      return rowDiff <= 1 && colDiff <= 1;

    default:
      return false;
  }
}

export function isSquareAttacked(
  game: GameState,
  square: number,
  byWhite: boolean
): boolean {
  for (let from = 0; from < 64; from++) {
    const piece = game.board[from];
    if (piece === 0) continue;

    const isPieceWhite = piece <= 6;
    if (isPieceWhite !== byWhite) continue;

    const originalTurn = game.turn;
    game.turn = byWhite ? 0 : 1;
    const canAttack = isValidMove(game, from, square);
    game.turn = originalTurn;

    if (canAttack) return true;
  }
  return false;
}

export function isInCheck(game: GameState, isWhite: boolean): boolean {
  const kingSquare = findKing(game.board, isWhite);
  if (kingSquare === -1) return false;
  return isSquareAttacked(game, kingSquare, !isWhite);
}

export function hasAnyLegalMoves(game: GameState, isWhite: boolean): boolean {
  for (let from = 0; from < 64; from++) {
    const piece = game.board[from];
    if (piece === 0) continue;

    const isPieceWhite = piece <= 6;
    if (isPieceWhite !== isWhite) continue;

    for (let to = 0; to < 64; to++) {
      if (isValidMove(game, from, to)) {
        return true;
      }
    }
  }
  return false;
}

export function checkGameStatus(game: GameState): void {
  const isWhiteTurn = game.turn === 0;
  const inCheck = isInCheck(game, isWhiteTurn);
  const hasLegalMoves = hasAnyLegalMoves(game, isWhiteTurn);

  if (!hasLegalMoves) {
    if (inCheck) {
      game.status = isWhiteTurn ? 2 : 1; // black/white wins
      game.winner = isWhiteTurn ? 1 : 0;
      game.endReason = 1; // Checkmate
      console.log(
        `Checkmate! ${isWhiteTurn ? 'Black' : 'White'} wins!`
      );
    } else {
      game.status = 3; // Draw
      game.winner = null;
      game.endReason = 2; // Stalemate
      console.log('Stalemate!');
    }
  }
}
