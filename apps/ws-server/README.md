# WebSocket Chess Server

## Install Dependencies

```bash
npm install
```

## Run the Server

```bash
npm run dev
```

The server will start on `ws://localhost:9001/chess`

## Testing

1. Make sure the server is running
2. Start the web frontend in another terminal
3. Open your browser console (F12) to see debug logs
4. Click on a white piece (if you're playing as white)
5. You should see green dots showing valid moves
6. Click on a valid square to move the piece

## Debug

The server logs every connection, game join, and move. Check the terminal where you ran `npm run dev` to see server-side logs.

