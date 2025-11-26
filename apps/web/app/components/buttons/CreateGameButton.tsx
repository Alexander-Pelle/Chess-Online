"use client";

const CreateGameButton = ({ handleCreateGame, creating }: { handleCreateGame: () => void, creating: boolean }) => {
  return (
    <button
        onClick={handleCreateGame}
        disabled={creating}
        className="btn-primary btn-green"
          >
            {creating ? 'Creating...' : 'Create New Game'}
    </button>
  )
}

export default CreateGameButton
