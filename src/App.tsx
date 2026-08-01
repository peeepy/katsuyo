import { useReducer, useEffect, useRef, useState } from 'react';
import * as wanakana from 'wanakana';
import './App.css';
import { type Question, type ConjugationResult, type DrillSettings } from './types';
import { WORDS } from './data';
import { generateQuestion, isValidWordForConvertSettings, isValidWordForSettings } from './engine';
import { quizReducer, checkIsCorrect, type QuizState } from './quizState';

const DEFAULT_SETTINGS: DrillSettings = {
  numQuestions: 20,
  focus: '',
  mode: 'combined',
  furigana: 'always',
  translation: 'always',
  forms: { plain: true, polite: true, negative: true, past: true, te: true, progressive: true, desire: true, volitional: true, potential: true, imperative: true, passive: true, causative: true },
  wordTypes: { godan: true, ichidan: true, iadj: true, naadj: true, irrVerb: true, irrAdj: true }
};

const getEligibleWords = (currentSettings: DrillSettings) => {
  return WORDS.filter(word => {
    if (!isValidWordForSettings(word, currentSettings)) {
      return false;
    }
    if (currentSettings.mode === 'convert' || currentSettings.mode === 'combined') {
      return isValidWordForConvertSettings(word, currentSettings);
    }
    return true;
  });
};

