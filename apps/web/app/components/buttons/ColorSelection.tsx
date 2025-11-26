"use client";

interface ColorSelectionProps {
  value: 'white' | 'black';
  onChange: (color: 'white' | 'black') => void;
}

const ColorSelection = ({ value, onChange }: ColorSelectionProps) => {
  return (
    <div>
        <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            Choose your color
        </label>
        <div className="flex gap-4">
            <button
            onClick={() => onChange('white')}
            className={`
                flex-1 py-3 px-4 rounded-lg font-semibold transition-all
                ${value === 'white'
                ? 'bg-amber-100 text-zinc-800 ring-2 ring-amber-500 cursor-pointer'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer'
                }
            `}
            >
            ♔ White
            </button>
            <button
            onClick={() => onChange('black')}
            className={`
                flex-1 py-3 px-4 rounded-lg font-semibold transition-all
                ${value === 'black'
                ? 'bg-zinc-800 text-white ring-2 ring-zinc-600 cursor-pointer'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer'
                }
            `}
            >
            ♚ Black
            </button>
        </div>
    </div>
  )
}

export default ColorSelection
