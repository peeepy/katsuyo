import { useEffect, useRef, useState, type Dispatch, type ReactNode, type TouchEvent } from 'react';
import * as wanakana from 'wanakana';
import { type ConjugationResult, type DrillSettings } from '../types';
import { type QuizState, type QuizAction } from '../quizState';
import { ThemeQuickSwitcher } from './ThemeQuickSwitcher';

interface FlashcardQuizProps {
  state: QuizState;
  settings: DrillSettings;
  isCorrect: boolean;
  dispatch: Dispatch<QuizAction>;
  renderRuby: (res: ConjugationResult) => ReactNode;
  onNext: () => void;
  onOpenSettings: () => void;
}

const SWIPE_ADVANCE_THRESHOLD_PX = 70;

export function FlashcardQuiz({ state, settings, isCorrect, dispatch, renderRuby, onNext, onOpenSettings }: FlashcardQuizProps) {
  const currentQ = state.questions[state.currentIndex];
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // The input becomes `disabled` once graded, which means it can no longer
  // hold focus or receive keydown events — so Enter has to be caught by
  // focusing the Next button instead, same pattern as the non-flashcard view.
  useEffect(() => {
    if (state.status === 'answering') inputRef.current?.focus();
    if (state.status === 'graded') nextBtnRef.current?.focus();
  }, [state.status, state.currentIndex]);

  if (!currentQ) return null;

  const total = settings.numQuestions === 0 ? null : state.questions.length;

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (state.status !== 'graded') return;
    startX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (state.status !== 'graded' || startX.current === null) return;
    setDragX(e.touches[0].clientX - startX.current);
  };
  const onTouchEnd = () => {
    if (state.status === 'graded' && Math.abs(dragX) > SWIPE_ADVANCE_THRESHOLD_PX) {
      onNext();
    }
    setDragX(0);
    startX.current = null;
  };

  return (
    <div className="flashcard-screen">
      <div className="flashcard-topbar">
        <span className="flashcard-progress">
          問 {state.currentIndex + 1}{total !== null ? ` / ${total}` : ' · ∞'}
        </span>
        <span className="flashcard-streak">streak {state.streak}</span>
        <div className="flashcard-topbar-actions">
          <ThemeQuickSwitcher />
          <button type="button" className="icon-btn" onClick={onOpenSettings} aria-label="Settings">⚙️</button>
        </div>
      </div>

      <div
        className="flashcard-card"
        style={{ transform: dragX ? `translateX(${dragX}px) rotate(${dragX / 40}deg)` : undefined }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {settings.translation !== 'off' && currentQ.english && (
          <div className={settings.translation === 'hover' ? 'translation-hover' : 'translation'}>
            {currentQ.english}
          </div>
        )}

        <div className="flashcard-stimulus">{renderRuby(currentQ.source)}</div>
        <div className="flashcard-instruction">→ {currentQ.instruction}</div>

        {state.status === 'graded' && (
          <div className="flashcard-result">
            <div className={isCorrect ? 'stamp stamp-good' : 'stamp stamp-bad'}>{isCorrect ? '○' : '✕'}</div>
            {!isCorrect && (
              <div className="flashcard-answer">
                <div className="correct-kana">{renderRuby(currentQ.target)}</div>
                <div className="correct-romaji">{wanakana.toRomaji(currentQ.target.reading)}</div>
              </div>
            )}
            {!isCorrect && currentQ.target.explanation.length > 0 && (
              <div className="explanation-box">
                <div className="explanation-title">Rule breakdown:</div>
                <ol className="explanation-list">
                  {currentQ.target.explanation.map((note, i) => <li key={i}>{note}</li>)}
                </ol>
              </div>
            )}
            <div className="flashcard-swipe-hint flashcard-swipe-hint-touch">swipe to continue</div>
            <div className="flashcard-swipe-hint flashcard-swipe-hint-pointer">press enter or tap next to continue</div>
          </div>
        )}
      </div>

      <div className="flashcard-input-row">
        <input
          ref={inputRef}
          type="text"
          disabled={state.status === 'graded'}
          value={state.userAnswer}
          onChange={e => dispatch({
            type: 'TYPE_ANSWER',
            payload: wanakana.toKana(e.target.value, { IMEMode: 'toHiragana' }),
          })}
          onKeyDown={e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (state.status === 'answering') dispatch({ type: 'SUBMIT_ANSWER' });
            else onNext();
          }}
          placeholder="type romaji..."
          className="answer-input"
        />
        {state.status === 'answering' ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'SUBMIT_ANSWER' })}
            className="btn-primary btn-primary-compact"
          >
            Check
          </button>
        ) : (
          <button ref={nextBtnRef} type="button" onClick={onNext} className="btn-primary btn-primary-compact">
            Next
          </button>
        )}
      </div>
    </div>
  );
}