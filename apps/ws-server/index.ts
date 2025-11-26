import { WebSocketServer, WebSocket } from 'ws';

const PORT = 9001;

const JOIN_GAME = 1;
const MOVE_MOVE = 2;
const SURRENDER = 3;
const RESET_GAME = 4;
const CREATE_GAME = 5;

// Track next available game ID
let nextGameId = 1;

interface Player {
    ws: WebSocket;
    color: 0 | 1; // 0 = white, 1 = black
}

interface GameState {
    board: number[];
    turn: number;
    halfmoveClock: number;
    fullmoveNumber: number;
    enPassantSquare: number | null;
    subscribers: Set<WebSocket>;
    status: number; // 0 = ongoing, 1 = white wins, 2 = black wins, 3 = stalemate
    winner: number | null; // 0 = white, 1 = black, null = no winner
    endReason: number; // 0 = none, 1 = checkmate, 2 = stalemate, 3 = surrender, 4 = disconnect
    players: {
        white: WebSocket | null;
        black: WebSocket | null;
    };
}

const games = new Map<number, GameState>();

function createInitialGameState(): Omit<GameState, 'subscribers' | 'players'> {
    return {
        board: [
            10, 8, 9, 11, 12, 9, 8, 10,  // Black back rank
            7, 7, 7, 7, 7, 7, 7, 7,      // Black pawns
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            1, 1, 1, 1, 1, 1, 1, 1,      // White pawns
            4, 2, 3, 5, 6, 3, 2, 4       // White back rank
        ],
        turn: 0, // 0 = white, 1 = black
        halfmoveClock: 0,
        fullmoveNumber: 1,
        enPassantSquare: null,
        status: 0, // 0 = ongoing
        winner: null,
        endReason: 0 // 0 = none
    };
}

function getOrCreateGame(gameId: number): GameState {
    if (!games.has(gameId)) {
        games.set(gameId, {
            ...createInitialGameState(),
            subscribers: new Set(),
            players: {
                white: null,
                black: null
            }
        });
    }
    return games.get(gameId)!;
}

function resetGame(game: GameState): void {
    const initialState = createInitialGameState();
    game.board = initialState.board;
    game.turn = initialState.turn;
    game.halfmoveClock = initialState.halfmoveClock;
    game.fullmoveNumber = initialState.fullmoveNumber;
    game.enPassantSquare = initialState.enPassantSquare;
    game.status = initialState.status;
    game.winner = initialState.winner;
    console.log('Game reset to initial state');
}

function isValidMove(game: GameState, from: number, to: number): boolean {
    if (from < 0 || from >= 64 || to < 0 || to >= 64) return false;
    if (from === to) return false;
    
    const piece = game.board[from];
    const targetPiece = game.board[to];
    
    if (piece === 0) return false;
    
    const isWhitePiece = piece <= 6;
    const isWhiteTurn = game.turn === 0;
    
    // Check if it's the correct player's turn
    if ((isWhitePiece && !isWhiteTurn) || (!isWhitePiece && isWhiteTurn)) {
        return false;
    }
    
    // Can't capture own piece
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
        case 1: { // Pawn
            const direction = isWhitePiece ? -1 : 1;
            const startRow = isWhitePiece ? 6 : 1;
            
            // Forward move
            if (fromCol === toCol) {
                if (toRow === fromRow + direction && targetPiece === 0) return true;
                if (fromRow === startRow && toRow === fromRow + 2 * direction && 
                    targetPiece === 0 && game.board[(fromRow + direction) * 8 + fromCol] === 0) {
                    return true;
                }
            }
            // Diagonal capture
            if (colDiff === 1 && toRow === fromRow + direction && targetPiece > 0) {
                return true;
            }
            return false;
        }
        
        case 2: // Knight
            return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
        
        case 3: { // Bishop
            if (rowDiff !== colDiff) return false;
            // Check path is clear
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
        
        case 4: { // Rook
            if (fromRow !== toRow && fromCol !== toCol) return false;
            // Check path is clear
            if (fromRow === toRow) {
                const colStep = toCol > fromCol ? 1 : -1;
                for (let c = fromCol + colStep; c !== toCol; c += colStep) {
                    if (game.board[fromRow * 8 + c] !== 0) return false;
                }
            } else {
                const rowStep = toRow > fromRow ? 1 : -1;
                for (let r = fromRow + rowStep; r !== toRow; r += rowStep) {
                    if (game.board[r * 8 + fromCol] !== 0) return false;
                }
            }
            return true;
        }
        
        case 5: { // Queen (rook + bishop)
            const isRookMove = fromRow === toRow || fromCol === toCol;
            const isBishopMove = rowDiff === colDiff;
            if (!isRookMove && !isBishopMove) return false;
            
            // Check path is clear
            if (isRookMove) {
                if (fromRow === toRow) {
                    const colStep = toCol > fromCol ? 1 : -1;
                    for (let c = fromCol + colStep; c !== toCol; c += colStep) {
                        if (game.board[fromRow * 8 + c] !== 0) return false;
                    }
                } else {
                    const rowStep = toRow > fromRow ? 1 : -1;
                    for (let r = fromRow + rowStep; r !== toRow; r += rowStep) {
                        if (game.board[r * 8 + fromCol] !== 0) return false;
                    }
                }
            } else {
                const rowStep = toRow > fromRow ? 1 : -1;
                const colStep = toCol > fromCol ? 1 : -1;
                let r = fromRow + rowStep;
                let c = fromCol + colStep;
                while (r !== toRow) {
                    if (game.board[r * 8 + c] !== 0) return false;
                    r += rowStep;
                    c += colStep;
                }
            }
            return true;
        }
        
        case 6: // King
            return rowDiff <= 1 && colDiff <= 1;
        
        default:
            return false;
    }
}

