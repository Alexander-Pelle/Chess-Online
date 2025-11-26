"use client";

const JoinGameButton = ({ startGame }: { startGame: () => void }) => {
  return (
    <button
        onClick={startGame}
        className="btn-primary btn-blue"
        >
            Join Game
    </button>
  )
}

export default JoinGameButton
