'use client';

import { useRef, useCallback } from 'react';

const CREATE_GAME = 5;

export function useCreateGame(wsUrl: string = 'ws://localhost:9001/chess') {
  const wsRef = useRef<WebSocket | null>(null);

  const createGame = useCallback((): Promise<number> => {
    return new Promise((resolve, reject) => {
      // Don't try to connect if we're not in the browser
      if (typeof window === 'undefined' || !wsUrl) {
        reject(new Error('WebSocket not available'));
        return;
      }

      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Timeout creating game'));
      }, 5000);

      ws.onopen = () => {
        console.log('🔌 WebSocket connected for game creation');
        
        // Send CREATE_GAME message
        const buffer = new ArrayBuffer(1);
        const view = new DataView(buffer);
        view.setUint8(0, CREATE_GAME);
        ws.send(buffer);
        console.log('📤 Sent CREATE_GAME request');
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const view = new DataView(event.data);
          const msgType = view.getUint8(0);

          if (msgType === 102) {
            // Game created response
            const gameId = view.getUint32(1, false); // big endian
            console.log(`✅ Game created with ID: ${gameId}`);
            clearTimeout(timeout);
            ws.close();
            resolve(gameId);
          }
        }
      };

      ws.onerror = (error) => {
        console.log('WebSocket error during game creation:', error);
        clearTimeout(timeout);
        reject(error);
      };

      ws.onclose = () => {
        console.log('🔴 WebSocket closed after game creation');
      };
    });
  }, [wsUrl]);

  return { createGame };
}

