# Voice Chat Implementation

## Architecture

The voice chat system uses **WebRTC** for peer-to-peer audio communication with the WebSocket server acting as a signaling server.

### Backend Structure

```
/ws-server
  /src
    /game
      gameServer.ts        - Game state management
      gameProtocol.ts      - Game message encoding/decoding
    /voice
      signalingServer.ts   - WebRTC signaling handlers
      signalingProtocol.ts - Voice message encoding/decoding
    index.ts              - Main server that wires everything together
```

### How It Works

1. **Signaling Phase**: Players exchange WebRTC connection information through the WebSocket server
   - Player A clicks mic → creates WebRTC offer → sent through WebSocket
   - Server forwards offer to Player B
   - Player B receives offer → creates WebRTC answer → sent back through WebSocket
   - ICE candidates are exchanged to establish peer connection

2. **Direct Audio**: Once WebRTC connection is established, audio streams **directly** between players (peer-to-peer)
   - No audio data goes through the server
   - Low latency
   - Reduced server load

## Protocol

### Voice Message Types

| Type | Value | Description |
|------|-------|-------------|
| `VOICE_OFFER` | 10 | WebRTC offer (SDP) |
| `VOICE_ANSWER` | 11 | WebRTC answer (SDP) |
| `VOICE_ICE_CANDIDATE` | 12 | ICE candidate for NAT traversal |

### Message Format

```
[1 byte: message type]
[4 bytes: game ID (big endian)]
[2 bytes: payload length]
[N bytes: JSON payload (UTF-8)]
```

### Example Payloads

**Offer/Answer:**
```json
{
  "type": "offer",
  "sdp": "v=0\r\no=- ..."
}
```

**ICE Candidate:**
```json
{
  "candidate": "candidate:...",
  "sdpMLineIndex": 0,
  "sdpMid": "0"
}
```

## Frontend Component

### VoiceChat Component

Located at: `apps/web/app/components/VoiceChat.tsx`

**Props:**
- `gameId`: Current game ID
- `playerColor`: Player's color ('white' | 'black')
- `wsRef`: Reference to the WebSocket connection

**Features:**
- Default muted state
- Mic icon button to toggle mute/unmute
- Visual connection status indicator
- Automatic WebRTC peer connection management
- ICE candidate exchange
- Clean cleanup on unmount

### Usage

```tsx
<VoiceChat 
  gameId={gameId} 
  playerColor={playerColor}
  wsRef={wsRef}
/>
```

## STUN/TURN Servers

Currently using free Google STUN servers for NAT traversal:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

For production, consider adding TURN servers for better connectivity through restrictive firewalls.

## Security Considerations

1. **Microphone Permission**: Browser will ask for microphone access
2. **HTTPS Required**: WebRTC requires HTTPS in production (except localhost)
3. **Peer-to-Peer**: Audio streams directly between players (not through server)
4. **No Recording**: Audio is not recorded or stored anywhere

## Testing

1. Start the server: `npm run dev` in `apps/ws-server`
2. Start the web app: `npm run dev` in `apps/web`
3. Open two browser tabs/windows
4. Join the same game in both
5. Click the mic icon in one tab
6. Click the mic icon in the other tab
7. You should hear each other!

## Troubleshooting

**No audio?**
- Check microphone permissions in browser
- Check browser console for errors
- Verify both players clicked unmute
- Check firewall settings

**Can't connect?**
- ICE connection might be failing
- Try on same network first
- May need TURN servers for some network configurations

## Future Enhancements

- [ ] Add TURN servers for better connectivity
- [ ] Volume control slider
- [ ] Push-to-talk mode
- [ ] Audio indicators (visualize who's speaking)
- [ ] Mute opponent (client-side)
- [ ] Voice quality settings
- [ ] Echo cancellation improvements

