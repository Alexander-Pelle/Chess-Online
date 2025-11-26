'use client';

import React, { useState, useEffect } from 'react';
import ChessBoard from './ChessBoard';
import GameInfo from '../ui/GameInfo';
import VoiceChat from '../buttons/VoiceChat';
import { useChessWebSocket } from '../../hooks/useChessWebSocket';
import { WS_URL } from '../../config/websocket';

interface ChessGameProps {
  gameId: number;
  playerColor: 'white' | 'black';
  onReturnToLobby: () => void;
}

export default function ChessGame({ gameId, playerColor, onReturnToLobby }: ChessGameProps) {
  const { connected, gameState, sendMove, surrender, assignedColor, joinError, wsRef } = useChessWebSocket(gameId, playerColor, WS_URL);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [capturedPieces, setCapturedPieces] = useState({
    white: [] as number[],
    black: [] as number[]
  });
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameEndData, setGameEndData] = useState<{status: number, winner: number | null, endReason: number} | null>(null);
  
  // Use assigned color from server if available
  const actualPlayerColor = assignedColor || playerColor;
  
  // Track captured pieces by comparing current board with starting position
  useEffect(() => {
    if (!gameState?.board) return;

    const startingPieces = {
      white: [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6], // 8 pawns, 2 knights, 2 bishops, 2 rooks, 1 queen, 1 king
      black: [7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 9, 9, 10, 10, 11, 12]
    };

    const currentPieces = {
      white: [] as number[],
      black: [] as number[]
    };

    // Count pieces on the current board
    gameState.board.forEach(piece => {
      if (piece >= 1 && piece <= 6) {
        currentPieces.white.push(piece);
      } else if (piece >= 7 && piece <= 12) {
        currentPieces.black.push(piece);
      }
    });

    // Calculate captured pieces (pieces that were in starting position but not on current board)
    const captured = {
      white: [] as number[],
      black: [] as number[]
    };

    // Find captured white pieces
    const whitePiecesCopy = [...startingPieces.white];
    currentPieces.white.forEach(piece => {
      const index = whitePiecesCopy.indexOf(piece);
      if (index > -1) {
        whitePiecesCopy.splice(index, 1);
      }
    });
    captured.white = whitePiecesCopy;

    // Find captured black pieces
    const blackPiecesCopy = [...startingPieces.black];
    currentPieces.black.forEach(piece => {
      const index = blackPiecesCopy.indexOf(piece);
      if (index > -1) {
        blackPiecesCopy.splice(index, 1);
      }
    });
    captured.black = blackPiecesCopy;

    setCapturedPieces(captured);
  }, [gameState?.board]);

  // Watch for game over and show modal (capture end data once)
  useEffect(() => {
    if (gameState && gameState.status !== 0 && !showGameOverModal) {
      // Capture the game end data so it doesn't change even if server resets
      setGameEndData({
        status: gameState.status,
        winner: gameState.winner,
        endReason: gameState.endReason
      });
      setShowGameOverModal(true);
    } else if (gameState && gameState.status === 0 && showGameOverModal) {
      // Clear modal and reset UI state when game is reset
      console.log('🔄 Game reset detected, clearing game over modal and UI state');
      setShowGameOverModal(false);
      setGameEndData(null);
      setSelectedSquare(null);
      setValidMoves([]);
      setShowSurrenderConfirm(false);
      setCapturedPieces({ white: [], black: [] }); // Reset captured pieces
    }
  }, [gameState?.status, showGameOverModal]);

  // Initialize board with starting position if no game state
  const defaultBoard = [
    10, 8, 9, 11, 12, 9, 8, 10,  // Black back rank
    7, 7, 7, 7, 7, 7, 7, 7,      // Black pawns
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1,      // White pawns
    4, 2, 3, 5, 6, 3, 2, 4       // White back rank
  ];

  const board = gameState?.board || defaultBoard;
  const turn = gameState?.turn === 0 ? 'white' : 'black';
  const moveCount = gameState?.fullmoveNumber || 1;
  const gameStatus = gameState?.status || 0;

  // Chess piece move generation
  const getPossibleMoves = (square: number): number[] => {
    const piece = board[square];
    if (piece === 0) return [];
    
    const isWhitePiece = piece <= 6;
    if ((turn === 'white' && !isWhitePiece) || (turn === 'black' && isWhitePiece)) {
      return [];
    }
    
    const moves: number[] = [];
    const row = Math.floor(square / 8);
    const col = square % 8;
    
    // Helper: Check if target square is valid (not own piece)
    const canMoveTo = (targetSquare: number): boolean => {
      if (targetSquare < 0 || targetSquare >= 64) return false;
      const targetPiece = board[targetSquare];
      if (targetPiece === 0) return true; // Empty square
      const isTargetWhite = targetPiece <= 6;
      return isWhitePiece !== isTargetWhite; // Can capture opponent
    };
    
    // Helper: Add moves in a direction until blocked
    const addLineMoves = (dr: number, dc: number) => {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const targetSquare = r * 8 + c;
        if (board[targetSquare] === 0) {
          moves.push(targetSquare);
        } else {
          if (canMoveTo(targetSquare)) moves.push(targetSquare);
          break; // Blocked by piece
        }
        r += dr;
        c += dc;
      }
    };
    
    // Piece type (1-6 white, 7-12 black)
    const pieceType = isWhitePiece ? piece : piece - 6;
    
    switch (pieceType) {
      case 1: // Pawn
        const direction = isWhitePiece ? -1 : 1; // White moves up (-1), black down (+1)
        const startRow = isWhitePiece ? 6 : 1;
        
        // Forward one square
        const oneForward = (row + direction) * 8 + col;
        if (row + direction >= 0 && row + direction < 8 && board[oneForward] === 0) {
          moves.push(oneForward);
          
          // Forward two squares from starting position
          if (row === startRow) {
            const twoForward = (row + 2 * direction) * 8 + col;
            if (board[twoForward] === 0) {
              moves.push(twoForward);
            }
          }
        }
        
        // Diagonal captures
        [-1, 1].forEach(dc => {
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
        
      case 2: // Knight
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        knightMoves.forEach(([dr, dc]) => {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const targetSquare = r * 8 + c;
            if (canMoveTo(targetSquare)) {
              moves.push(targetSquare);
            }
          }
        });
        break;
        
      case 3: // Bishop
        addLineMoves(-1, -1); // Up-left
        addLineMoves(-1, 1);  // Up-right
        addLineMoves(1, -1);  // Down-left
        addLineMoves(1, 1);   // Down-right
        break;
        
      case 4: // Rook
        addLineMoves(-1, 0);  // Up
        addLineMoves(1, 0);   // Down
        addLineMoves(0, -1);  // Left
        addLineMoves(0, 1);   // Right
        break;
        
      case 5: // Queen
        // Combine rook and bishop moves
        addLineMoves(-1, 0);  // Up
        addLineMoves(1, 0);   // Down
        addLineMoves(0, -1);  // Left
        addLineMoves(0, 1);   // Right
        addLineMoves(-1, -1); // Up-left
        addLineMoves(-1, 1);  // Up-right
        addLineMoves(1, -1);  // Down-left
        addLineMoves(1, 1);   // Down-right
        break;
        
      case 6: // King
        const kingMoves = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1]
        ];
        kingMoves.forEach(([dr, dc]) => {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const targetSquare = r * 8 + c;
            if (canMoveTo(targetSquare)) {
              moves.push(targetSquare);
            }
          }
        });
        break;
    }
    
    return moves;
  };

  const handleSquareClick = (square: number) => {
    // Don't allow moves if game is over
    if (gameStatus !== 0) {
      console.log('Game is over, no more moves allowed');
      return;
    }
    
    console.log('Square clicked:', square, 'Current turn:', turn, 'Player color:', actualPlayerColor);
    
    // If no square selected, select this square
    if (selectedSquare === null) {
      const piece = board[square];
      console.log('Piece at square:', piece);
      
      if (piece > 0) {
        const isWhitePiece = piece <= 6;
        const isPieceOwnedByPlayer = 
          (actualPlayerColor === 'white' && isWhitePiece) || 
          (actualPlayerColor === 'black' && !isWhitePiece);
        
        console.log('Is white piece:', isWhitePiece, 'Is owned by player:', isPieceOwnedByPlayer);
        
        if (isPieceOwnedByPlayer && turn === actualPlayerColor) {
          const possibleMoves = getPossibleMoves(square);
          console.log('Selected square:', square, 'Possible moves:', possibleMoves);
          setSelectedSquare(square);
          setValidMoves(possibleMoves);
        } else {
          console.log('Cannot select: not your turn or not your piece');
        }
      }
    } else {
      // If clicking the same square, deselect
      if (selectedSquare === square) {
        console.log('Deselecting square');
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        // Try to make a move
        console.log('Attempting move from', selectedSquare, 'to', square);
        
        // Check if target square is in valid moves
        if (validMoves.includes(square)) {
          console.log('Valid move! Sending to server...');
          sendMove(selectedSquare, square, 0);
          setSelectedSquare(null);
          setValidMoves([]);
        } else {
          console.log('Invalid move, trying to select new piece');
          // Select new piece if it's player's piece
          const piece = board[square];
          if (piece > 0) {
            const isWhitePiece = piece <= 6;
            const isPieceOwnedByPlayer = 
              (actualPlayerColor === 'white' && isWhitePiece) || 
              (actualPlayerColor === 'black' && !isWhitePiece);
            
            if (isPieceOwnedByPlayer && turn === actualPlayerColor) {
              const possibleMoves = getPossibleMoves(square);
              console.log('Selected new square:', square, 'Possible moves:', possibleMoves);
              setSelectedSquare(square);
              setValidMoves(possibleMoves);
            } else {
              // Clicked invalid square, just deselect
              setSelectedSquare(null);
              setValidMoves([]);
            }
          } else {
            // Clicked empty square that's not a valid move
            setSelectedSquare(null);
            setValidMoves([]);
          }
        }
      }
    }
  };

  const handleSurrender = () => {
    surrender(actualPlayerColor);
    setShowSurrenderConfirm(false);
  };

  const getGameOverMessage = () => {
    // Use captured end data instead of current game state
    if (!gameEndData) return null;
    
    const isPlayerWinner = (gameEndData.winner === 0 && actualPlayerColor === 'white') || 
                           (gameEndData.winner === 1 && actualPlayerColor === 'black');
    
    // endReason: 1 = checkmate, 2 = stalemate, 3 = surrender, 4 = disconnect
    if (gameEndData.status === 3) {
      return {
        title: 'Draw!',
        message: 'The game ended in a stalemate.',
        emoji: '🤝',
        color: 'gray'
      };
    }
    
    if (gameEndData.endReason === 4) {
      // Disconnect
      if (isPlayerWinner) {
        return {
          title: 'You Win!',
          message: 'Your opponent disconnected.',
          emoji: '🎉',
          color: 'green'
        };
      } else {
        return {
          title: 'Game Over',
          message: 'You disconnected from the game.',
          emoji: '😔',
          color: 'red'
        };
      }
    }
    
    if (gameEndData.endReason === 3) {
      // Surrender
      if (isPlayerWinner) {
        return {
          title: 'You Win!',
          message: 'Your opponent surrendered.',
          emoji: '🎉',
          color: 'green'
        };
      } else {
        return {
          title: 'You Surrendered',
          message: 'Better luck next time!',
          emoji: '😔',
          color: 'red'
        };
      }
    }
    
    if (gameEndData.endReason === 1) {
      // Checkmate
      if (isPlayerWinner) {
        return {
          title: 'Checkmate! You Win!',
          message: 'Congratulations on your victory!',
          emoji: '🎉',
          color: 'green'
        };
      } else {
        return {
          title: 'Checkmate! You Lost',
          message: 'Better luck next time!',
          emoji: '😔',
          color: 'red'
        };
      }
    }
    
    // Default win/loss
    if (isPlayerWinner) {
      return {
        title: 'You Win!',
        message: 'Congratulations!',
        emoji: '🎉',
        color: 'green'
      };
    } else {
      return {
        title: 'You Lost',
        message: 'Better luck next time!',
        emoji: '😔',
        color: 'red'
      };
    }
  };

  // Show error if game is full
  if (joinError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="bg-red-500 text-white rounded-lg p-8 shadow-lg max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <div className="text-2xl font-bold mb-4">Cannot Join Game</div>
          <div className="text-lg mb-6">{joinError}</div>
          <button
            onClick={onReturnToLobby}
            className="py-3 px-6 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition-all"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const gameOverInfo = getGameOverMessage();

  return (
    <>
      {/* Game Over Modal */}
      {showGameOverModal && gameOverInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border-4 ${
            gameOverInfo.color === 'green' ? 'border-green-500' :
            gameOverInfo.color === 'red' ? 'border-red-500' :
            'border-gray-500'
          }`}>
            <div className="text-8xl mb-4">{gameOverInfo.emoji}</div>
            <h2 className="text-3xl font-bold mb-3 text-zinc-800 dark:text-zinc-100">
              {gameOverInfo.title}
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
              {gameOverInfo.message}
            </p>
            <button
              onClick={onReturnToLobby}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-8 items-start justify-center p-8">
        <ChessBoard
          board={board}
          onSquareClick={handleSquareClick}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          playerColor={actualPlayerColor}
        />
        <div className="flex flex-col gap-4">
          <GameInfo
            gameId={gameId}
            turn={turn}
            playerColor={actualPlayerColor}
            connected={connected}
            moveCount={moveCount}
            capturedPieces={capturedPieces}
          />

          {/* Voice Chat */}
          {gameStatus === 0 && wsRef.current && (
            <VoiceChat 
              gameId={gameId} 
              playerColor={actualPlayerColor}
              wsRef={wsRef}
            />
          )}
          
          {/* Surrender Button */}
          {gameStatus === 0 && !showSurrenderConfirm && (
            <button
              onClick={() => setShowSurrenderConfirm(true)}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition-all"
            >
              Surrender
            </button>
          )}
          
          {/* Surrender Confirmation */}
          {showSurrenderConfirm && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-lg border-2 border-red-500">
              <div className="text-center mb-4 font-semibold text-zinc-800 dark:text-zinc-200">
                Are you sure you want to surrender?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSurrender}
                  className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all"
                >
                  Yes, Surrender
                </button>
                <button
                  onClick={() => setShowSurrenderConfirm(false)}
                  className="flex-1 py-2 px-4 bg-zinc-600 hover:bg-zinc-700 text-white font-semibold rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
