'use client';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import ChessGame from '../../components/chess/ChessGame';
import BackToLobbyButton from '@/app/components/buttons/BackToLobbyButton';

export default function GamePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = params.id as string;
  const gameId = Number(id);


                      
  const playerColor =
    (searchParams.get('color') ?? 'white') === 'black' ? 'black' : 'white';

  const handleReturnToLobby = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <BackToLobbyButton handleReturnToLobby={handleReturnToLobby} />
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
