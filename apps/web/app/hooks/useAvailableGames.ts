'use client';

import { useState, useEffect, useCallback } from 'react';

interface AvailableGame {
  gameId: number;
  availableColor: 'white' | 'black';
}

const LIST_GAMES = 6;

export function useAvailableGames(wsUrl: string = 'ws://localhost:9001/chess') {
  const [games, setGames] = useState<AvailableGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(() => {
    // Don't try to connect if we're not in the browser
    if (typeof window === 'undefined' || !wsUrl) {
      return;
    }

    setLoading(true);
    setError(null);

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      // Send LIST_GAMES request
      const buffer = new ArrayBuffer(1);
      const view = new DataView(buffer);
      view.setUint8(0, LIST_GAMES);
      ws.send(buffer);
      console.log('📋 Requested list of available games');
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        const msgType = view.getUint8(0);

        if (msgType === 103) { // Game list response
          const gameCount = view.getUint8(1);
          const availableGames: AvailableGame[] = [];

          let offset = 2;
          for (let i = 0; i < gameCount; i++) {
            const gameId = view.getUint32(offset, false); // big endian
            const colorValue = view.getUint8(offset + 4);
            availableGames.push({
              gameId,
              availableColor: colorValue === 0 ? 'white' : 'black'
            });
            offset += 5;
          }

          console.log('📋 Received available games:', availableGames);
          setGames(availableGames);
          setLoading(false);
          ws.close();
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Failed to fetch games');
      setLoading(false);
      ws.close();
    };

    ws.onclose = () => {
      setLoading(false);
    };

    // Cleanup
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [wsUrl]);

  return { games, loading, error, fetchGames };
}

