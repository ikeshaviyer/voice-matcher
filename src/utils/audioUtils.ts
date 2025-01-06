import { AudioClip } from '../types/audio';

class AudioManager {
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private currentSource: AudioBufferSourceNode | null = null;
  private context: AudioContext; // Will be initialized in constructor

  constructor() {
    this.context = new AudioContext();
  }

  private async initAudioContext() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  async loadAudioClips(clips: AudioClip[]): Promise<void> {
    await this.initAudioContext();
    await Promise.all(clips.map(clip => this.loadSingleClip(clip)));
  }

  private async loadSingleClip(clip: AudioClip): Promise<void> {
    try {
      const response = await fetch(clip.file);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      
      // Set the actual duration in milliseconds
      clip.duration = audioBuffer.duration * 1000;
      
      this.audioBuffers.set(clip.id, audioBuffer);
    } catch (error) {
      console.error(`Failed to load audio clip ${clip.name}:`, error);
    }
  }

  async loadAllClips(clips: AudioClip[]): Promise<void> {
    await this.initAudioContext();
    await Promise.all(clips.map(clip => this.loadSingleClip(clip)));
  }

  play(clipId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.context) {
        reject(new Error('AudioContext not initialized'));
        return;
      }

      const buffer = this.audioBuffers.get(clipId);
      if (!buffer) {
        reject(new Error(`Audio clip ${clipId} not loaded`));
        return;
      }

      // Stop any currently playing audio
      if (this.currentSource) {
        this.currentSource.stop();
      }

      // Create and configure new source
      this.currentSource = this.context.createBufferSource();
      this.currentSource.buffer = buffer;
      this.currentSource.connect(this.context.destination);

      // Handle completion
      this.currentSource.onended = () => {
        this.currentSource = null;
        resolve();
      };

      // Start playback
      this.currentSource.start();
    });
  }

  stop() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
  }

  getBuffer(clipId: string): AudioBuffer | undefined {
    return this.audioBuffers.get(clipId);
  }
}

// Create a singleton instance
export const audioManager = new AudioManager(); 