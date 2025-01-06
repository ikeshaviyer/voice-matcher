export interface AudioClip {
  id: string;
  name: string;
  file: string;
  duration?: number;
}

export interface Score {
  clipId: string;
  score: number;
}

export const SAMPLE_CLIPS: AudioClip[] = [
  {
    id: 'clip1',
    name: 'I am the one who knocks',
    file: '/assets/audio/Breaking Bad SFX - I Am The One Who Knocks.mp3',
  },
  {
    id: 'clip2',
    name: 'Mario Wahoo',
    file: '/assets/audio/YAHOO SOUND EFFECT (MARIO).mp3',
  },
  {
    id: 'clip3',
    name: 'Mario Fall',
    file: '/assets/audio/Mario Fall (Waa) - Sound Effect (HD).mp3',
  },
  {
    id: 'clip4',
    name: 'Toad Scream',
    file: '/assets/audio/Toads scream in mario kart 64.mp3',
  },
  {
    id: 'clip5',
    name: 'Boo Laugh',
    file: '/assets/audio/Boo Laugh.mp3',
  },
  {
    id: 'clip6',
    name: 'Yoshi Eat',
    file: '/assets/audio/Yoshi Eat.mp3',
  },
  {
    id: 'clip7',
    name: 'Yoshi OWOWOW',
    file: '/assets/audio/Yoshi Owowowow.mp3',
  },
  {
    id: 'clip8',
    name: 'Shadow the Hedgehog - Im the Coolest',
    file: '/assets/audio/Shadow the Hedgehog - Im the Coolest.mp3',
  },
  {
    id: 'clip7',
    name: 'SNOOPING AS USUAL I SEE',
    file: '/assets/audio/SNOOPING AS USUAL I SEE.mp3',
  },
]; 