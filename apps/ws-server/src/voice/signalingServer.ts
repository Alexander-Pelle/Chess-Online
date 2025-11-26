import { WebSocket } from 'ws';
import { VOICE_OFFER, VOICE_ANSWER, VOICE_ICE_CANDIDATE, encodeVoiceSignal } from './signalingProtocol.js';

// Track which players are in voice chat
const voiceSessions = new Map<number, Set<WebSocket>>(); // gameId -> Set of WebSockets in voice

export function handleVoiceOffer(ws: WebSocket, gameId: number, offer: string, wsToGameColor: Map<WebSocket, {gameId: number, color: number}>, games: Map<number, any>) {
    const game = games.get(gameId);
    if (!game) {
        console.log(`❌ Game ${gameId} not found for voice offer`);
        return;
    }
    
    const senderColor = wsToGameColor.get(ws);
    if (!senderColor) {
        console.log('❌ Sender not in game for voice offer');
        return;
    }
    
    console.log(`🎤 Voice offer from ${senderColor.color === 0 ? 'White' : 'Black'} in game ${gameId}`);
    
    // Add to voice session
    if (!voiceSessions.has(gameId)) {
        voiceSessions.set(gameId, new Set());
    }
    voiceSessions.get(gameId)!.add(ws);
    
    // Forward offer to opponent
    const opponentWs = senderColor.color === 0 ? game.players.black : game.players.white;
    if (opponentWs && opponentWs.readyState === WebSocket.OPEN) {
        const buffer = encodeVoiceSignal(VOICE_OFFER, gameId, offer);
        opponentWs.send(buffer);
        console.log(`📤 Forwarded voice offer to opponent`);
    }
}

export function handleVoiceAnswer(ws: WebSocket, gameId: number, answer: string, wsToGameColor: Map<WebSocket, {gameId: number, color: number}>, games: Map<number, any>) {
    const game = games.get(gameId);
    if (!game) {
        console.log(`❌ Game ${gameId} not found for voice answer`);
        return;
    }
    
    const senderColor = wsToGameColor.get(ws);
    if (!senderColor) {
        console.log('❌ Sender not in game for voice answer');
        return;
    }
    
    console.log(`🎤 Voice answer from ${senderColor.color === 0 ? 'White' : 'Black'} in game ${gameId}`);
    
    // Add to voice session
    if (!voiceSessions.has(gameId)) {
        voiceSessions.set(gameId, new Set());
    }
    voiceSessions.get(gameId)!.add(ws);
    
    // Forward answer to opponent
    const opponentWs = senderColor.color === 0 ? game.players.black : game.players.white;
    if (opponentWs && opponentWs.readyState === WebSocket.OPEN) {
        const buffer = encodeVoiceSignal(VOICE_ANSWER, gameId, answer);
        opponentWs.send(buffer);
        console.log(`📤 Forwarded voice answer to opponent`);
    }
}

export function handleIceCandidate(ws: WebSocket, gameId: number, candidate: string, wsToGameColor: Map<WebSocket, {gameId: number, color: number}>, games: Map<number, any>) {
    const game = games.get(gameId);
    if (!game) {
        return;
    }
    
    const senderColor = wsToGameColor.get(ws);
    if (!senderColor) {
        return;
    }
    
    // Forward ICE candidate to opponent
    const opponentWs = senderColor.color === 0 ? game.players.black : game.players.white;
    if (opponentWs && opponentWs.readyState === WebSocket.OPEN) {
        const buffer = encodeVoiceSignal(VOICE_ICE_CANDIDATE, gameId, candidate);
        opponentWs.send(buffer);
    }
}

export function cleanupVoiceSession(ws: WebSocket, gameId: number | null) {
    if (gameId !== null && voiceSessions.has(gameId)) {
        voiceSessions.get(gameId)!.delete(ws);
        if (voiceSessions.get(gameId)!.size === 0) {
            voiceSessions.delete(gameId);
        }
    }
}

export function isInVoiceChat(ws: WebSocket, gameId: number): boolean {
    return voiceSessions.has(gameId) && voiceSessions.get(gameId)!.has(ws);
}

