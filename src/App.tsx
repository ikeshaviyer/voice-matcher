import React, { useState } from 'react';
import { AudioInputBar } from './components/AudioInputBar';
import { GameScreen } from './components/GameScreen';

type GameState = 'title' | 'game' | 'end';

function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [finalScore, setFinalScore] = useState<number>(0);
  const [finalMessage, setFinalMessage] = useState<string>('');

  const handleStartGame = () => {
    if (selectedDevice) {
      setGameState('game');
    } else {
      alert('Please select a microphone first!');
    }
  };

  const handleGameEnd = (score: number, message: string) => {
    setFinalScore(score);
    setFinalMessage(message);
    setGameState('end');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {gameState === 'title' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-6xl font-bold mb-12 text-center bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Voice Matcher
          </h1>
          
          <div className="w-full max-w-md mb-8">
            <AudioInputBar onDeviceSelect={setSelectedDevice} />
          </div>

          <button 
            onClick={handleStartGame}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Start Game
          </button>
        </div>
      )}

      {gameState === 'game' && (
        <GameScreen 
          deviceId={selectedDevice}
          onGameEnd={handleGameEnd}
        />
      )}

      {gameState === 'end' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h2 className="text-4xl mb-8">Game Over!</h2>
          <div className="text-2xl mb-4">Final Score: {finalScore.toFixed(1)}%</div>
          <div className="text-xl text-gray-400 mb-8">{finalMessage}</div>
          <button 
            onClick={() => setGameState('title')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default App; 