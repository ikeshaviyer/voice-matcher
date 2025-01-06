import React, { useEffect, useState, useRef } from 'react';

interface AudioInputBarProps {
  onDeviceSelect: (deviceId: string) => void;
}

export const AudioInputBar: React.FC<AudioInputBarProps> = ({ onDeviceSelect }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isPlaybackEnabled, setIsPlaybackEnabled] = useState(false);
  const [volume, setVolume] = useState<number>(0.75); // Default volume at 75%
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        setDevices(audioDevices);
        
        if (audioDevices.length > 0) {
          setSelectedDevice(audioDevices[0].deviceId);
          onDeviceSelect(audioDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    getDevices();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [onDeviceSelect]);

  useEffect(() => {
    if (!selectedDevice) return;

    let animationId: number;
    
    const setupAudio = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          await audioContextRef.current.close();
        }

        audioContextRef.current = new AudioContext({ sampleRate: 48000 });
        
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { 
            deviceId: { exact: selectedDevice },
            echoCancellation: false,  // Disable echo cancellation
            noiseSuppression: false,  // Disable noise suppression
            autoGainControl: false,   // Disable auto gain
            latency: 0,               // Minimize latency
            sampleRate: 48000         // Higher sample rate
          }
        });
        streamRef.current = stream;

        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        gainNodeRef.current = audioContextRef.current.createGain();
        analyserRef.current = audioContextRef.current.createAnalyser();

        analyserRef.current.fftSize = 2048;  // Increased FFT size
        analyserRef.current.smoothingTimeConstant = 0.6;

        gainNodeRef.current.gain.value = volume;

        sourceRef.current.connect(analyserRef.current);
        sourceRef.current.connect(gainNodeRef.current);

        if (isPlaybackEnabled) {
          gainNodeRef.current.connect(audioContextRef.current.destination);
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        
        const updateLevel = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += (dataArray[i] / 128.0) * (dataArray[i] / 128.0);
          }
          const rms = Math.sqrt(sum / dataArray.length);
          const scaledLevel = Math.min(100, rms * 150);
          setAudioLevel(scaledLevel);
          
          animationId = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };

    setupAudio();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [selectedDevice, volume]);

  useEffect(() => {
    if (!gainNodeRef.current || !audioContextRef.current) return;

    if (isPlaybackEnabled) {
      gainNodeRef.current.connect(audioContextRef.current.destination);
    } else {
      gainNodeRef.current.disconnect(audioContextRef.current.destination);
    }
  }, [isPlaybackEnabled]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <select
        value={selectedDevice}
        onChange={(e) => {
          setSelectedDevice(e.target.value);
          onDeviceSelect(e.target.value);
        }}
        className="w-full p-2 bg-gray-700 text-white rounded-lg"
      >
        {devices.map(device => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
          </option>
        ))}
      </select>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="playback"
            checked={isPlaybackEnabled}
            onChange={() => setIsPlaybackEnabled(prev => !prev)}
            className="w-4 h-4"
          />
          <label htmlFor="playback" className="text-sm">
            Enable live playback
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="volume" className="text-sm min-w-[60px]">
            Volume:
          </label>
          <input
            type="range"
            id="volume"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full"
          />
          <span className="text-sm min-w-[40px]">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-100"
          style={{ width: `${audioLevel}%` }}
        />
      </div>
      <div className="text-xs text-gray-400 text-right">
        Level: {Math.round(audioLevel)}%
      </div>
    </div>
  );
}; 