const createQuestionsList = (count: number, currentSettings: DrillSettings) => {
  const pool = getEligibleWords(currentSettings);
  if (pool.length === 0 || count <= 0) return [];
  
  const shuffledWords = [...pool].sort(() => Math.random() - 0.5);
  const generated: Question[] = [];
  
  const focusCount = currentSettings.focus ? Math.floor(count * 0.75) : 0;
  
  const intentArray = Array(count).fill(null).map((_, i) => {
    return i < focusCount ? currentSettings.focus : 'RANDOM';
  });
  
  const shuffledIntents = intentArray.sort(() => Math.random() - 0.5);

  for (let i = 0; i < count; i++) {
    const w = shuffledWords[i % shuffledWords.length];
    
    let qMode = currentSettings.mode;
    if (qMode === 'combined') {
      qMode = Math.random() > 0.5 ? 'plain' : 'convert';
    }
    
    generated.push(generateQuestion(w, { ...currentSettings, mode: qMode as 'plain' | 'convert' }, shuffledIntents[i]));
  }
  return generated;
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

export default function App() {
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
    // If infinite (0), generate an initial batch of 20 to maintain the statistical spread
    const initialCount = state.settings.numQuestions === 0 ? 20 : state.settings.numQuestions;
    dispatch({ type: 'START', payload: createQuestionsList(initialCount, state.settings) });
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
      // Check !showSettingsModal so you don't accidentally nuke the summary page 
      // if you have the settings modal open over it and press enter
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
        // Switching to infinite mid-drill
        remainingQuestions = createQuestionsList(20, newSettings);
      } else {
        // Switching to fixed mid-drill (prevents crashing if they lower the number below their current index)
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

  return (
    <div className="container" style={{ position: 'relative' }}>
      
      {state.status !== 'idle' && (
        <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {state.settings.numQuestions === 0 && (state.status === 'answering' || state.status === 'graded') && (
            <button onClick={() => dispatch({ type: 'END_SESSION' })} className="btn-ghost" style={{ fontSize: '0.85rem', padding: '4px 8px', color: 'var(--hanko)' }}>
              Stop Drill
            </button>
          )}
          <button onClick={() => setShowSettingsModal(true)} className="btn-ghost" style={{ fontSize: '1.2rem', padding: '4px 8px' }}>
            ⚙️
          </button>
        </div>
      )}

      <header className="hero">
        <div className="eyebrow">Katsuyō · 活用</div>
        <h1 className="title">活用</h1>
        <p className="sub">Japanese conjugation drills</p>
      </header>

      {state.status === 'idle' && (
        <div className="card">
          <SettingsPanel settings={state.settings} onChange={(s) => dispatch({ type: 'UPDATE_SETTINGS', payload: { settings: s } })} />
          <button onClick={startQuiz} className="btn-primary" style={{ marginTop: 24, fontSize: '1.2rem', padding: '16px' }}>
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

          <div className="card card-center">
            <div className="stimulus">
              {renderRuby(currentQ.source)}
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
                  onClick={() => {
                    // Silently append the next batch of 20 when they are 3 questions away from the end
                    if (state.settings.numQuestions === 0 && state.currentIndex >= state.questions.length - 3) {
                      dispatch({ type: 'APPEND_QUESTIONS', payload: createQuestionsList(20, state.settings) });
                    }
                    dispatch({ type: 'NEXT_QUESTION' });
                  }} 
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
                <div style={{ flex: 1 }}>
                  {isCorrect ? (
                    <div style={{ fontWeight: 'bold', color: 'var(--good)' }}>Correct!</div>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
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
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' }}>Rule breakdown:</div>
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
            <div style={{ textAlign: 'left', marginTop: 20 }}>
              <h3>Missed Conjugations:</h3>
              <ul style={{ paddingLeft: 20 }}>
                {state.missed.map((m, idx) => (
                  <li key={idx} style={{ marginBottom: 8 }}>
                    {renderRuby(m.source)} ({m.label}) → <strong>{renderRuby(m.target)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={() => dispatch({ type: 'GO_HOME' })} className="btn-primary" style={{ marginTop: 20 }}>
            Main Menu
          </button>
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
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 style={{ margin: '0 0 16px 0' }}>Settings</h3>
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <SettingsPanel settings={localSettings} onChange={setLocalSettings} />
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: 16 }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button onClick={() => onSave(localSettings)} className="btn-primary" style={{ flex: 1, marginTop: 0 }}>Close & Apply</button>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onChange }: { settings: DrillSettings, onChange: (s: DrillSettings) => void }) {
  const updateForm = (key: keyof DrillSettings['forms']) => {
    if (key === 'plain' && settings.forms.plain && !settings.forms.polite) return;
    if (key === 'polite' && settings.forms.polite && !settings.forms.plain) return;
    onChange({ ...settings, forms: { ...settings.forms, [key]: !settings.forms[key] } });
  };

  const updateWordType = (key: keyof DrillSettings['wordTypes']) => 
    onChange({ ...settings, wordTypes: { ...settings.wordTypes, [key]: !settings.wordTypes[key] } });

  return (
    <div>
      <div className="field-group-row">
        <label className="label" style={{ marginBottom: 0 }}>Questions (0 = ∞)</label>
        <input type="number" min={0} max={999} value={settings.numQuestions} onChange={e => onChange({...settings, numQuestions: Number(e.target.value)})} className="input-number" style={{ width: 80 }} />
      </div>

      <div className="field-group">
        <label className="label">Question Focus</label>
        <select value={settings.focus} onChange={e => onChange({...settings, focus: e.target.value})} className="select">
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
          <button type="button" className={settings.mode === 'plain' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({...settings, mode: 'plain'})}>Plain</button>
          <button type="button" className={settings.mode === 'convert' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({...settings, mode: 'convert'})}>Convert</button>
          <button type="button" className={settings.mode === 'combined' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({...settings, mode: 'combined'})}>Combined</button>
        </div>
      </div>

      <div className="field-group">
        <label className="label">Furigana Mode</label>
        <div className="segmented">
          <button type="button" className={settings.furigana === 'always' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({...settings, furigana: 'always'})}>Always</button>
          <button type="button" className={settings.furigana === 'hover' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({...settings, furigana: 'hover'})}>Hover</button>
          <button type="button" className={settings.furigana === 'off' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({...settings, furigana: 'off'})}>Off</button>
        </div>
      </div>

      <div className="field-group">
        <label className="label">Translation</label>
        <div className="segmented">
          <button type="button" className={settings.translation === 'always' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({...settings, translation: 'always'})}>Always</button>
          <button type="button" className={settings.translation === 'hover' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({...settings, translation: 'hover'})}>Hover</button>
          <button type="button" className={settings.translation === 'off' ? 'seg-btn seg-active' : 'seg-btn'} onClick={() => onChange({...settings, translation: 'off'})}>Off</button>
        </div>
      </div>

      <hr style={{ border: 0, borderTop: '1px solid var(--line-soft)', margin: '20px 0' }} />

      <label className="label">Forms & Tenses</label>
      <div className="checkbox-grid">
        {Object.keys(settings.forms).map(key => (
          <label key={key} className="checkbox-label">
            <input type="checkbox" checked={settings.forms[key as keyof DrillSettings['forms']]} onChange={() => updateForm(key as any)} />
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </label>
        ))}
      </div>

      <hr style={{ border: 0, borderTop: '1px solid var(--line-soft)', margin: '20px 0' }} />

      <label className="label">Word Types</label>
      <div className="checkbox-grid">
        <label className="checkbox-label"><input type="checkbox" checked={settings.wordTypes.godan} onChange={() => updateWordType('godan')} /> Godan Verbs</label>
        <label className="checkbox-label"><input type="checkbox" checked={settings.wordTypes.ichidan} onChange={() => updateWordType('ichidan')} /> Ichidan Verbs</label>
        <label className="checkbox-label"><input type="checkbox" checked={settings.wordTypes.iadj} onChange={() => updateWordType('iadj')} /> I-Adjectives</label>
        <label className="checkbox-label"><input type="checkbox" checked={settings.wordTypes.naadj} onChange={() => updateWordType('naadj')} /> Na-Adjectives</label>
        <label className="checkbox-label"><input type="checkbox" checked={settings.wordTypes.irrVerb} onChange={() => updateWordType('irrVerb')} /> Irregular Verbs</label>
        <label className="checkbox-label"><input type="checkbox" checked={settings.wordTypes.irrAdj} onChange={() => updateWordType('irrAdj')} /> Irregular Adj</label>
      </div>
    </div>
  );
}