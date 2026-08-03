import { type Question, type ConjugationResult, type DrillSettings, type Word } from './types';
import { rules } from './utils/rules';
import { generateExplanation, generateInstruction } from './utils/explanationGenerator';
import { getWordGroup, type WordGroup } from './utils/wordGroups';
import { getFormDistance } from './utils/formFeatures';
import { WORDS } from './data';

function isWordTypeActive(word: Word, settings: DrillSettings): boolean {
  return settings.wordTypes[getWordGroup(word)];
}

const ADJECTIVE_GROUPS: WordGroup[] = ['i-adjective', 'na-adjective', 'ii'];

// Calculates all valid compound rule keys (e.g. "polite past negative") based on the individual settings toggles
function getValidRuleKeys(settings: DrillSettings, group: WordGroup): string[] {
  const groupRules = (rules as any)[group] || {};
  const validKeys: string[] = [];

  const forms = ADJECTIVE_GROUPS.includes(group) ? settings.forms.adj : settings.forms.verb;

  if (forms.plain) validKeys.push('plain');

  for (const ruleKey in groupRules) {
    const aspects = ruleKey.split(' ');
    let isValid = true;

    // Politeness dictates the base, so we check it explicitly against the rule string
    const isPolite = aspects.includes('polite');
    if (isPolite && !forms.polite) isValid = false;
    if (!isPolite && !forms.plain) isValid = false;

    for (const aspect of aspects) {
      if (aspect === 'polite') continue;

      const settingKey = (aspect === 'te-form' ? 'te' : aspect) as keyof DrillSettings['forms']['verb'];
      if (!forms[settingKey]) {
        isValid = false;
        break;
      }
    }
    if (isValid) validKeys.push(ruleKey);
  }
  return validKeys;
}

export function isValidWordForSettings(word: Word, settings: DrillSettings): boolean {
  if (!isWordTypeActive(word, settings)) return false;

  const group = getWordGroup(word);
  const activeForms = getValidRuleKeys(settings, group);

  if (settings.mode === 'plain') {
    return activeForms.some(f => f !== 'plain' && f !== 'dictionary');
  }
  return activeForms.length > 0;
}

export function isValidWordForConvertSettings(word: Word, settings: DrillSettings): boolean {
  if (!isWordTypeActive(word, settings)) return false;
  const group = getWordGroup(word);
  const activeForms = getValidRuleKeys(settings, group);
  return activeForms.length >= 2;
}

export function applyRule(text: string, group: WordGroup, formLabel: string, returnType: 'kanji' | 'reading'): string[] {
  let baseText = text;

  // 1. Fix the base text for na-adjectives BEFORE doing anything else
  if (group === 'na-adjective' && !baseText.endsWith('だ')) {
    baseText += 'だ';
  }

  // 2. Early-return if target is just plain/dictionary
  if (formLabel === 'plain' || formLabel === 'dictionary') {
    return [baseText];
  }

  const groupRules = (rules as any)[group];
  if (!groupRules || !(formLabel in groupRules)) return [baseText];

  const specificRules = groupRules[formLabel].forms;
  const results: string[] = [];

  for (const rule of specificRules) {
    if (rule.result) {
      results.push(returnType === 'kanji'
        ? rule.result.replace(/\[.*?\]/g, '')
        : rule.result.replace(/([^\[]+)\[([^\]]+)\]/g, '$2'));
    } else if (rule.before && rule.after && baseText.endsWith(rule.before)) {
      results.push(baseText.slice(0, -rule.before.length) + rule.after);
    }
  }

  return results.length > 0 ? results : [baseText];
}

