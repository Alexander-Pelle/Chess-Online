import { WebSocketServer, WebSocket } from 'ws';
import {
    JOIN_GAME, MOVE_PIECE, SURRENDER, RESET_GAME, CREATE_GAME, LIST_GAMES,
    encodeGameState, encodeJoinError, encodeGameCreated, encodeMoveResult, encodeGameList, AvailableGame
} from './game/gameProtocol.js';
import { games, getOrCreateGame, generateGameId, resetGame, broadcast } from './game/gameServer.js';
import {
    VOICE_OFFER, VOICE_ANSWER, VOICE_ICE_CANDIDATE,
    decodeVoiceSignal
} from './voice/signalingProtocol.js';
import {
    handleVoiceOffer, handleVoiceAnswer, handleIceCandidate, cleanupVoiceSession
} from './voice/signalingServer.js';
import { applyMove, isValidMove, isSquareAttacked, isInCheck, hasAnyLegalMoves, checkGameStatus, findKing } from './game/gameEngine.js';

// Use environment variable for port, or default to 9001
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 9001;

// Track which color each WebSocket is playing
const wsToGameColor = new Map<WebSocket, { gameId: number, color: 0 | 1 }>();

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT, path: '/chess' });

wss.on('connection', (ws: WebSocket) => {
    let clientGameId: number | null = null;
    console.log('New client connected');

    ws.on('message', (message: Buffer) => {
        try {
            const view = new DataView(message.buffer, message.byteOffset, message.byteLength);
            const msgType = view.getUint8(0);

            // Handle voice signaling messages
            if (msgType === VOICE_OFFER || msgType === VOICE_ANSWER || msgType === VOICE_ICE_CANDIDATE) {
                const { gameId, payload } = decodeVoiceSignal(message);
                
                if (msgType === VOICE_OFFER) {
                    handleVoiceOffer(ws, gameId, payload, wsToGameColor, games);
                } else if (msgType === VOICE_ANSWER) {
                    handleVoiceAnswer(ws, gameId, payload, wsToGameColor, games);
                } else if (msgType === VOICE_ICE_CANDIDATE) {
                    handleIceCandidate(ws, gameId, payload, wsToGameColor, games);
                }
                return;
            }

            // Handle game messages
            switch (msgType) {
                case LIST_GAMES: {
                    // Get all games that have exactly one player
                    const availableGames: AvailableGame[] = [];
                    
                    games.forEach((game, gameId) => {
                        const hasWhite = game.players.white !== null;
                        const hasBlack = game.players.black !== null;
                        const isOngoing = game.status === 0;
                        
                        // Only list games that are ongoing and have exactly one player
                        if (isOngoing && (hasWhite !== hasBlack)) {
                            availableGames.push({
                                gameId,
                                availableColor: hasWhite ? 1 : 0 // 0 = white available, 1 = black available
                            });
                        }
                    });
                    
                    const responseBuffer = encodeGameList(availableGames);
                    ws.send(responseBuffer);
                    console.log(`📋 Sent list of ${availableGames.length} available games`);
                    
                    break;
                }
                
                case CREATE_GAME: {
                    const newGameId = generateGameId();
                    const game = getOrCreateGame(newGameId);
                    
                    console.log(`🎮 Created new game with ID: ${newGameId}`);
                    
                    const responseBuffer = encodeGameCreated(newGameId);
                    ws.send(responseBuffer);
                    
                    break;
                }
                
                case JOIN_GAME: {
                    const gameId = view.getUint32(1, true);
                    clientGameId = gameId;
                    const requestedColor = view.getUint8(5);
                    const game = getOrCreateGame(gameId);
                    
                    console.log(`JOIN_GAME: gameId=${gameId}, requestedColor=${requestedColor === 0 ? 'WHITE' : 'BLACK'}`);
                    console.log(`Current players: white=${game.players.white !== null}, black=${game.players.black !== null}`);
                    
                    // Auto-reset if game has ended and no players are connected
                    if (game.status !== 0 && game.players.white === null && game.players.black === null) {
                        console.log(`🔄 Auto-resetting ended game ${gameId} for new players`);
                        resetGame(game);
                    }
                    
                    const existingAssignment = wsToGameColor.get(ws);
                    if (existingAssignment && existingAssignment.gameId === gameId) {
                        console.log(`Client already assigned to color ${existingAssignment.color} in game ${gameId}`);
                        const stateBuffer = encodeGameState(gameId, game, existingAssignment.color);
                        ws.send(stateBuffer);
                        break;
                    }
                    
                    let assignedColor: number | null = null;
                    
                    if (requestedColor === 0 && game.players.white === null) {
                        game.players.white = ws;
                        assignedColor = 0;
                        wsToGameColor.set(ws, { gameId, color: 0 });
                        console.log(`✅ Client assigned to WHITE in game ${gameId}`);
                    } else if (requestedColor === 1 && game.players.black === null) {
                        game.players.black = ws;
                        assignedColor = 1;
                        wsToGameColor.set(ws, { gameId, color: 1 });
                        console.log(`✅ Client assigned to BLACK in game ${gameId}`);
                    } else {
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
                            console.log(`❌ Game ${gameId} is FULL`);
                            const errorBuffer = encodeJoinError(gameId, 1);
                            ws.send(errorBuffer);
                            ws.close();
                            return;
                        }
                    }
                    
                    game.subscribers.add(ws);
                    const stateBuffer = encodeGameState(gameId, game, assignedColor);
                    ws.send(stateBuffer);
                    
                    break;
                }
                
                case MOVE_PIECE: {
                    const gameId = view.getUint32(1, true);
                    const from = view.getUint8(5);
                    const to = view.getUint8(6);
                    const promo = view.getUint8(7);

                    const game = games.get(gameId);
                    if (!game) {
                        console.error(`Game ${gameId} not found`);
                        break;
                    }

                    const result = applyMove(game, { from, to, promo });

                    const resBuffer = encodeMoveResult(gameId, { from, to, promo }, result.status);
                    broadcast(game, resBuffer);

                    if (result.stateChanged) {
                        const stateBuffer = encodeGameState(gameId, game);
                        broadcast(game, stateBuffer);
                    }
                    
                    console.log(`Move in game ${gameId}: ${from} → ${to}`);
                    break;
                }
                
                case SURRENDER: {
                    const gameId = view.getUint32(1, true);
                    const surrenderingPlayer = view.getUint8(5);
                    
                    const game = games.get(gameId);
                    if (!game) {
                        console.error(`Game ${gameId} not found`);
                        break;
                    }
                    
                    if (game.status !== 0) {
                        console.log('Game is already over');
                        break;
                    }
                    
                    game.status = surrenderingPlayer === 0 ? 2 : 1;
                    game.winner = surrenderingPlayer === 0 ? 1 : 0;
                    game.endReason = 3; // Surrender
                    
                    const stateBuffer = encodeGameState(gameId, game);
                    broadcast(game, stateBuffer);
                    
                    console.log(`Player ${surrenderingPlayer === 0 ? 'White' : 'Black'} surrendered in game ${gameId}`);
                    break;
                }
                
                case RESET_GAME: {
                    const gameId = view.getUint32(1, true);
                    const game = games.get(gameId);
                    if (!game) {
                        console.error(`Game ${gameId} not found`);
                        break;
                    }
                    
                    resetGame(game);
                    
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
                
                if (game.players.white === ws) {
                    disconnectedPlayer = 'white';
                    game.players.white = null;
                    console.log(`⚠️  White player left game ${clientGameId}`);
                } else if (game.players.black === ws) {
                    disconnectedPlayer = 'black';
                    game.players.black = null;
                    console.log(`⚠️  Black player left game ${clientGameId}`);
                }
                
                if (disconnectedPlayer && game.status === 0) {
                    const gameIdForTimeout = clientGameId;
                    
                    if (disconnectedPlayer === 'white') {
                        game.status = 2;
                        game.winner = 1;
                        game.endReason = 4; // Disconnect
                        console.log(`🏆 Black wins by forfeit in game ${clientGameId}`);
                    } else {
                        game.status = 1;
                        game.winner = 0;
                        game.endReason = 4; // Disconnect
                        console.log(`🏆 White wins by forfeit in game ${clientGameId}`);
                    }
                    
                    game.subscribers.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            const clientColorData = wsToGameColor.get(client);
                            const stateBuffer = encodeGameState(gameIdForTimeout, game, clientColorData?.color);
                            client.send(stateBuffer);
                        }
                    });
                }
                
                // Cleanup voice session
                cleanupVoiceSession(ws, clientGameId);
                wsToGameColor.delete(ws);
            }
            console.log(`Client disconnected from game ${clientGameId}`);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

console.log(`WebSocket server is running on ws://localhost:${PORT}/chess`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