function findKing(board: number[], isWhite: boolean): number {
    const kingPiece = isWhite ? 6 : 12;
    for (let i = 0; i < 64; i++) {
        if (board[i] === kingPiece) return i;
    }
    return -1;
}

function isSquareAttacked(game: GameState, square: number, byWhite: boolean): boolean {
    // Check if the given square is attacked by any piece of the specified color
    for (let from = 0; from < 64; from++) {
        const piece = game.board[from];
        if (piece === 0) continue;
        
        const isPieceWhite = piece <= 6;
        if (isPieceWhite !== byWhite) continue;
        
        // Temporarily allow checking attacks without turn validation
        const originalTurn = game.turn;
        game.turn = byWhite ? 0 : 1;
        const canAttack = isValidMove(game, from, square);
        game.turn = originalTurn;
        
        if (canAttack) return true;
    }
    return false;
}

function isInCheck(game: GameState, isWhite: boolean): boolean {
    const kingSquare = findKing(game.board, isWhite);
    if (kingSquare === -1) return false;
    return isSquareAttacked(game, kingSquare, !isWhite);
}

function hasAnyLegalMoves(game: GameState, isWhite: boolean): boolean {
    // Check if the specified color has any legal moves
    for (let from = 0; from < 64; from++) {
        const piece = game.board[from];
        if (piece === 0) continue;
        
        const isPieceWhite = piece <= 6;
        if (isPieceWhite !== isWhite) continue;
        
        // Try all possible moves for this piece
        for (let to = 0; to < 64; to++) {
            if (isValidMove(game, from, to)) {
                return true;
            }
        }
    }
    return false;
}

function checkGameStatus(game: GameState): void {
    const isWhiteTurn = game.turn === 0;
    const inCheck = isInCheck(game, isWhiteTurn);
    const hasLegalMoves = hasAnyLegalMoves(game, isWhiteTurn);
    
    if (!hasLegalMoves) {
        if (inCheck) {
            // Checkmate
            game.status = isWhiteTurn ? 2 : 1; // Opponent wins
            game.winner = isWhiteTurn ? 1 : 0;
            game.endReason = 1; // Checkmate
            console.log(`Checkmate! ${isWhiteTurn ? 'Black' : 'White'} wins!`);
        } else {
            // Stalemate
            game.status = 3;
            game.winner = null;
            game.endReason = 2; // Stalemate
            console.log('Stalemate!');
        }
    }
}

function applyMove(game: GameState, move: { from: number, to: number, promo: number }) {
    const { from, to } = move;
    
    // Check if game is already over
    if (game.status !== 0) {
        console.log('Game is already over');
        return { status: 2, stateChanged: false }; // 2 = game over
    }
    
    // Validate the move
    if (!isValidMove(game, from, to)) {
        console.log(`Invalid move rejected: ${from} → ${to}`);
        return { status: 1, stateChanged: false }; // 1 = invalid move
    }
    
    // Apply the move
    game.board[to] = game.board[from];
    game.board[from] = 0;
    game.turn = game.turn === 0 ? 1 : 0;
    if (game.turn === 0) {
        game.fullmoveNumber++;
    }
    
    // Check for checkmate or stalemate
    checkGameStatus(game);
    
    console.log(`Valid move applied: ${from} → ${to}`);
    return { status: 0, stateChanged: true }; // 0 = success
}

function encodeGameState(gameId: number, state: GameState, assignedColor?: number): Buffer {
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
    buffer.writeUInt8(assignedColor ?? 255, 74); // 255 = no assignment (spectator)
    buffer.writeUInt8(state.endReason, 75); // 0 = none, 1 = checkmate, 2 = stalemate, 3 = surrender, 4 = disconnect

    return buffer;
}

