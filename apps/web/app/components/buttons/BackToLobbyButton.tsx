import React from 'react'

const BackToLobbyButton = ({ handleReturnToLobby }: { handleReturnToLobby: () => void }) => {
  return (
    <button
        onClick={handleReturnToLobby}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        >
        ← Back to lobby
    </button>
  )
}

export default BackToLobbyButton
