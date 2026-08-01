import * as wanakana from 'wanakana';
import { type Question, type ConjugationResult, type DrillSettings } from './types';

// Business logic decoupled from the view
export const checkIsCorrect = (userInput: string, expectedKana: string, expectedKanji?: string): boolean => {
  const normalizedInput = userInput.trim();
  if (expectedKanji && normalizedInput === expectedKanji) {
    return true;
  }
  return wanakana.toKana(normalizedInput) === expectedKana;
};

export type QuizStatus = 'idle' | 'answering' | 'graded' | 'summary';

export interface QuizState {
  status: QuizStatus;
  settings: DrillSettings;
  questions: Question[];
  currentIndex: number;
  userAnswer: string;
  streak: number;
  longestStreak: number;
  correctCount: number;
  missed: { source: ConjugationResult; target: ConjugationResult; label: string }[];
}

export type QuizAction = 
  | { type: 'START'; payload: Question[] }
  | { type: 'TYPE_ANSWER'; payload: string }
  | { type: 'SUBMIT_ANSWER' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'UPDATE_SETTINGS'; payload: { settings: DrillSettings, remainingQuestions?: Question[] } }
  | { type: 'GO_HOME' }
  | { type: 'APPEND_QUESTIONS'; payload: Question[] }
  | { type: 'END_SESSION' };

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: 'answering',
        questions: action.payload,
        currentIndex: 0,
        userAnswer: '',
        streak: 0,
        longestStreak: 0,
        correctCount: 0,
        missed: []
      };
      
    case 'TYPE_ANSWER':
      if (state.status !== 'answering') return state;
      return { ...state, userAnswer: action.payload };
      
    case 'SUBMIT_ANSWER':
      if (state.status !== 'answering' || !state.userAnswer.trim()) return state;
      
      const currentQ = state.questions[state.currentIndex];
      const correct = checkIsCorrect(state.userAnswer, currentQ.target.reading, currentQ.target.kanji);
      
      return {
        ...state,
        status: 'graded',
        streak: correct ? state.streak + 1 : 0,
        longestStreak: correct ? Math.max(state.longestStreak, state.streak + 1) : state.longestStreak,
        correctCount: state.correctCount + (correct ? 1 : 0),
        missed: correct ? state.missed : [...state.missed, {
          source: currentQ.source,
          target: currentQ.target,
          label: currentQ.targetLabel,
        }]
      };
      
    case 'NEXT_QUESTION':
      if (state.status !== 'graded') return state;
      const isComplete = state.currentIndex + 1 >= state.questions.length;
      
      return {
        ...state,
        status: isComplete ? 'summary' : 'answering',
        currentIndex: isComplete ? state.currentIndex : state.currentIndex + 1,
        userAnswer: ''
      };
      
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: action.payload.settings,
        questions: action.payload.remainingQuestions 
          ? [...state.questions.slice(0, state.currentIndex + 1), ...action.payload.remainingQuestions]
          : state.questions
      };
      
    case 'GO_HOME':
      return { ...state, status: 'idle' };

    case 'APPEND_QUESTIONS':
      return {
        ...state,
        questions: [...state.questions, ...action.payload]
      };
      
    case 'END_SESSION':
      return {
        ...state,
        status: 'summary'
      };
      
    default:
      return state;
  }
}