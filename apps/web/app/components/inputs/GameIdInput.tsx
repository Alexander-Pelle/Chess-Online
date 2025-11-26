"use client";
interface GameIdInputProps {
    inputGameId: string;
    setInputGameId: (value: string) => void;
}

const GameIdInput = ({ inputGameId, setInputGameId }: GameIdInputProps) => {
  return (
    <div>
        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Game ID
        </label>
        <input
            type="number"
            value={inputGameId}
            onChange={(e) => setInputGameId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter game ID"
            min="1"
        />
    </div>
  )
}

export default GameIdInput
