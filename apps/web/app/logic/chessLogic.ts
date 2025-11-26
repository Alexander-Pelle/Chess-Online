export type Color = 'white' | 'black';

export function getPossibleMoves(
  board: number[],
  square: number,
  turn: Color
): number[] {
  const piece = board[square];
  if (piece === 0) return [];

  const isWhitePiece = piece <= 6;
  if ((turn === 'white' && !isWhitePiece) || (turn === 'black' && isWhitePiece)) {
    return [];
  }

  const moves: number[] = [];
  const row = Math.floor(square / 8);
  const col = square % 8;

  const canMoveTo = (targetSquare: number): boolean => {
    if (targetSquare < 0 || targetSquare >= 64) return false;
    const targetPiece = board[targetSquare];
    if (targetPiece === 0) return true;
    const isTargetWhite = targetPiece <= 6;
    return isWhitePiece !== isTargetWhite;
  };

  const addLineMoves = (dr: number, dc: number) => {
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const targetSquare = r * 8 + c;
      if (board[targetSquare] === 0) {
        moves.push(targetSquare);
      } else {
        if (canMoveTo(targetSquare)) moves.push(targetSquare);
        break;
      }
      r += dr;
      c += dc;
    }
  };

  const pieceType = isWhitePiece ? piece : piece - 6;

  switch (pieceType) {
    case 1: { // Pawn
      const direction = isWhitePiece ? -1 : 1;
      const startRow = isWhitePiece ? 6 : 1;

      const oneForward = (row + direction) * 8 + col;
      if (row + direction >= 0 && row + direction < 8 && board[oneForward] === 0) {
        moves.push(oneForward);

        if (row === startRow) {
          const twoForward = (row + 2 * direction) * 8 + col;
          if (board[twoForward] === 0) {
            moves.push(twoForward);
          }
        }
      }

      [-1, 1].forEach((dc) => {
        const captureRow = row + direction;
        const captureCol = col + dc;
        if (captureRow >= 0 && captureRow < 8 && captureCol >= 0 && captureCol < 8) {
          const captureSquare = captureRow * 8 + captureCol;
          const targetPiece = board[captureSquare];
          if (targetPiece > 0) {
            const isTargetWhite = targetPiece <= 6;
            if (isWhitePiece !== isTargetWhite) {
              moves.push(captureSquare);
            }
          }
        }
      });
      break;
    }
    case 2: { // Knight
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2],  [2, -1], [2, 1],
      ];
      knightMoves.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const targetSquare = r * 8 + c;
          if (canMoveTo(targetSquare)) moves.push(targetSquare);
        }
      });
      break;
    }
    case 3: // Bishop
      addLineMoves(-1, -1);
      addLineMoves(-1, 1);
      addLineMoves(1, -1);
      addLineMoves(1, 1);
      break;
    case 4: // Rook
      addLineMoves(-1, 0);
      addLineMoves(1, 0);
      addLineMoves(0, -1);
      addLineMoves(0, 1);
      break;
    case 5: // Queen
      addLineMoves(-1, 0);
      addLineMoves(1, 0);
      addLineMoves(0, -1);
      addLineMoves(0, 1);
      addLineMoves(-1, -1);
      addLineMoves(-1, 1);
      addLineMoves(1, -1);
      addLineMoves(1, 1);
      break;
    case 6: { // King
      const kingMoves = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];
      kingMoves.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const targetSquare = r * 8 + c;
          if (canMoveTo(targetSquare)) moves.push(targetSquare);
        }
      });
      break;
    }
  }

  return moves;
}
