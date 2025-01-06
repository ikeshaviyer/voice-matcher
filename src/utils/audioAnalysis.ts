export interface AudioFeatures {
  pitchData: number[];
  amplitudeData: number[];
  duration: number;
}

export class AudioAnalyzer {
  private context: AudioContext;
  
  constructor() {
    this.context = new AudioContext();
  }

  async analyzePitch(audioBuffer: AudioBuffer): Promise<AudioFeatures> {
    const analyzer = this.context.createAnalyser();
    analyzer.fftSize = 2048;
    
    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyzer);
    
    // Get frequency data
    const pitchArray = new Float32Array(analyzer.frequencyBinCount);
    analyzer.getFloatFrequencyData(pitchArray);
    
    // Get amplitude data using our improved method
    const rawData = new Float32Array(audioBuffer.length);
    audioBuffer.copyFromChannel(rawData, 0);
    
    const windowSize = 1024;
    const amplitudeData: number[] = [];
    
    for (let i = 0; i < rawData.length; i += windowSize) {
      let sum = 0;
      const end = Math.min(i + windowSize, rawData.length);
      for (let j = i; j < end; j++) {
        sum += rawData[j] * rawData[j];
      }
      const rms = Math.sqrt(sum / (end - i));
      amplitudeData.push(rms);
    }
    
    return {
      pitchData: Array.from(pitchArray),
      amplitudeData,
      duration: audioBuffer.duration
    };
  }

  async compareAudio(original: AudioFeatures, recorded: AudioFeatures): Promise<{
    score: number;
    durationMatch: number;
    pitchMatch: number;
    amplitudeMatch: number;
  }> {
    // Check if recording is just silence
    const recordedAvgAmplitude = this.getAverageAmplitude(recorded.amplitudeData);
    if (recordedAvgAmplitude < 0.01) {
      return {
        score: 0,
        durationMatch: 0,
        pitchMatch: 0,
        amplitudeMatch: 0
      };
    }

    // Duration score (20%)
    const durationMatch = Math.max(0, 100 - 
      (Math.abs(original.duration - recorded.duration) / original.duration) * 100
    );

    // Pitch score (40%)
    const pitchMatch = this.compareArrays(original.pitchData, recorded.pitchData);
    
    // Amplitude score (40%)
    const amplitudeMatch = this.compareArrays(original.amplitudeData, recorded.amplitudeData);
    
    const score = Math.round(
      durationMatch * 0.2 +
      pitchMatch * 0.4 +
      amplitudeMatch * 0.4
    );

    return {
      score,
      durationMatch,
      pitchMatch,
      amplitudeMatch
    };
  }

  private getAverageAmplitude(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + Math.abs(b), 0);
    return sum / arr.length;
  }

  private compareArrays(arr1: number[], arr2: number[]): number {
    const length = Math.min(arr1.length, arr2.length);
    const normalizedArr1 = this.normalizeArray(arr1.slice(0, length));
    const normalizedArr2 = this.normalizeArray(arr2.slice(0, length));
    
    let totalDiff = 0;
    let significantPoints = 0;
    
    for (let i = 0; i < length; i++) {
      // Only compare points where at least one signal has significant amplitude
      if (normalizedArr1[i] > 0.1 || normalizedArr2[i] > 0.1) {
        totalDiff += Math.abs(normalizedArr1[i] - normalizedArr2[i]);
        significantPoints++;
      }
    }
    
    if (significantPoints === 0) return 0;
    return Math.max(0, 100 - (totalDiff / significantPoints) * 100);
  }

  private normalizeArray(arr: number[]): number[] {
    const max = Math.max(...arr);
    if (max === 0) return arr; // Prevent division by zero
    
    return arr.map(value => value / max);
  }

  async audioBufferFromBlob(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    return await this.context.decodeAudioData(arrayBuffer);
  }
}

export const audioAnalyzer = new AudioAnalyzer(); 