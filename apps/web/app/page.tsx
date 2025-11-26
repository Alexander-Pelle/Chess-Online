"use client";

import { useState, useEffect, useMemo } from "react";
import ChessGame from "./components/chess/ChessGame";
import { useCreateGame } from "./hooks/useCreateGame";
import { useAvailableGames } from "./hooks/useAvailableGames";
import { WS_URL } from "./config/websocket";

import Divider from "./components/ui/Divider";
import ColorSelection from "./components/buttons/ColorSelection";
import JoinGameButton from "./components/buttons/JoinGameButton";
import CreateGameButton from "./components/buttons/CreateGameButton";
import MainHeading from "./components/ui/MainHeading";
import AvailableGamesSection from "./components/games/AvailableGamesSection";
import GameIdInput from "./components/inputs/GameIdInput";

export default function Home() {
  const [gameId, setGameId] = useState<number>(1);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [gameStarted, setGameStarted] = useState(false);
  const [inputGameId, setInputGameId] = useState("1");
  const [creating, setCreating] = useState(false);

  const { createGame } = useCreateGame(WS_URL);
  const { games, loading, fetchGames } = useAvailableGames(WS_URL);

  // Fetch available games on mount
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const startGame = () => {
    setGameId(parseInt(inputGameId) || 1);
    setGameStarted(true);
  };

  const handleCreateGame = async () => {
    setCreating(true);
    try {
      const newGameId = await createGame();
      console.log("Created game:", newGameId);
      setGameId(newGameId);
      setInputGameId(newGameId.toString());
      setGameStarted(true);
    } catch (error) {
      console.error("Failed to create game:", error);
      alert("Failed to create game. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleReturnToLobby = () => {
    setGameStarted(false);
    fetchGames();
  };

  const handleQuickJoin = (id: number, color: "white" | "black") => {
    setGameId(id);
    setPlayerColor(color);
    setInputGameId(id.toString());
    setGameStarted(true);
  };

  // Split games evenly into left/right columns
  const { leftGames, rightGames } = useMemo(() => {
    if (!games || games.length === 0) {
      return { leftGames: [], rightGames: [] };
    }
    const mid = Math.ceil(games.length / 2);
    return {
      leftGames: games.slice(0, mid),
      rightGames: games.slice(mid),
    };
  }, [games]);

  if (gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900">
        <div className="container mx-auto py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">
              Online Chess
            </h1>
            <button
              onClick={handleReturnToLobby}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to lobby
            </button>
          </div>
          <ChessGame
            gameId={gameId}
            playerColor={playerColor}
            onReturnToLobby={handleReturnToLobby}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Desktop: 3-column layout */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
          {/* Left side games */}
          <AvailableGamesSection
            title="Available Games"
            games={leftGames}
            loading={loading}
            fetchGames={fetchGames}
            handleQuickJoin={handleQuickJoin}
          />

          {/* Main card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 border border-zinc-200 dark:border-zinc-800">
            <MainHeading />

            <div className="space-y-6">
              <GameIdInput
                inputGameId={inputGameId}
                setInputGameId={setInputGameId}
              />

              <ColorSelection
                value={playerColor}
                onChange={setPlayerColor}
              />

              <JoinGameButton startGame={startGame} />

              <Divider />

              <CreateGameButton
                handleCreateGame={handleCreateGame}
                creating={creating}
              />
            </div>
          </div>

          {/* Right side games */}
          <AvailableGamesSection
            title="Available Games"
            games={rightGames}
            loading={loading}
            fetchGames={fetchGames}
            handleQuickJoin={handleQuickJoin}
          />
        </div>

        {/* Mobile / tablet: main card + single games list underneath */}
        <div className="lg:hidden flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 border border-zinc-200 dark:border-zinc-800">
            <MainHeading />

            <div className="space-y-6">
              <GameIdInput
                inputGameId={inputGameId}
                setInputGameId={setInputGameId}
              />

              <ColorSelection
                value={playerColor}
                onChange={setPlayerColor}
              />

              <JoinGameButton startGame={startGame} />

              <Divider />

              <CreateGameButton
                handleCreateGame={handleCreateGame}
                creating={creating}
              />
            </div>
          </div>

          <AvailableGamesSection
            games={games}
            loading={loading}
            fetchGames={fetchGames}
            handleQuickJoin={handleQuickJoin}
          />
        </div>
      </div>
    </div>
  );
}
