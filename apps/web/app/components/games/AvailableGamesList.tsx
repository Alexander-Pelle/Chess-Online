"use client";

interface AvailableGamesListProps {
  games: {
    gameId: number;
    availableColor: "white" | "black";
  }[];
  handleQuickJoin: (gameId: number, color: "white" | "black") => void;
}

const AvailableGamesList = ({
  games,
  handleQuickJoin = () => {},
}: AvailableGamesListProps) => {
  if (!games.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
        No open games right now.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {games.map((game) => (
        <div
          key={game.gameId}
          className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {game.availableColor === "white" ? "♔" : "♚"}
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Game #{game.gameId}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Play as {game.availableColor}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleQuickJoin(game.gameId, game.availableColor)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Join
          </button>
        </div>
      ))}
    </div>
  );
};

export default AvailableGamesList;
