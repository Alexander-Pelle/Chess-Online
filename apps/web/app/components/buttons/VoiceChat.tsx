'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceChatProps {
  gameId: number;
  playerColor: 'white' | 'black';
  wsRef: React.MutableRefObject<WebSocket | null>;
}

const VOICE_OFFER = 10;
const VOICE_ANSWER = 11;
const VOICE_ICE_CANDIDATE = 12;

export default function VoiceChat({ gameId, playerColor, wsRef }: VoiceChatProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [opponentWantsVoice, setOpponentWantsVoice] = useState(false);
  const [volume, setVolume] = useState(100); // Volume from 0-100
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // ICE servers configuration (using free STUN servers)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Define handlers with useCallback to prevent stale closures
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      console.log('🎤 Processing voice answer');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('🎤 Remote description set from answer');
      }
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      console.log('🎤 Processing ICE candidate');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('🎤 ICE candidate added');
      }
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }, []);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    // Listen for voice signaling messages
    const handleSignaling = async (event: MessageEvent) => {
      try {
        if (event.data instanceof ArrayBuffer) {
          const view = new DataView(event.data);
          const msgType = view.getUint8(0);

          if (msgType === VOICE_OFFER || msgType === VOICE_ANSWER || msgType === VOICE_ICE_CANDIDATE) {
            const receivedGameId = view.getUint32(1, false);
            if (receivedGameId !== gameId) return;

            const payloadLength = view.getUint16(5, false);
            const payloadBuffer = new Uint8Array(event.data, 7, payloadLength);
            const payload = new TextDecoder().decode(payloadBuffer);
            const data = JSON.parse(payload);

            if (msgType === VOICE_OFFER) {
              console.log('🎤 Received voice offer');
              // Store the offer and show notification instead of auto-accepting
              setPendingOffer(data);
              setOpponentWantsVoice(true);
            } else if (msgType === VOICE_ANSWER) {
              console.log('🎤 Received voice answer');
              await handleAnswer(data);
            } else if (msgType === VOICE_ICE_CANDIDATE) {
              await handleIceCandidate(data);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in voice signaling handler:', error);
        // Don't let voice chat errors crash the game connection
      }
    };

    ws.addEventListener('message', handleSignaling);

    return () => {
      ws.removeEventListener('message', handleSignaling);
      // Don't call cleanup() here - only cleanup on component unmount
    };
  }, [gameId, handleAnswer, handleIceCandidate]);

  // Separate effect for cleanup on unmount only
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const createPeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        sendSignal(VOICE_ICE_CANDIDATE, JSON.stringify(event.candidate));
      }
    };

    // Handle incoming audio stream
    pc.ontrack = (event) => {
      console.log('🎤 Received remote audio stream');
      if (remoteAudioRef.current) {
        // Set up Web Audio API for volume control
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          gainNodeRef.current = audioContextRef.current.createGain();
          gainNodeRef.current.gain.value = volume / 100; // Set initial volume
          
          // Connect audio graph: source -> gain -> destination
          const source = audioContextRef.current.createMediaStreamSource(event.streams[0]);
          source.connect(gainNodeRef.current);
          gainNodeRef.current.connect(audioContextRef.current.destination);
          
          console.log('🎤 Audio context initialized with volume:', volume);
        }
        
        remoteAudioRef.current.srcObject = event.streams[0];
        setIsConnected(true);
        setIsConnecting(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setIsConnected(false);
        setIsConnecting(false);
      }
    };

    return pc;
  };

  const sendSignal = (type: number, payload: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const payloadBuffer = new TextEncoder().encode(payload);
    const buffer = new ArrayBuffer(7 + payloadBuffer.length);
    const view = new DataView(buffer);
    
    view.setUint8(0, type);
    view.setUint32(1, gameId, false); // big endian
    view.setUint16(5, payloadBuffer.length, false);
    
    const uint8View = new Uint8Array(buffer);
    uint8View.set(payloadBuffer, 7);
    
    wsRef.current.send(buffer);
  };

  const startVoiceChat = async () => {
    try {
      setIsConnecting(true);
      
      console.log('🎤 Requesting microphone access...');
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      console.log('🎤 Microphone access granted!');
      localStreamRef.current = stream;
      
      // Create peer connection and add audio track
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => {
        console.log('🎤 Adding audio track:', track.label);
        pc.addTrack(track, stream);
      });

      // Check if there's a pending offer from opponent
      if (pendingOffer) {
        console.log('🎤 Accepting pending voice offer');
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        sendSignal(VOICE_ANSWER, JSON.stringify(answer));
        console.log('🎤 Sent voice answer');
        
        setPendingOffer(null);
        setOpponentWantsVoice(false);
      } else {
        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        sendSignal(VOICE_OFFER, JSON.stringify(offer));
        console.log('🎤 Sent voice offer');
      }
      
      setIsMuted(false);
      setIsConnecting(false);
    } catch (error: any) {
      console.error('❌ Error starting voice chat:', error);
      
      let errorMessage = 'Could not access microphone. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Permission denied. Please allow microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Microphone is already in use by another application.';
      } else {
        errorMessage += 'Please check your microphone settings and try again.';
      }
      
      alert(errorMessage);
      setIsConnecting(false);
      setIsMuted(true);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      // This function is now only used internally after user explicitly enables voice
      // Get microphone access
      if (!localStreamRef.current) {
        console.log('🎤 Requesting microphone for accepting offer...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }, 
          video: false 
        });
        console.log('🎤 Microphone access granted for offer!');
        localStreamRef.current = stream;
      }

      const pc = createPeerConnection();
      localStreamRef.current.getTracks().forEach(track => {
        console.log('🎤 Adding audio track for answer:', track.label);
        pc.addTrack(track, localStreamRef.current!);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      sendSignal(VOICE_ANSWER, JSON.stringify(answer));
      console.log('🎤 Sent voice answer');
      
      setIsMuted(false);
    } catch (error: any) {
      console.error('❌ Error handling offer:', error);
      
      let errorMessage = 'Could not accept voice chat. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Microphone permission denied.';
      } else {
        errorMessage += 'Please check your microphone settings.';
      }
      
      alert(errorMessage);
    }
  };


  const toggleMute = async () => {
    if (isMuted) {
      await startVoiceChat();
    } else {
      stopVoiceChat();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    
    // Update gain node if audio is playing
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume / 100;
      console.log('🎤 Volume updated to:', newVolume);
    }
  };

  const stopVoiceChat = () => {
    console.log('🎤 Leaving voice chat...');
    
    // Stop and remove local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop(); // Actually stop the track (releases microphone)
        console.log('🎤 Stopped track:', track.label);
      });
      localStreamRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      console.log('🎤 Closed peer connection');
      peerConnectionRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      console.log('🎤 Closed audio context');
      audioContextRef.current = null;
      gainNodeRef.current = null;
    }
    
    // Reset voice chat state
    setIsMuted(true);
    setIsConnected(false);
    setIsConnecting(false);
    setPendingOffer(null);
    setOpponentWantsVoice(false);
    
    console.log('🎤 Left voice chat successfully');
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      gainNodeRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsMuted(true);
    setPendingOffer(null);
    setOpponentWantsVoice(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Voice Chat
          </div>
          {isConnected && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
            </div>
          )}
          {isConnecting && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">Connecting...</span>
          )}
          {!isMuted && !isConnected && !isConnecting && opponentWantsVoice && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs text-blue-600 dark:text-blue-400">Opponent wants to chat</span>
            </div>
          )}
          {isMuted && opponentWantsVoice && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs text-blue-600 dark:text-blue-400">Click to join</span>
            </div>
          )}
        </div>

        <button
          onClick={toggleMute}
          disabled={isConnecting}
          className={`
            p-3 rounded-lg transition-all transform hover:scale-110 active:scale-95
            ${isMuted 
              ? opponentWantsVoice 
                ? 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 animate-pulse' 
                : 'bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600'
              : 'bg-red-500 hover:bg-red-600'
            }
            ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={isMuted ? (opponentWantsVoice ? 'Join Voice Chat' : 'Unmute') : 'Mute'}
        >
          {isMuted ? (
            // Microphone off icon
            <svg className={`w-5 h-5 ${opponentWantsVoice ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
            </svg>
          ) : (
            // Microphone on icon
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>

      {/* Volume slider - only show when connected */}
      {isConnected && (
        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              title={`Volume: ${volume}%`}
            />
            <span className="text-xs text-zinc-600 dark:text-zinc-400 w-8 text-right">
              {volume}%
            </span>
          </div>
        </div>
      )}

      {/* Hidden audio element for remote stream */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />
    </div>
  );
}

