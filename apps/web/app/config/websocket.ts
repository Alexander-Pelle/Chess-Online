/**
 * WebSocket Configuration
 * 
 * This file manages the WebSocket URL for different environments.
 * 
 * Usage:
 * - Development: Uses localhost WebSocket server
 * - Production: Uses environment variable or fallback URL
 */

export const getWebSocketUrl = (): string => {
  // In production, we use the environment variable
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  
  // In development, use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'ws://localhost:9001/chess';
  }
  
  // Fallback for production if env var not set
  // Replace this with your actual production WebSocket URL
  return 'wss://your-backend-url.railway.app/chess';
};

export const WS_URL = getWebSocketUrl();