function encodeJoinError(gameId: number, errorCode: number): Buffer {
    const buffer = Buffer.alloc(6);
    
    buffer.writeUInt8(100, 0); // Error message type
    buffer.writeUInt32BE(gameId, 1);
    buffer.writeUInt8(errorCode, 5); // 1 = game full
    
    return buffer;
}

function encodeGameCreated(gameId: number): Buffer {
    const buffer = Buffer.alloc(5);
    
    buffer.writeUInt8(102, 0); // Game created message type
    buffer.writeUInt32BE(gameId, 1);
    
    return buffer;
}

function encodeMoveResult(gameId: number, move: { from: number, to: number, promo: number }, status: number): Buffer {
    const buffer = Buffer.alloc(9);

    buffer.writeUInt8(101, 0);
    buffer.writeUInt32BE(gameId, 1);
    buffer.writeUInt8(move.from, 5);
    buffer.writeUInt8(move.to, 6);
    buffer.writeUInt8(move.promo, 7);
    buffer.writeUInt8(status, 8);
    
    return buffer;
}

function broadcast(game: GameState, message: Buffer) {
    game.subscribers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT, path: '/chess' });

// Track which color each WebSocket is playing
const wsToGameColor = new Map<WebSocket, { gameId: number, color: 0 | 1 }>();

