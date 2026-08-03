import { type WordGroup } from './utils/wordGroups';


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
  group: WordGroup; // which grammatical group this word belongs to, for the UI hint button
}

export type FormKey =
  | 'plain'
  | 'polite'
  | 'negative'
  | 'past'
  | 'te'
  | 'progressive'
  | 'desire'
  | 'volitional'
  | 'potential'
  | 'imperative'
  | 'passive'
  | 'causative';

export type WordTypeKey = WordGroup;

export interface DrillSettings {
  numQuestions: number;
  focus: string;
  mode: 'plain' | 'convert' | 'combined';
  furigana: 'always' | 'hover' | 'off';
  translation: 'always' | 'hover' | 'off';
  forms: {
    verb: Record<FormKey, boolean>;
    adj: Record<FormKey, boolean>;
  };
  wordTypes: Record<WordTypeKey, boolean>;
}