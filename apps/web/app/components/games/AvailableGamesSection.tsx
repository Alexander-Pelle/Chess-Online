"use client";
import AvailableGamesList from "./AvailableGamesList";

interface AvailableGamesSectionProps {
  games: {
    gameId: number;
    availableColor: "white" | "black";
  }[];
  loading: boolean;
  fetchGames: () => void;
  handleQuickJoin: (gameId: number, color: "white" | "black") => void;
  title?: string;
}

const AvailableGamesSection = ({
  games,
  loading,
  fetchGames,
  handleQuickJoin,
  title = "Available Games",
}: AvailableGamesSectionProps) => {
  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          {title}
        </h2>
        <button
          onClick={fetchGames}
          disabled={loading}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer"
        >
          {loading ? "⟳" : "↻ Refresh"}
        </button>
      </div>

      <AvailableGamesList games={games} handleQuickJoin={handleQuickJoin} />
    </div>
  );
};

export default AvailableGamesSection;
