import type { GameState } from './gameProtocol.js';

/**
 * In-memory game registry and helpers
 */

export let nextGameId = 1;

export const games = new Map<number, GameState>();

export function createInitialGameState(): Omit<
  GameState,
  'subscribers' | 'players'
> {
  return {
    board: [
      10, 8, 9, 11, 12, 9, 8, 10, // Black back rank
      7, 7, 7, 7, 7, 7, 7, 7, // Black pawns
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      1, 1, 1, 1, 1, 1, 1, 1, // White pawns
      4, 2, 3, 5, 6, 3, 2, 4, // White back rank
    ],
    turn: 0,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    enPassantSquare: null,
    status: 0,
    winner: null,
    endReason: 0,
  };
}

export function getOrCreateGame(gameId: number): GameState {
  if (!games.has(gameId)) {
    games.set(gameId, {
      ...createInitialGameState(),
      subscribers: new Set(),
      players: {
        white: null,
        black: null,
      },
    });
  }
  return games.get(gameId)!;
}

export function resetGame(game: GameState): void {
  const initialState = createInitialGameState();
  game.board = initialState.board;
  game.turn = initialState.turn;
  game.halfmoveClock = initialState.halfmoveClock;
  game.fullmoveNumber = initialState.fullmoveNumber;
  game.enPassantSquare = initialState.enPassantSquare;
  game.status = initialState.status;
  game.winner = initialState.winner;
  game.endReason = initialState.endReason;
  console.log('Game reset to initial state');
}

export function broadcast(game: GameState, message: Buffer) {
  game.subscribers.forEach((client) => {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
    }
  });
}

export function generateGameId(): number {
  return nextGameId++;
}
