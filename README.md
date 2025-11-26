# ♔ Chess Online ♚

A real-time multiplayer chess application with WebRTC voice chat support.

## Features

### Chess Gameplay
- **Real-time multiplayer** - Play chess with friends in real-time
- **Game creation & joining** - Create new games or join existing ones by game ID
- **Available games list** - Browse and quick-join open games
- **Move validation** - Client-side move validation with visual feedback
- **Captured pieces tracking** - View captured pieces for both players
- **Game status detection** - Automatic checkmate, stalemate, and draw detection
- **Surrender option** - Surrender with confirmation
- **Auto-reconnection** - Handles disconnections and game resets

### User Interface
- **Modern UI** - Built with Next.js 16 and Tailwind CSS v4
- **Dark mode support** - Automatic dark/light theme based on system preferences
- **Responsive design** - Works on desktop and mobile devices
- **Visual move indicators** - See valid moves when selecting pieces
- **Interactive board** - Intuitive click-to-move interface
- **Game info panel** - Real-time game status, turn indicator, and move counter

### Voice Chat
- **WebRTC voice chat** - Peer-to-peer audio communication during games
- **Low latency** - Direct audio streaming between players
- **Mute/unmute toggle** - Control your microphone easily
- **Connection status** - Visual indicators for voice connection state

> **Note:** Voice chat is functional but audio quality may vary depending on network conditions and browser support. This feature is still being refined.

## Architecture

This is a monorepo containing two main applications:

### Frontend (`apps/web`)
- **Framework:** Next.js 16 with React 19
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **uWebSocket:** Native WebSocket for game state
- **WebRTC:** Peer-to-peer voice communication

### Backend (`apps/ws-server`)
- **Runtime:** Node.js with TypeScript
- **uWebSocket Server:** ws library
- **Game Engine:** Custom chess logic with move validation
- **Signaling Server:** WebRTC signaling for voice chat

## Getting Started

### Prerequisites
- Node.js 20+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd chess
```

2. **Install dependencies**

Install frontend dependencies:
```bash
cd apps/web
npm install
```

Install backend dependencies:
```bash
cd ../ws-server
npm install
```

### Running the Application

1. **Start the WebSocket server** (from `apps/ws-server`):
```bash
npm run dev
```
The server will start on `ws://localhost:9001/chess`

2. **Start the web app** (from `apps/web`):
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser

3. **Play chess!**
   - Create a new game or join an existing one
   - Share the game ID with a friend
   - Optionally enable voice chat by clicking the microphone icon


## How to Play

1. **Create or Join a Game**
   - Enter a game ID and select your color (white or black)
   - Click "Join Game" to enter an existing game
   - Or click "Create New Game" to start a fresh game

2. **Make Moves**
   - Click on your piece to select it
   - Valid moves will be highlighted
   - Click on a highlighted square to move

3. **Voice Chat** (Optional)
   - Click the microphone icon to unmute
   - Grant browser permission for microphone access
   - Your opponent will see when you want to chat
   - Both players need to unmute to communicate

4. **End Game**
   - Win by checkmate
   - Offer a draw (stalemate)
   - Surrender if needed
   - Return to lobby to play again

## Project Structure

```
chess/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── components/     # React components
│   │   │   │   ├── buttons/    # Button components
│   │   │   │   ├── chess/      # Chess-specific components
│   │   │   │   ├── games/      # Game list components
│   │   │   │   ├── inputs/     # Input components
│   │   │   │   ├── modals/     # Modal dialogs
│   │   │   │   └── ui/         # General UI components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── logic/          # Chess game logic
│   │   │   └── constants/      # Constants and configs
│   │   └── public/             # Static assets
│   │
│   └── ws-server/              # WebSocket server
│       └── src/
│           ├── game/           # Game state management
│           └── voice/          # WebRTC signaling
│
├── .gitignore
└── README.md
```

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with modern hooks
- **TypeScript** 
- **Tailwind CSS v4** 
- **uWebSocket API** - Real-time game communication
- **WebRTC** - Peer-to-peer voice chat

### Backend
- **Node.js** - JavaScript runtime
- **TypeScript** - Type-safe server code
- **ws** - WebSocket server library
- **Custom game engine** - Chess rules and validation

## Current Limitations

### Frontend (Work in Progress)
- UI/UX improvements are ongoing
- Some edge cases in move validation may exist
- Mobile experience needs optimization

### Voice Chat
- Audio quality depends on network conditions
- No echo cancellation or noise suppression yet
- Requires HTTPS in production (works on localhost)
- May not work through some corporate firewalls
- No TURN servers configured (only STUN for NAT traversal)

### Game Features
- No game history or move notation yet
- No undo/redo functionality
- No timer or clock support
- No save/load game state

## Future Improvements

- [ ] Improve UI/UX and add animations
- [ ] Add chess timer/clock
- [ ] Implement game history with PGN export
- [ ] Add move notation display
- [ ] Improve voice chat quality (echo cancellation, noise suppression)
- [ ] Add TURN servers for better voice connectivity
- [ ] Implement player accounts and ratings
- [ ] Add game replay feature
- [ ] Support for different chess variants
- [ ] Tournament mode
- [ ] Mobile app versions

## 📝 License

This project is open source and available for personal and educational use.


## Contact

For questions or feedback, please open an issue on the repository.

---