function buildResult(word: Word, group: WordGroup, formLabel: string): ConjugationResult {
  const kanjiResults = applyRule(word.kanji, group, formLabel, 'kanji');
  const readingResults = applyRule(word.reading, group, formLabel, 'reading');

  // Grab the first match to use for the UI presentation
  const kanji = kanjiResults[0];
  const reading = readingResults[0];

  let stemLen = 0;
  while (
    stemLen < kanji.length &&
    stemLen < reading.length &&
    kanji[kanji.length - 1 - stemLen] === reading[reading.length - 1 - stemLen]
  ) {
    stemLen++;
  }

  const furiRoot = kanji.slice(0, kanji.length - stemLen);
  const furiReading = reading.slice(0, reading.length - stemLen);

  return {
    kanji,
    reading,
    furiRoot,
    furiReading,
    explanation: generateExplanation(word.kanji, group, formLabel),
    validReadings: readingResults // Store all alternative correct answers for validation
  };
}

export function generateQuestion(word: Word, settings: DrillSettings, intent: string = 'RANDOM'): Question {
  const group = getWordGroup(word);
  const activeForms = getValidRuleKeys(settings, group);

  if (activeForms.length === 0) {
    throw new Error(`No valid forms available for ${word.kanji}`);
  }

  let targetLabel = 'plain';
  let sourceLabel = 'plain';

  if (intent !== 'RANDOM' && activeForms.includes(intent.toLowerCase())) {
    targetLabel = intent.toLowerCase();
  } else {
    targetLabel = activeForms[Math.floor(Math.random() * activeForms.length)];
  }

  if (settings.mode === 'plain') {
    const validTargets = activeForms.filter(f => f !== 'plain' && f !== 'dictionary');
    if (validTargets.length === 0) throw new Error("No target forms checked.");

    targetLabel = validTargets[Math.floor(Math.random() * validTargets.length)];
    sourceLabel = 'plain';
  } else {
    targetLabel = activeForms[Math.floor(Math.random() * activeForms.length)];
    const adjacentForms = activeForms.filter(f => f !== targetLabel && getFormDistance(f, targetLabel) === 1);

    if (adjacentForms.length > 0) {
      sourceLabel = adjacentForms[Math.floor(Math.random() * adjacentForms.length)];
    } else {
      const validSourceForms = activeForms.filter(f => f !== targetLabel);
      sourceLabel = validSourceForms.length > 0
        ? validSourceForms[Math.floor(Math.random() * validSourceForms.length)]
        : 'plain';
    }
  }

  const source = buildResult(word, group, sourceLabel);
  const target = buildResult(word, group, targetLabel);

  return {
    source,
    target,
    sourceChain: sourceLabel,
    targetLabel: targetLabel,
    instruction: generateInstruction(sourceLabel, targetLabel, settings.mode),
    english: word.english,
    group
  };
}

// --- Question-set selection (moved in from App.tsx: word pool + question list building
// is drill logic, not view logic) ---

export const getEligibleWords = (settings: DrillSettings): Word[] => {
  return WORDS.filter(word => {
    if (!isValidWordForSettings(word, settings)) {
      return false;
    }
    if (settings.mode === 'convert' || settings.mode === 'combined') {
      return isValidWordForConvertSettings(word, settings);
    }
    return true;
  });
};

export const createQuestionsList = (count: number, settings: DrillSettings): Question[] => {
  const pool = getEligibleWords(settings);
  if (pool.length === 0 || count <= 0) return [];

  const shuffledWords = [...pool].sort(() => Math.random() - 0.5);
  const generated: Question[] = [];

  const focusCount = settings.focus ? Math.floor(count * 0.75) : 0;

  const intentArray = Array(count).fill(null).map((_, i) => {
    return i < focusCount ? settings.focus : 'RANDOM';
  });

  const shuffledIntents = intentArray.sort(() => Math.random() - 0.5);

  for (let i = 0; i < count; i++) {
    const w = shuffledWords[i % shuffledWords.length];

    let qMode = settings.mode;
    if (qMode === 'combined') {
      qMode = Math.random() > 0.5 ? 'plain' : 'convert';
    }

    generated.push(generateQuestion(w, { ...settings, mode: qMode as 'plain' | 'convert' }, shuffledIntents[i]));
  }
  return generated;
};