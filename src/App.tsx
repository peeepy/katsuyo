import { useReducer, useEffect, useRef, useState } from 'react';
import * as wanakana from 'wanakana';
import './App.css';
import './theme/themes.css';
import { type ConjugationResult, type DrillSettings, type FormKey } from './types';
import { createQuestionsList, getEligibleWords } from './engine';
import { quizReducer, checkIsCorrect, type QuizState } from './quizState';
import { GROUP_META, getWordGroupLabel, type WordGroup } from './utils/wordGroups';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { ThemeSelector } from './components/ThemeSelector';
import { ThemeQuickSwitcher } from './components/ThemeQuickSwitcher.tsx';
import { SettingsShell } from './components/SettingsShell';
import { FlashcardQuiz } from './components/FlashcardQuiz';

const VERB_TYPE_KEYS: WordGroup[] = GROUP_META.filter(g => g.category === 'verb').map(g => g.key);
const ADJ_TYPE_KEYS: WordGroup[] = GROUP_META.filter(g => g.category === 'adj').map(g => g.key);
const VERB_FORM_KEYS: FormKey[] = ['plain', 'polite', 'negative', 'past', 'te', 'progressive', 'desire', 'volitional', 'potential', 'imperative', 'passive', 'causative'];
const ADJ_FORM_KEYS: FormKey[] = ['plain', 'polite', 'negative', 'past', 'te'];

const DEFAULT_SETTINGS: DrillSettings = {
  numQuestions: 20,
  focus: '',
  mode: 'combined',
  furigana: 'always',
  translation: 'always',
  forms: {
    verb: { plain: true, polite: true, negative: true, past: true, te: true, progressive: true, desire: true, volitional: true, potential: true, imperative: true, passive: true, causative: true },
    adj: { plain: true, polite: true, negative: true, past: true, te: true, progressive: false, desire: false, volitional: false, potential: false, imperative: false, passive: false, causative: false }
  },
  wordTypes: Object.fromEntries(GROUP_META.map(g => [g.key, true])) as DrillSettings['wordTypes'],
};

const initialState: QuizState = {
  status: 'idle',
  settings: DEFAULT_SETTINGS,
  questions: [],
  currentIndex: 0,
  userAnswer: '',
  streak: 0,
  longestStreak: 0,
  correctCount: 0,
  missed: []
};

