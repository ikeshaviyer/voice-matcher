import { useState, useRef } from 'react';

interface VoiceRecorderHook {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  isRecording: boolean;
  error: string | null;
}

export const useVoiceRecorder = (deviceId: string): VoiceRecorderHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      chunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('Failed to start recording');
      console.error('Recording error:', err);
    }
  };

  const stopRecording = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder.current || mediaRecorder.current.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        chunks.current = [];
        setIsRecording(false);
        resolve(blob);

        // Stop all tracks
        mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.stop();
    });
  };

  return {
    startRecording,
    stopRecording,
    isRecording,
    error
  };
}; 