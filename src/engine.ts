import { type Question, type ConjugationResult, type DrillSettings, type Word } from './types';
import { rules } from './utils/rules'; 
import { generateExplanation } from './utils/explanationGenerator';

// Calculates all valid compound rule keys (e.g. "polite past negative") based on the individual settings toggles
function getValidRuleKeys(settings: DrillSettings, group: string): string[] {
  const groupRules = (rules as any)[group] || {};
  const validKeys: string[] = [];
  
  if (settings.forms.plain) validKeys.push('plain');

  for (const ruleKey in groupRules) {
    const aspects = ruleKey.split(' ');
    let isValid = true;
    
    // Politeness dictates the base, so we check it explicitly against the rule string
    const isPolite = aspects.includes('polite');
    if (isPolite && !settings.forms.polite) isValid = false;
    if (!isPolite && !settings.forms.plain) isValid = false;

    for (const aspect of aspects) {
      if (aspect === 'polite') continue;
      
      const settingKey = aspect === 'te-form' ? 'te' : aspect;
      if (!settings.forms[settingKey as keyof typeof settings.forms]) {
        isValid = false;
        break;
      }
    }
    if (isValid) validKeys.push(ruleKey);
  }
  return validKeys;
}

export function isValidWordForSettings(word: Word, settings: DrillSettings): boolean {
  if (!settings.wordTypes[word.pos as keyof typeof settings.wordTypes]) return false;
  const group = getRuleGroup(word);
  const activeForms = getValidRuleKeys(settings, group);
  
  if (settings.mode === 'plain') {
     return activeForms.some(f => f !== 'plain' && f !== 'dictionary');
  }
  return activeForms.length > 0;
}

export function isValidWordForConvertSettings(word: Word, settings: DrillSettings): boolean {
  const group = getRuleGroup(word);
  const activeForms = getValidRuleKeys(settings, group);
  return activeForms.length >= 2;
}

function getRuleGroup(word: Word): string {
  if (word.pos === 'godan') return 'godan';
  if (word.pos === 'ichidan') return 'ichidan';
  if (word.pos === 'iadj') return 'i-adjective';
  if (word.pos === 'naadj') return 'na-adjective';
  
  if (word.pos === 'irregular') {
    if (word.reading.endsWith('いく')) return 'iku';
    if (word.reading.endsWith('くる')) return 'kuru';
    if (word.reading.endsWith('する')) return 'suru';
    if (word.reading === 'いい' || word.reading === 'よい') return 'ii';
  }
  
  return 'godan';
}

export function applyRule(text: string, group: string, formLabel: string, returnType: 'kanji' | 'reading'): string[] {
  let baseText = text;

  // 1. Fix the base text for na-adjectives BEFORE doing anything else
  if (group === 'na-adjective' && !baseText.endsWith('だ')) {
    baseText += 'だ';
  }

  // 2. NOW you can safely early-return if the target is just plain/dictionary
  if (formLabel === 'plain' || formLabel === 'dictionary') {
    return [baseText];
  }

  const groupRules = (rules as any)[group];
  // 3. Make sure to return baseText here instead of text
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

function buildResult(word: Word, group: string, formLabel: string): ConjugationResult {
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

// TO DO: Add 'combined' mode that does plain mode and convert mode together.
// TODO: add separate checkbox for irregular verbs and irregular adjectives in the config
// TODO: Make the question focus config make the questions 75% of the time focus on the selected form, and 25% of the time focus on a random form.
// TODO: add english translations - show always, show on hover (below word), turn off - same as furigana
// TODO: put 'adjust settings' on the right top side.
function getFormFeatures(label: string): Set<string> {
  const features = new Set<string>();
  if (label === 'plain' || label === 'dictionary') return features;
  
  const words = label.split(' ');
  for (const word of words) {
    if (word === 'te-form') features.add('te');
    else features.add(word);
  }
  return features;
}

function getFormDistance(labelA: string, labelB: string): number {
  const setA = getFormFeatures(labelA);
  const setB = getFormFeatures(labelB);
  
  let distance = 0;
  for (const feature of setA) {
    if (!setB.has(feature)) distance++;
  }
  for (const feature of setB) {
    if (!setA.has(feature)) distance++;
  }
  return distance;
}

// Pass the mode in so we know how to format the text
function generateInstruction(source: string, target: string, mode: string): string {
  // Plain mode shouldn't use Add/Remove, it should just state the target compound form
  if (mode === 'plain') {
    return `→ ${target}`;
  }

  const setA = getFormFeatures(source);
  const setB = getFormFeatures(target);
  
  const added = [...setB].filter(x => !setA.has(x));
  const removed = [...setA].filter(x => !setB.has(x));
  
  if (added.length > 0 && removed.length === 0) return `Add ${added.join(' and ')}`;
  if (removed.length > 0 && added.length === 0) return `Remove ${removed.join(' and ')}`;
  
  return `Convert to ${target === 'plain' ? 'dictionary form' : target}`;
}

export function generateQuestion(word: Word, settings: DrillSettings, intent: string = 'RANDOM'): Question {
  const group = getRuleGroup(word);
  const activeForms = getValidRuleKeys(settings, group);

  if (activeForms.length === 0) {
    throw new Error(`No valid forms available for ${word.kanji}`);
  }

  let targetLabel = 'plain';
  let sourceLabel = 'plain'; 
  
  // Determine actual target based on intent from the orchestrator
  if (intent !== 'RANDOM' && activeForms.includes(intent.toLowerCase())) {
    targetLabel = intent.toLowerCase();
  } else {
    // Fallback to random logic if intent is RANDOM or the focused form isn't valid for this word
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
    // THE FIX: pass the mode into the instruction generator
    instruction: generateInstruction(sourceLabel, targetLabel, settings.mode),
    english: word.english
  };
}

export const IDENTITY_CHAIN = "plain";