function WordTypeHint({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  return (
    <div className="hint-wrap" ref={ref}>
      <button type="button" className="hint-btn" onClick={() => setOpen(o => !o)} aria-label="Word type hint">
        ?
      </button>
      {open && <div className="hint-tooltip">{label}</div>}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const { theme } = useTheme();
  const [state, dispatch] = useReducer(quizReducer, initialState);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const currentQ = state.questions[state.currentIndex];
  const isCorrect = state.status === 'graded'
    ? (currentQ?.target.validReadings?.includes(state.userAnswer) || checkIsCorrect(state.userAnswer, currentQ?.target.reading, currentQ?.target.kanji))
    : false;

  const startQuiz = () => {
    const pool = getEligibleWords(state.settings);
    if (pool.length === 0) {
      alert("pool's empty. select more word types or forms.");
      return;
    }
    const initialCount = state.settings.numQuestions === 0 ? 20 : state.settings.numQuestions;
    dispatch({ type: 'START', payload: createQuestionsList(initialCount, state.settings) });
  };

  const advance = () => {
    if (state.settings.numQuestions === 0 && state.currentIndex >= state.questions.length - 3) {
      dispatch({ type: 'APPEND_QUESTIONS', payload: createQuestionsList(20, state.settings) });
    }
    dispatch({ type: 'NEXT_QUESTION' });
  };

  useEffect(() => {
    if (state.status === 'answering' && inputRef.current && !showSettingsModal) {
      inputRef.current.focus();
    }
    if (state.status === 'graded' && nextBtnRef.current && !showSettingsModal) {
      nextBtnRef.current.focus();
    }
  }, [state.status, showSettingsModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.status === 'summary' && e.key === 'Enter' && !showSettingsModal) {
        e.preventDefault();
        dispatch({ type: 'GO_HOME' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status, showSettingsModal]);

  const handleSettingsSave = (newSettings: DrillSettings) => {
    let remainingQuestions;
    if (state.status === 'answering' || state.status === 'graded') {
      if (newSettings.numQuestions === 0) {
        remainingQuestions = createQuestionsList(20, newSettings);
      } else {
        const remainingCount = Math.max(0, newSettings.numQuestions - (state.currentIndex + 1));
        remainingQuestions = createQuestionsList(remainingCount, newSettings);
      }
    }
    dispatch({ type: 'UPDATE_SETTINGS', payload: { settings: newSettings, remainingQuestions } });
    setShowSettingsModal(false);
  };

  const renderRuby = (res: ConjugationResult) => {
    if (state.settings.furigana === 'off' || !res.furiRoot) return <>{res.kanji}</>;
    const rest = res.kanji.slice(res.furiRoot.length);
    const rubyClass = state.settings.furigana === 'hover' ? 'ruby-hover' : '';
    return (
      <span className={rubyClass}>
        <ruby>
          {res.furiRoot}
          <rt>{res.furiReading}</rt>
        </ruby>
        {rest}
      </span>
    );
  };

  const showFlashcardView = theme === 'c' && (state.status === 'answering' || state.status === 'graded') && currentQ;

  return (
    <div className={`app-root ${showFlashcardView ? 'app-root-fullbleed' : ''}`}>
      {showFlashcardView ? (
        <FlashcardQuiz
          state={state}
          settings={state.settings}
          isCorrect={isCorrect}
          dispatch={dispatch}
          renderRuby={renderRuby}
          onNext={advance}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
      ) : (
        <div className="container">
          <div className="header-actions">
            <ThemeQuickSwitcher />
            {state.status !== 'idle' && state.settings.numQuestions === 0 && (state.status === 'answering' || state.status === 'graded') && (
              <button onClick={() => dispatch({ type: 'END_SESSION' })} className="btn-ghost btn-stop-drill">
                Stop Drill
              </button>
            )}
            {state.status !== 'idle' && (
              <button onClick={() => setShowSettingsModal(true)} className="icon-btn" aria-label="Settings">
                ⚙️
              </button>
            )}
          </div>

          <header className="hero">
            <div className="eyebrow">Katsuyō · 活用</div>
            <h1 className="title">活用</h1>
            <p className="sub">Japanese conjugation drills</p>
          </header>

          {state.status === 'idle' && (
            <div className="card">
              <SettingsPanel settings={state.settings} onChange={(s) => dispatch({ type: 'UPDATE_SETTINGS', payload: { settings: s } })} />
              <button onClick={startQuiz} className="btn-primary btn-start">
                Start Drill
              </button>
            </div>
          )}

          {(state.status === 'answering' || state.status === 'graded') && currentQ && (
            <div>
              <div className="quiz-top">
                <span>問 {state.currentIndex + 1} {state.settings.numQuestions === 0 ? ' (∞)' : `/ ${state.questions.length}`}</span>
                <span className="streak-label">streak {state.streak}</span>
              </div>

              {theme === 'd' && state.settings.numQuestions !== 0 && (
                <div className="progress-track" aria-hidden="true">
                  <div
                    className="progress-fill"
                    style={{ width: `${(state.currentIndex / state.questions.length) * 100}%` }}
                  />
                </div>
              )}

              <div className="card card-center">
                <div className="stimulus-row">
                  <div className="stimulus">
                    {renderRuby(currentQ.source)}
                  </div>
                  <WordTypeHint label={getWordGroupLabel(currentQ.group)} />
                </div>

                {state.settings.translation !== 'off' && currentQ.english && (
                  <div className={state.settings.translation === 'hover' ? 'translation-hover' : 'translation'}>
                    {currentQ.english}
                  </div>
                )}

                <div className="instruction">
                  → {currentQ.instruction}
                </div>

                <div className="answer-row">
                  <input
                    ref={inputRef}
                    type="text"
                    disabled={state.status === 'graded'}
                    value={state.userAnswer}
                    onChange={e => dispatch({
                      type: 'TYPE_ANSWER',
                      payload: wanakana.toKana(e.target.value, { IMEMode: 'toHiragana' })
                    })}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && state.status === 'answering') {
                        e.preventDefault();
                        dispatch({ type: 'SUBMIT_ANSWER' });
                      }
                    }}
                    placeholder="type romaji..."
                    className="answer-input"
                  />
                  {state.status === 'answering' ? (
                    <button onClick={() => dispatch({ type: 'SUBMIT_ANSWER' })} className="btn-primary btn-primary-compact">Check</button>
                  ) : (
                    <button
                      ref={nextBtnRef}
                      onClick={advance}
                      className="btn-primary btn-primary-compact"
                    >
                      Next
                    </button>
                  )}
                </div>

                {state.status === 'graded' && (
                  <div className="feedback">
                    <div className={isCorrect ? "stamp stamp-good" : "stamp stamp-bad"}>
                      {isCorrect ? '○' : '✕'}
                    </div>
                    <div className="feedback-body">
                      {isCorrect ? (
                        <div className="feedback-correct-label">Correct!</div>
                      ) : (
                        <div className="feedback-answer-block">
                          <div>Correct answer:</div>
                          <div className="correct-kana">
                            {renderRuby(currentQ.target)}
                          </div>
                          <div className="correct-romaji">
                            {wanakana.toRomaji(currentQ.target.reading)}
                          </div>
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
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {state.status === 'summary' && (
            <div className="card card-center">
              <h2>Session Complete</h2>
              <div className="score-big">{state.correctCount} / {state.questions.length}</div>
              <p>Longest streak: <strong>{state.longestStreak}</strong></p>

              {state.missed.length > 0 && (
                <div className="missed-block">
                  <h3>Missed Conjugations:</h3>
                  <ul className="missed-list">
                    {state.missed.map((m, idx) => (
                      <li key={idx} className="missed-item">
                        {renderRuby(m.source)} ({m.label}) → <strong>{renderRuby(m.target)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={() => dispatch({ type: 'GO_HOME' })} className="btn-primary btn-main-menu">
                Main Menu
              </button>
            </div>
          )}
        </div>
      )}

      {showSettingsModal && (
        <SettingsModal
          initialSettings={state.settings}
          onSave={handleSettingsSave}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}

function SettingsModal({ initialSettings, onSave, onClose }: { initialSettings: DrillSettings, onSave: (s: DrillSettings) => void, onClose: () => void }) {
  const [localSettings, setLocalSettings] = useState<DrillSettings>(initialSettings);

  return (
    <SettingsShell
      title="Settings"
      onClose={onClose}
      footer={(
        <div className="settings-modal-actions">
          <button onClick={onClose} className="btn-ghost settings-modal-btn">Cancel</button>
          <button onClick={() => onSave(localSettings)} className="btn-primary settings-modal-btn">Close & Apply</button>
        </div>
      )}
    >
      {/* <ThemeSelector /> */}
      <SettingsPanel settings={localSettings} onChange={setLocalSettings} />
    </SettingsShell>
  );
}

type FormCategory = 'verb' | 'adj';

function SettingsPanel({ settings, onChange }: { settings: DrillSettings, onChange: (s: DrillSettings) => void }) {
  const [formWarning, setFormWarning] = useState<FormCategory | null>(null);
  const [categoryWarning, setCategoryWarning] = useState<FormCategory | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevVerbTypes = useRef<Partial<DrillSettings['wordTypes']> | null>(null);
  const prevAdjTypes = useRef<Partial<DrillSettings['wordTypes']> | null>(null);

  const showFormWarning = (category: FormCategory) => {
    setFormWarning(category);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    warningTimeoutRef.current = setTimeout(() => setFormWarning(null), 2500);
  };

  const showCategoryWarning = (category: FormCategory) => {
    setCategoryWarning(category);
    if (categoryWarningTimeoutRef.current) clearTimeout(categoryWarningTimeoutRef.current);
    categoryWarningTimeoutRef.current = setTimeout(() => setCategoryWarning(null), 2500);
  };

  useEffect(() => () => {
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (categoryWarningTimeoutRef.current) clearTimeout(categoryWarningTimeoutRef.current);
  }, []);

  const verbsEnabled = VERB_TYPE_KEYS.some(k => settings.wordTypes[k]);
  const adjEnabled = ADJ_TYPE_KEYS.some(k => settings.wordTypes[k]);

  const updateWordType = (key: keyof DrillSettings['wordTypes']) => {
    const category: FormCategory = VERB_TYPE_KEYS.includes(key) ? 'verb' : 'adj';
    const keys = category === 'verb' ? VERB_TYPE_KEYS : ADJ_TYPE_KEYS;
    const turningOff = settings.wordTypes[key];

    if (turningOff) {
      const otherActiveInCategory = keys.some(k => k !== key && settings.wordTypes[k]);
      const otherCategoryActive = category === 'verb' ? adjEnabled : verbsEnabled;
      if (!otherActiveInCategory && !otherCategoryActive) {
        showCategoryWarning(category);
        return;
      }
    }

    onChange({ ...settings, wordTypes: { ...settings.wordTypes, [key]: !settings.wordTypes[key] } });
  };

  const updateForm = (category: FormCategory, key: FormKey) => {
    const catForms = settings.forms[category];
    if (key === 'plain' && catForms.plain && !catForms.polite) { showFormWarning(category); return; }
    if (key === 'polite' && catForms.polite && !catForms.plain) { showFormWarning(category); return; }
    onChange({ ...settings, forms: { ...settings.forms, [category]: { ...catForms, [key]: !catForms[key] } } });
  };

  const toggleCategory = (category: FormCategory) => {
    const keys = category === 'verb' ? VERB_TYPE_KEYS : ADJ_TYPE_KEYS;
    const currentlyEnabled = category === 'verb' ? verbsEnabled : adjEnabled;
    const otherEnabled = category === 'verb' ? adjEnabled : verbsEnabled;

    if (currentlyEnabled) {
      if (!otherEnabled) {
        showCategoryWarning(category);
        return;
      }
      const snapshot: Partial<DrillSettings['wordTypes']> = {};
      keys.forEach(k => { snapshot[k] = settings.wordTypes[k]; });
      if (category === 'verb') prevVerbTypes.current = snapshot;
      else prevAdjTypes.current = snapshot;

      const newWordTypes = { ...settings.wordTypes };
      keys.forEach(k => { newWordTypes[k] = false; });
      onChange({ ...settings, wordTypes: newWordTypes });
    } else {
      const restore = category === 'verb' ? prevVerbTypes.current : prevAdjTypes.current;
      const newWordTypes = { ...settings.wordTypes };
      keys.forEach(k => { newWordTypes[k] = restore?.[k] ?? true; });
      onChange({ ...settings, wordTypes: newWordTypes });
    }
  };

  return (
    <div>
      <div className="field-group-row">
        <label className="label label-inline">Questions (0 = ∞)</label>
        <input type="number" min={0} max={999} value={settings.numQuestions} onChange={e => onChange({ ...settings, numQuestions: Number(e.target.value) })} className="input-number" />
      </div>

      <div className="field-group">
        <label className="label">Question Focus</label>
        <select value={settings.focus} onChange={e => onChange({ ...settings, focus: e.target.value })} className="select">
          <option value="">None (default)</option>
          <option value="PLAIN">Plain</option>
          <option value="POLITE">Polite</option>
          <option value="NEGATIVE">Negative</option>
          <option value="PAST">Past</option>
          <option value="TE">て form</option>
          <option value="PROGRESSIVE">Progressive</option>
          <option value="DESIRE">Desire</option>
          <option value="VOLITIONAL">Volitional</option>
          <option value="POTENTIAL">Potential</option>
          <option value="IMPERATIVE">Imperative</option>
          <option value="PASSIVE">Passive</option>
          <option value="CAUSATIVE">Causative</option>
        </select>
      </div>

      <div className="field-group">
        <label className="label">Mode</label>
        <div className="segmented">
          <button type="button" className={settings.mode === 'plain' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({ ...settings, mode: 'plain' })}>Plain</button>
          <button type="button" className={settings.mode === 'convert' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({ ...settings, mode: 'convert' })}>Convert</button>
          <button type="button" className={settings.mode === 'combined' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({ ...settings, mode: 'combined' })}>Combined</button>
        </div>
      </div>

      <div className="field-group">
        <label className="label">Furigana Mode</label>
        <div className="segmented">
          <button type="button" className={settings.furigana === 'always' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({ ...settings, furigana: 'always' })}>Always</button>
          <button type="button" className={settings.furigana === 'hover' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({ ...settings, furigana: 'hover' })}>Hover</button>
          <button type="button" className={settings.furigana === 'off' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({ ...settings, furigana: 'off' })}>Off</button>
        </div>
      </div>

      <div className="field-group">
        <label className="label">Translation</label>
        <div className="segmented">
          <button type="button" className={settings.translation === 'always' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({ ...settings, translation: 'always' })}>Always</button>
          <button type="button" className={settings.translation === 'hover' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({ ...settings, translation: 'hover' })}>Hover</button>
          <button type="button" className={settings.translation === 'off' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({ ...settings, translation: 'off' })}>Off</button>
        </div>
      </div>

      <hr className="divider" />

      <div className="settings-columns">
        <div className={`settings-section ${!verbsEnabled ? 'section-muted' : ''}`}>
          <div className="category-header">
            <label className="checkbox-label category-toggle">
              <input type="checkbox" checked={verbsEnabled} onChange={() => toggleCategory('verb')} />
              <span className="category-title">Verbs</span>
            </label>
          </div>
          {categoryWarning === 'verb' && (
            <div className="form-warning-tooltip">At least one of Verbs or Adjectives must stay enabled.</div>
          )}

          <label className="label label-tight">Word Types</label>
          <div className="checkbox-grid">
            {VERB_TYPE_KEYS.map(key => (
              <label key={key} className="checkbox-label">
                <input type="checkbox" disabled={!verbsEnabled} checked={settings.wordTypes[key]} onChange={() => updateWordType(key)} />
                {getWordGroupLabel(key)}
              </label>
            ))}
          </div>

          <label className="label label-tight-lg">Forms</label>
          <div className="checkbox-grid">
            {VERB_FORM_KEYS.map(key => (
              <label key={key} className="checkbox-label">
                <input type="checkbox" disabled={!verbsEnabled} checked={settings.forms.verb[key]} onChange={() => updateForm('verb', key)} />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
          {formWarning === 'verb' && (
            <div className="form-warning-tooltip">Need at least one of Plain or Polite to generate verb questions.</div>
          )}
        </div>

        <div className={`settings-section ${!adjEnabled ? 'section-muted' : ''}`}>
          <div className="category-header">
            <label className="checkbox-label category-toggle">
              <input type="checkbox" checked={adjEnabled} onChange={() => toggleCategory('adj')} />
              <span className="category-title">Adjectives</span>
            </label>
          </div>
          {categoryWarning === 'adj' && (
            <div className="form-warning-tooltip">At least one of Verbs or Adjectives must stay enabled.</div>
          )}

          <label className="label label-tight">Word Types</label>
          <div className="checkbox-grid">
            {ADJ_TYPE_KEYS.map(key => (
              <label key={key} className="checkbox-label">
                <input type="checkbox" disabled={!adjEnabled} checked={settings.wordTypes[key]} onChange={() => updateWordType(key)} />
                {getWordGroupLabel(key)}
              </label>
            ))}
          </div>

          <label className="label label-tight-lg">Forms</label>
          <div className="checkbox-grid">
            {ADJ_FORM_KEYS.map(key => (
              <label key={key} className="checkbox-label">
                <input type="checkbox" disabled={!adjEnabled} checked={settings.forms.adj[key]} onChange={() => updateForm('adj', key)} />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
          {formWarning === 'adj' && (
            <div className="form-warning-tooltip">Need at least one of Plain or Polite to generate adjective questions.</div>
          )}
        </div>
      </div>
    </div>
  );
}