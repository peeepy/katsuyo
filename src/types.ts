// types.ts

export type POS = 'godan' | 'ichidan' | 'iadj' | 'naadj' | 'irregular';

// Track the active conjugation ruleset so the next function knows how to behave
export type Paradigm = 'godan' | 'ichidan' | 'iadj' | 'naadj' | 'irregular' | 'masu-stem' | 'te-form';

export interface WordState {
  kanji: string;
  reading: string;
  paradigm: Paradigm;
  chain: string[];
  label: string;
}

export interface TargetStructure {
  voice: 'causative' | 'passive' | 'potential' | 'none';
  aspect: 'progressive' | 'none';
  desire: boolean;
  volitional: boolean;
  imperative: boolean;
  polarity: 'positive' | 'negative';
  politeness: 'plain' | 'polite';
  tense: 'present' | 'past';
  te: boolean;
}

export interface Word {
  kanji: string;
  reading: string;
  pos: POS;
  english: string;
}

export interface ConjugationResult {
  kanji: string;
  reading: string;
  furiRoot: string;
  furiReading: string;
  explanation: string[];
}

export interface Question {
  source: ConjugationResult;
  target: ConjugationResult;
  sourceChain: string; // This fixes your ts(2322) error. It's just a string flag now.
  targetLabel: string;
}

export interface DrillSettings {
  numQuestions: number;
  focus: string; 
  mode: 'plain' | 'convert';
  furigana: 'always' | 'hover' | 'off';
  forms: {
    plain: boolean;
    polite: boolean;
    negative: boolean;
    past: boolean;
    te: boolean;
    progressive: boolean;
    desire: boolean;
    volitional: boolean;
    potential: boolean;
    imperative: boolean;
    passive: boolean;
    causative: boolean;
  };
  wordTypes: {
    godan: boolean;
    ichidan: boolean;
    iadj: boolean;
    naadj: boolean;
    irregular: boolean;
  };
}