'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const JOIN_GAME = 1;
const MOVE_MOVE = 2;
const SURRENDER = 3;
const RESET_GAME = 4;
const CREATE_GAME = 5;

interface GameState {
  board: number[];
  turn: number;
  halfmoveClock: number;
  fullmoveNumber: number;
  enPassantSquare: number | null;
  status: number; // 0 = ongoing, 1 = white wins, 2 = black wins, 3 = stalemate
  winner: number | null; // 0 = white, 1 = black, null = no winner
  endReason: number; // 0 = none, 1 = checkmate, 2 = stalemate, 3 = surrender, 4 = disconnect
}

interface MoveResult {
  gameId: number;
  from: number;
  to: number;
  promo: number;
  status: number;
}

export function useChessWebSocket(gameId: number | null, requestedColor: 'white' | 'black', wsUrl: string = 'ws://localhost:9001/chess') {
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastMove, setLastMove] = useState<MoveResult | null>(null);
  const [assignedColor, setAssignedColor] = useState<'white' | 'black' | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    console.log(`🔌 useEffect triggered for game ${gameId}, color: ${requestedColor}`);
    
    // Don't try to connect if we're not in the browser
    if (typeof window === 'undefined' || !wsUrl) {
      console.log('⚠️  Not in browser or no wsUrl, skipping WebSocket connection');
      return;
    }
    
    // Prevent duplicate connections (React StrictMode calls useEffect twice)
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      console.log('⚠️  WebSocket already active, skipping...');
      return;
    }
    
    if (hasJoinedRef.current) {
      console.log('⚠️  Already joined, skipping...');
      return;
    }
    
    hasJoinedRef.current = true;
    
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
      
      // Only join if we have a gameId (not null during creation)
      if (gameId !== null) {
        // Send JOIN_GAME message with requested color
        const buffer = new ArrayBuffer(6);
        const view = new DataView(buffer);
        view.setUint8(0, JOIN_GAME);
        view.setUint32(1, gameId, true); // little endian
        view.setUint8(5, requestedColor === 'white' ? 0 : 1);
        ws.send(buffer);
        console.log(`📤 Sent JOIN_GAME: gameId=${gameId}, color=${requestedColor}`);
      }
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        const msgType = view.getUint8(0);

        // Ignore voice chat messages (10, 11, 12) - handled by VoiceChat component
        if (msgType === 10 || msgType === 11 || msgType === 12) {
          // VOICE_OFFER, VOICE_ANSWER, VOICE_ICE_CANDIDATE
          // These are handled by the VoiceChat component's own message listener
          return;
        }

        if (msgType === 100) {
          // Error message
          const errorCode = view.getUint8(5);
          if (errorCode === 1) {
            setJoinError('Game is full! Both player slots are taken.');
            console.log('Cannot join game: Game is full');
          }
        } else if (msgType === 102) {
          // Game created response - handled by useCreateGame hook
          console.log('Game created message received (handled elsewhere)');
        } else if (msgType === 101) {
          // Move result
          const moveResult: MoveResult = {
            gameId: view.getUint32(1, false),
            from: view.getUint8(5),
            to: view.getUint8(6),
            promo: view.getUint8(7),
            status: view.getUint8(8)
          };
          setLastMove(moveResult);
          console.log('Move result:', moveResult);
        } else {
          // Game state
          const receivedGameId = view.getUint8(0);
          const turn = view.getUint32(1, false);
          const board = new Array(64);
          
          for (let i = 0; i < 64; i++) {
            board[i] = view.getUint8(5 + i);
          }
          
          const halfmoveClock = view.getUint8(69);
          const fullmoveNumber = view.getUint8(70);
          const enPassantSquare = view.getUint8(71);
          const status = view.getUint8(72);
          const winner = view.getUint8(73);
          const assignedColorValue = view.getUint8(74);
          const endReason = view.getUint8(75);
          
          // Set assigned color (server tells us what color we got)
          if (assignedColorValue !== 255) {
            const color = assignedColorValue === 0 ? 'white' : 'black';
            setAssignedColor(color);
            console.log('Assigned color:', color);
          }
          
          setGameState({
            board,
            turn,
            halfmoveClock,
            fullmoveNumber,
            enPassantSquare: enPassantSquare === 255 ? null : enPassantSquare,
            status,
            winner: winner === 255 ? null : winner,
            endReason
          });
          
          console.log('Game state updated:', { receivedGameId, turn, fullmoveNumber, status, winner });
        }
      }
    };

    ws.onerror = (error) => {
      console.log('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log('🔴 WebSocket disconnected');
      setConnected(false);
    };

    return () => {
      console.log('🧹 Cleanup: Closing WebSocket');
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      hasJoinedRef.current = false;
    };
  }, [gameId, wsUrl]); // Removed requestedColor from dependencies to prevent reconnections

  const sendMove = useCallback((from: number, to: number, promo: number = 0) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && gameId !== null) {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      
      view.setUint8(0, MOVE_MOVE);
      view.setUint32(1, gameId, true); // little endian
      view.setUint8(5, from);
      view.setUint8(6, to);
      view.setUint8(7, promo);
      
      wsRef.current.send(buffer);
      console.log('Sent move:', { from, to, promo });
    }
  }, [gameId]);

  const surrender = useCallback((playerColor: 'white' | 'black') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && gameId !== null) {
      const buffer = new ArrayBuffer(6);
      const view = new DataView(buffer);
      
      view.setUint8(0, SURRENDER);
      view.setUint32(1, gameId, true); // little endian
      view.setUint8(5, playerColor === 'white' ? 0 : 1);
      
      wsRef.current.send(buffer);
      console.log('Surrendered:', playerColor);
    }
  }, [gameId]);

  const resetGame = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && gameId !== null) {
      const buffer = new ArrayBuffer(5);
      const view = new DataView(buffer);
      
      view.setUint8(0, RESET_GAME);
      view.setUint32(1, gameId, true); // little endian
      
      wsRef.current.send(buffer);
      console.log('Reset game requested');
    }
  }, [gameId]);

  return {
    connected,
    gameState,
    lastMove,
    sendMove,
    surrender,
    resetGame,
    assignedColor,
    joinError,
    wsRef // Expose wsRef for voice chat
  };
}