wss.on('connection', (ws: WebSocket) => {
    let clientGameId: number | null = null;
    console.log('New client connected');

    ws.on('message', (message: Buffer) => {
        try {
            const view = new DataView(message.buffer, message.byteOffset, message.byteLength);
            const msgType = view.getUint8(0);

            switch (msgType) {
                case CREATE_GAME: {
                    // Generate a new unique game ID
                    const newGameId = nextGameId++;
                    
                    // Create the game (this will initialize it)
                    const game = getOrCreateGame(newGameId);
                    
                    console.log(`🎮 Created new game with ID: ${newGameId}`);
                    
                    // Send the new game ID back to the client
                    const responseBuffer = encodeGameCreated(newGameId);
                    ws.send(responseBuffer);
                    
                    break;
                }
                
                case JOIN_GAME: {
                    const gameId = view.getUint32(1, true); // little endian
                    clientGameId = gameId;
                    const requestedColor = view.getUint8(5); // 0 = white, 1 = black
                    const game = getOrCreateGame(gameId);
                    
                    console.log(`JOIN_GAME: gameId=${gameId}, requestedColor=${requestedColor === 0 ? 'WHITE' : 'BLACK'}`);
                    console.log(`Current players: white=${game.players.white !== null}, black=${game.players.black !== null}`);
                    
                    // Check if this ws is already assigned to a color in this game
                    const existingAssignment = wsToGameColor.get(ws);
                    if (existingAssignment && existingAssignment.gameId === gameId) {
                        console.log(`Client already assigned to color ${existingAssignment.color} in game ${gameId}, sending current state`);
                        const stateBuffer = encodeGameState(gameId, game, existingAssignment.color);
                        ws.send(stateBuffer);
                break;
                    }
                    
                    // Check if requested color is available
                    let assignedColor: number | null = null;
                    
                    if (requestedColor === 0 && game.players.white === null) {
                        // Assign white
                        game.players.white = ws;
                        assignedColor = 0;
                        wsToGameColor.set(ws, { gameId, color: 0 });
                        console.log(`✅ Client assigned to WHITE in game ${gameId}`);
                    } else if (requestedColor === 1 && game.players.black === null) {
                        // Assign black
                        game.players.black = ws;
                        assignedColor = 1;
                        wsToGameColor.set(ws, { gameId, color: 1 });
                        console.log(`✅ Client assigned to BLACK in game ${gameId}`);
                    } else {
                        // Requested color taken, try other color
                        if (game.players.white === null) {
                            game.players.white = ws;
                            assignedColor = 0;
                            wsToGameColor.set(ws, { gameId, color: 0 });
                            console.log(`✅ Client assigned to WHITE in game ${gameId} (requested color taken)`);
                        } else if (game.players.black === null) {
                            game.players.black = ws;
                            assignedColor = 1;
                            wsToGameColor.set(ws, { gameId, color: 1 });
                            console.log(`✅ Client assigned to BLACK in game ${gameId} (requested color taken)`);
                        } else {
                            // Both colors taken - game is full
                            console.log(`❌ Game ${gameId} is FULL, rejecting client`);
                            console.log(`   White player: ${game.players.white !== null ? 'TAKEN' : 'AVAILABLE'}`);
                            console.log(`   Black player: ${game.players.black !== null ? 'TAKEN' : 'AVAILABLE'}`);
                            const errorBuffer = encodeJoinError(gameId, 1);
                            ws.send(errorBuffer);
                            ws.close();
                            return;
                        }
                    }
                    
                    // Add client to game subscribers
                    game.subscribers.add(ws);
                    
                    // Send current game state with assigned color
                    const stateBuffer = encodeGameState(gameId, game, assignedColor);
                    ws.send(stateBuffer);
                    
                    break;
                }
                
                case MOVE_MOVE: {
                    const gameId = view.getUint32(1, true); // little endian
                    const from = view.getUint8(5);
                    const to = view.getUint8(6);
                    const promo = view.getUint8(7);

                    const game = games.get(gameId);
                    if (!game) {
                        console.error(`Game ${gameId} not found`);
                        break;
                    }

                    const result = applyMove(game, { from, to, promo });

                    // Broadcast move result
                    const resBuffer = encodeMoveResult(gameId, { from, to, promo }, result.status);
                    broadcast(game, resBuffer);

                    // Broadcast updated game state
                    if (result.stateChanged) {
                        const stateBuffer = encodeGameState(gameId, game);
                        broadcast(game, stateBuffer);
                    }
                    
                    console.log(`Move in game ${gameId}: ${from} → ${to}`);
                    break;
                }
                
                case SURRENDER: {
                    const gameId = view.getUint32(1, true); // little endian
                    const surrenderingPlayer = view.getUint8(5); // 0 = white, 1 = black
                    
                    const game = games.get(gameId);
                    if (!game) {
                        console.error(`Game ${gameId} not found`);
                        break;
                    }
                    
                    if (game.status !== 0) {
                        console.log('Game is already over');
                        break;
                    }
                    
                    // Set game status to opposite player wins
                    game.status = surrenderingPlayer === 0 ? 2 : 1;
                    game.winner = surrenderingPlayer === 0 ? 1 : 0;
                    game.endReason = 3; // Surrender
                    
                    // Broadcast updated game state
                    const stateBuffer = encodeGameState(gameId, game);
                    broadcast(game, stateBuffer);
                    
                    console.log(`Player ${surrenderingPlayer === 0 ? 'White' : 'Black'} surrendered in game ${gameId}`);
                    break;
                }
                
                case RESET_GAME: {
                    const gameId = view.getUint32(1, true); // little endian
                    const game = games.get(gameId);
                    if (!game) {
                        console.error(`Game ${gameId} not found`);
                        break;
                    }
                    
                    // Reset the game to initial state
                    resetGame(game);
                    
                    // Broadcast reset game state to all players with their colors
                    game.subscribers.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            const clientColor = wsToGameColor.get(client);
                            const stateBuffer = encodeGameState(gameId, game, clientColor?.color);
                            client.send(stateBuffer);
                        }
                    });
                    
                    console.log(`Game ${gameId} has been reset`);
                break;
             }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        if (clientGameId !== null) {
            const game = games.get(clientGameId);
            if (game) {
                game.subscribers.delete(ws);
                
                let disconnectedPlayer: 'white' | 'black' | null = null;
                
                // Remove player from game
                if (game.players.white === ws) {
                    disconnectedPlayer = 'white';
                    game.players.white = null;
                    console.log(`⚠️  White player left game ${clientGameId}`);
                } else if (game.players.black === ws) {
                    disconnectedPlayer = 'black';
                    game.players.black = null;
                    console.log(`⚠️  Black player left game ${clientGameId}`);
                }
                
                // If a player left during an active game, award victory to the other player
                if (disconnectedPlayer && game.status === 0) {
                    const gameIdForTimeout = clientGameId; // Capture for closure
                    
                    // Game was ongoing, award victory to remaining player
                    if (disconnectedPlayer === 'white') {
                        game.status = 2; // Black wins
                        game.winner = 1;
                        game.endReason = 4; // Disconnect
                        console.log(`🏆 Black wins by forfeit in game ${clientGameId} (White disconnected)`);
                    } else {
                        game.status = 1; // White wins
                        game.winner = 0;
                        game.endReason = 4; // Disconnect
                        console.log(`🏆 White wins by forfeit in game ${clientGameId} (Black disconnected)`);
                    }
                    
                    // Broadcast the game over state to remaining players
                    game.subscribers.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            const clientColorData = wsToGameColor.get(client);
                            const stateBuffer = encodeGameState(gameIdForTimeout, game, clientColorData?.color);
                            client.send(stateBuffer);
                        }
                    });
                    
                    // Game will stay in "ended" state - no auto-reset
                    // Players will return to lobby and can start a new game
                }
                
                wsToGameColor.delete(ws);
            }
            console.log(`Client disconnected from game ${clientGameId}`);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

console.log(`✅ WebSocket server is running on ws://localhost:${PORT}/chess`);
