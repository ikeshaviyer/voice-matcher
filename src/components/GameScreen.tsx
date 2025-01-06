import React, { useState, useEffect } from 'react';
import { audioManager } from '../utils/audioUtils';
import { audioAnalyzer } from '../utils/audioAnalysis';
import { SAMPLE_CLIPS, AudioClip, Score } from '../types/audio';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface GameScreenProps {
  deviceId: string;
  onGameEnd: (score: number, message: string) => void;
}

interface DetailedScore extends Score {
  durationMatch: number;
  pitchMatch: number;
  amplitudeMatch: number;
}

export const GameScreen: React.FC<GameScreenProps> = ({ deviceId, onGameEnd }) => {
  const [round, setRound] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'countdown' | 'recording' | 'scored' | 'ready'>('ready');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [scores, setScores] = useState<DetailedScore[]>([]);
  const [currentClip, setCurrentClip] = useState<AudioClip | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastRecording, setLastRecording] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const { 
    startRecording, 
    stopRecording, 
    isRecording, 
    error: recorderError 
  } = useVoiceRecorder(deviceId);

  useEffect(() => {
    const loadAudio = async () => {
      setLoadingAudio(true);
      try {
        await audioManager.loadAllClips(SAMPLE_CLIPS);
        const firstClip = SAMPLE_CLIPS[Math.floor(Math.random() * SAMPLE_CLIPS.length)];
        setCurrentClip(firstClip);
        setLoadingAudio(false);
      } catch (error) {
        console.error('Error loading audio clips:', error);
        setLoadingAudio(false);
      }
    };

    loadAudio();
  }, []);

  const playClip = async () => {
    if (!currentClip) {
      console.error('No clip selected');
      return;
    }
    
    setGameState('playing');
    console.log('Playing clip:', currentClip.name);
    
    try {
      await audioManager.play(currentClip.id);
      setGameState('countdown');
      startCountdown();
    } catch (error) {
      console.error('Error playing audio:', error);
      setGameState('ready');
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (prev === 1) {
            setGameState('recording');
            handleStartRecording();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
      // Stop recording after clip duration
      setTimeout(handleStopRecording, currentClip?.duration || 5000);
    } catch (err) {
      setRecordingError('Failed to start recording');
      console.error('Recording error:', err);
    }
  };

  const handleStopRecording = async () => {
    if (!currentClip) return;
    
    try {
      setAnalyzing(true);
      setRecordingError(null);
      const recordingBlob = await stopRecording();
      setLastRecording(recordingBlob);
      
      const originalBuffer = audioManager.getBuffer(currentClip.id);
      if (!originalBuffer) {
        throw new Error('Original audio not found');
      }
      
      const recordedBuffer = await audioAnalyzer.audioBufferFromBlob(recordingBlob);
      const originalFeatures = await audioAnalyzer.analyzePitch(originalBuffer);
      const recordedFeatures = await audioAnalyzer.analyzePitch(recordedBuffer);
      const results = await audioAnalyzer.compareAudio(originalFeatures, recordedFeatures);
      
      // Use only amplitude match for the score
      const finalScore = Math.round(results.amplitudeMatch);

      setScores(prev => [...prev, {
        clipId: currentClip.id,
        score: finalScore,
        durationMatch: results.durationMatch, // Keep tracking but don't use for score
        amplitudeMatch: results.amplitudeMatch,
        pitchMatch: 0
      }]);
      setGameState('scored');
    } catch (err: unknown) {
      console.error('Full analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setRecordingError(`Failed to analyze recording: ${errorMessage}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const startNextRound = () => {
    setRecordingError(null);
    setGameState('ready');
    
    if (scores.length >= 5) {
      const finalScore = scores.reduce((a, b) => a + b.score, 0) / scores.length;
      const finalMessage = finalScore >= 90 ? "You have potential..." :
                          finalScore >= 75 ? "You might have a future in elevator music." :
                          finalScore >= 50 ? "Never pick up a microphone again..." :
                          finalScore >= 25 ? "Stick to singing in the shower..." :
                          "I have no words for this...";
      onGameEnd(finalScore, finalMessage);
      return;
    }

    setRound(prev => prev + 1);
    const unusedClips = SAMPLE_CLIPS.filter(clip => 
      !scores.some(score => score.clipId === clip.id)
    );
    const clip = unusedClips[Math.floor(Math.random() * unusedClips.length)];
    setCurrentClip(clip);
  };

  const playLastRecording = async () => {
    if (lastRecording) {
      const audioUrl = URL.createObjectURL(lastRecording);
      const audio = new Audio(audioUrl);
      await audio.play();
      URL.revokeObjectURL(audioUrl);
    }
  };

  if (loadingAudio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-2xl mb-4">Loading audio clips...</div>
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-2xl mb-8">Round {round}/5</div>
      
      {gameState === 'ready' && (
        <button
          onClick={playClip}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors mb-8"
        >
          Play Sample Audio
        </button>
      )}

      {gameState === 'playing' && (
        <div className="text-xl text-blue-400 mb-8">
          Listen carefully...
          <div className="w-16 h-16 mt-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      )}

      {gameState === 'countdown' && countdown !== null && (
        <div className="text-6xl mb-8 text-yellow-400 animate-pulse">
          Get Ready: {countdown}
        </div>
      )}

      {gameState === 'recording' && (
        <div className="text-xl text-red-400 mb-8">
          Recording...
          <div className="w-4 h-4 mt-4 bg-red-500 rounded-full animate-ping mx-auto"></div>
        </div>
      )}

      {analyzing && (
        <div className="text-xl text-purple-400 mb-8">
          Analyzing your performance...
          <div className="w-16 h-16 mt-4 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      )}

      {gameState === 'scored' && (
        <div className="flex flex-col items-center gap-4 mb-8">
          <button
            onClick={playLastRecording}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
          >
            Play Your Recording
          </button>
          <button
            onClick={startNextRound}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            Next Round
          </button>
        </div>
      )}

      <div className="space-y-4 w-full max-w-md">
        {scores.map((score, index) => {
          const clip = SAMPLE_CLIPS.find(c => c.id === score.clipId);
          return (
            <div key={index} className="bg-gray-800 p-4 rounded-lg">
              <div className="text-lg mb-2">
                Round {index + 1} - {clip?.name}
              </div>
              <div className="text-2xl mb-2 font-bold text-blue-400">
                Score: {score.score}%
              </div>
              <div className="text-sm text-gray-400">
              </div>
            </div>
          );
        })}
      </div>

      {(recordingError || recorderError) && gameState !== 'scored' && (
        <div className="text-red-500 mt-4">
          {recordingError || recorderError}
        </div>
      )}
    </div>
  );
}; 