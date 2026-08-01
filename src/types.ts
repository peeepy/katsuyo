export type POS = 'godan' | 'ichidan' | 'iadj' | 'naadj' | 'irregular' | 'kuru' | 'suru' | 'iku';

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
  validReadings: string[];
}

export interface Question {
  source: ConjugationResult;
  target: ConjugationResult;
  sourceChain: string; 
  targetLabel: string;
  instruction: string;
  english: string;
}

export interface DrillSettings {
  numQuestions: number;
  focus: string; 
  mode: 'plain' | 'convert' | 'combined'; // Added combined
  furigana: 'always' | 'hover' | 'off';
  translation: 'always' | 'hover' | 'off'; // Added translation
  forms: Record<string, boolean>; 
  wordTypes: Record<string, boolean>;
}