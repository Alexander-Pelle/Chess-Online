// Game protocol message types
export const JOIN_GAME = 1;
export const MOVE_PIECE = 2;
export const SURRENDER = 3;
export const RESET_GAME = 4;
export const CREATE_GAME = 5;
export const LIST_GAMES = 6;

// Game state interface
export interface Player {
    ws: any; // WebSocket type
    color: 0 | 1; // 0 = white, 1 = black
}

export interface GameState {
    board: number[];
    turn: number;
    halfmoveClock: number;
    fullmoveNumber: number;
    enPassantSquare: number | null;
    subscribers: Set<any>; // Set<WebSocket>
    status: number; // 0 = ongoing, 1 = white wins, 2 = black wins, 3 = stalemate
    winner: number | null; // 0 = white, 1 = black, null = no winner
    endReason: number; // 0 = none, 1 = checkmate, 2 = stalemate, 3 = surrender, 4 = disconnect
    players: {
        white: any | null; // WebSocket | null
        black: any | null; // WebSocket | null
    };
}

// Encoding functions
export function encodeGameState(gameId: number, state: GameState, assignedColor?: number): Buffer {
    const buffer = Buffer.alloc(76);

    buffer.writeUInt8(gameId, 0);
    buffer.writeUInt32BE(state.turn, 1);

    for (let i = 0; i < 64; i++) {
        buffer.writeUInt8(state.board[i], 5 + i);
    }

    buffer.writeUInt8(state.halfmoveClock, 69);
    buffer.writeUInt8(state.fullmoveNumber, 70);
    buffer.writeUInt8(state.enPassantSquare ?? 255, 71);
    buffer.writeUInt8(state.status, 72);
    buffer.writeUInt8(state.winner ?? 255, 73);
    buffer.writeUInt8(assignedColor ?? 255, 74);
    buffer.writeUInt8(state.endReason, 75);

    return buffer;
}

export function encodeJoinError(gameId: number, errorCode: number): Buffer {
    const buffer = Buffer.alloc(6);
    
    buffer.writeUInt8(100, 0); // Error message type
    buffer.writeUInt32BE(gameId, 1);
    buffer.writeUInt8(errorCode, 5); // 1 = game full
    
    return buffer;
}

export function encodeGameCreated(gameId: number): Buffer {
    const buffer = Buffer.alloc(5);
    
    buffer.writeUInt8(102, 0); // Game created message type
    buffer.writeUInt32BE(gameId, 1);
    
    return buffer;
}

export function encodeMoveResult(gameId: number, move: { from: number, to: number, promo: number }, status: number): Buffer {
    const buffer = Buffer.alloc(9);

    buffer.writeUInt8(101, 0);
    buffer.writeUInt32BE(gameId, 1);
    buffer.writeUInt8(move.from, 5);
    buffer.writeUInt8(move.to, 6);
    buffer.writeUInt8(move.promo, 7);
    buffer.writeUInt8(status, 8);
    
    return buffer;
}

export interface AvailableGame {
    gameId: number;
    availableColor: 0 | 1; // 0 = white available, 1 = black available
}

export function encodeGameList(games: AvailableGame[]): Buffer {
    // Message type (1 byte) + game count (1 byte) + games (5 bytes each: 4 for ID + 1 for color)
    const buffer = Buffer.alloc(2 + games.length * 5);
    
    buffer.writeUInt8(103, 0); // List games response type
    buffer.writeUInt8(games.length, 1);
    
    let offset = 2;
    for (const game of games) {
        buffer.writeUInt32BE(game.gameId, offset);
        buffer.writeUInt8(game.availableColor, offset + 4);
        offset += 5;
    }
    
    return buffer;
}

