import { applyRule } from '../engine';

type StemType = 'dict' | 'masu_stem' | 'nai_stem' | 'te_form' | 'e_stem';

interface ChunkRecipe {
  stem: StemType;
  chunk: string | Record<string, string>;
  name: string;
  stemName: string;
}

const RECIPES: Record<string, ChunkRecipe> = {
  // --- PROGRESSIVE ---
  'progressive': { stem: 'te_form', chunk: 'いる', name: 'Progressive (〜ている)', stemName: 'て-form' },
  'progressive negative': { stem: 'te_form', chunk: 'いない', name: 'Negative Progressive (〜ていない)', stemName: 'て-form' },
  'polite progressive': { stem: 'te_form', chunk: 'います', name: 'Polite Progressive (〜ています)', stemName: 'て-form' },
  'polite progressive negative': { stem: 'te_form', chunk: 'いません', name: 'Polite Negative Progressive (〜ていません)', stemName: 'て-form' },
  'progressive past': { stem: 'te_form', chunk: 'いた', name: 'Past Progressive (〜ていた)', stemName: 'て-form' },
  'progressive past negative': { stem: 'te_form', chunk: 'いなかった', name: 'Past Negative Progressive (〜ていなかった)', stemName: 'て-form' },
  'polite progressive past': { stem: 'te_form', chunk: 'いました', name: 'Polite Past Progressive (〜ていました)', stemName: 'て-form' },
  'polite progressive past negative': { stem: 'te_form', chunk: 'いませんでした', name: 'Polite Past Negative Progressive (〜ていませんでした)', stemName: 'て-form' },

  // --- DESIRE ---
  'desire': { stem: 'masu_stem', chunk: 'たい', name: 'Desire (〜たい)', stemName: 'masu-stem (連用形)' },
  'desire negative': { stem: 'masu_stem', chunk: 'たくない', name: 'Negative Desire (〜たくない)', stemName: 'masu-stem (連用形)' },
  'desire polite': { stem: 'masu_stem', chunk: 'たいです', name: 'Polite Desire (〜たいです)', stemName: 'masu-stem (連用形)' },
  'desire polite negative': { stem: 'masu_stem', chunk: 'たくないです', name: 'Polite Negative Desire (〜たくないです)', stemName: 'masu-stem (連用形)' },
  'desire past': { stem: 'masu_stem', chunk: 'たかった', name: 'Past Desire (〜たかった)', stemName: 'masu-stem (連用形)' },
  'desire past negative': { stem: 'masu_stem', chunk: 'たくなかった', name: 'Past Negative Desire (〜たくなかった)', stemName: 'masu-stem (連用形)' },
  'desire polite past': { stem: 'masu_stem', chunk: 'たかったです', name: 'Polite Past Desire (〜たかったです)', stemName: 'masu-stem (連用形)' },
  'desire polite past negative': { stem: 'masu_stem', chunk: 'たくなかったです', name: 'Polite Past Negative Desire (〜たくなかったです)', stemName: 'masu-stem (連用形)' },
  'desire te-form': { stem: 'masu_stem', chunk: 'たくて', name: 'Desire Te-form (〜たくて)', stemName: 'masu-stem (連用形)' },
  'desire te-form negative': { stem: 'masu_stem', chunk: 'たくなくて', name: 'Negative Desire Te-form (〜たくなくて)', stemName: 'masu-stem (連用形)' },
  
  // --- POLITE BASES ---
  'polite': { stem: 'masu_stem', chunk: 'ます', name: 'Polite (〜ます)', stemName: 'masu-stem (連用形)' },
  'polite negative': { stem: 'masu_stem', chunk: 'ません', name: 'Polite Negative (〜ません)', stemName: 'masu-stem (連用形)' },
  'polite past': { stem: 'masu_stem', chunk: 'ました', name: 'Polite Past (〜ました)', stemName: 'masu-stem (連用形)' },
  'polite past negative': { stem: 'masu_stem', chunk: 'ませんでした', name: 'Polite Past Negative (〜ませんでした)', stemName: 'masu-stem (連用形)' },
  'polite volitional': { stem: 'masu_stem', chunk: 'ましょう', name: 'Polite Volitional (〜ましょう)', stemName: 'masu-stem (連用形)' },
  
  // --- NEGATIVE BASES ---
  'negative': { stem: 'nai_stem', chunk: 'ない', name: 'Negative (〜ない)', stemName: 'a-stem (未然形)' },
  'past negative': { stem: 'nai_stem', chunk: 'なかった', name: 'Past Negative (〜なかった)', stemName: 'a-stem (未然形)' },
  'te-form negative': { stem: 'nai_stem', chunk: 'なくて', name: 'Negative Te-form (〜なくて)', stemName: 'a-stem (未然形)' },
  // Apply the standard polite past negative conjugation rules to 優雅.
  /// standard polite negative conjugation rules
  
  // --- PASSIVE ---
  'passive': { stem: 'nai_stem', chunk: { godan: 'れる', default: 'られる' }, name: 'Passive', stemName: 'a-stem (未然形)' },
  'passive negative': { stem: 'nai_stem', chunk: { godan: 'れない', default: 'られない' }, name: 'Negative Passive', stemName: 'a-stem (未然形)' },
  'passive past': { stem: 'nai_stem', chunk: { godan: 'れた', default: 'られた' }, name: 'Past Passive', stemName: 'a-stem (未然形)' },
  'passive past negative': { stem: 'nai_stem', chunk: { godan: 'れなかった', default: 'られなかった' }, name: 'Past Negative Passive', stemName: 'a-stem (未然形)' },
  'passive te-form': { stem: 'nai_stem', chunk: { godan: 'れて', default: 'られて' }, name: 'Te-form Passive', stemName: 'a-stem (未然形)' },
  'polite passive': { stem: 'nai_stem', chunk: { godan: 'れます', default: 'られます' }, name: 'Polite Passive', stemName: 'a-stem (未然形)' },
  'polite passive negative': { stem: 'nai_stem', chunk: { godan: 'れません', default: 'られません' }, name: 'Polite Negative Passive', stemName: 'a-stem (未然形)' },
  'polite passive past': { stem: 'nai_stem', chunk: { godan: 'れました', default: 'られました' }, name: 'Polite Past Passive', stemName: 'a-stem (未然形)' },
  'polite passive past negative': { stem: 'nai_stem', chunk: { godan: 'れませんでした', default: 'られませんでした' }, name: 'Polite Past Negative Passive', stemName: 'a-stem (未然形)' },
  
  // --- CAUSATIVE ---
  'causative': { stem: 'nai_stem', chunk: { godan: 'せる', default: 'させる' }, name: 'Causative', stemName: 'a-stem (未然形)' },
  'causative negative': { stem: 'nai_stem', chunk: { godan: 'せない', default: 'させない' }, name: 'Negative Causative', stemName: 'a-stem (未然形)' },
  'causative past': { stem: 'nai_stem', chunk: { godan: 'せた', default: 'させた' }, name: 'Past Causative', stemName: 'a-stem (未然形)' },
  'causative past negative': { stem: 'nai_stem', chunk: { godan: 'せなかった', default: 'させなかった' }, name: 'Past Negative Causative', stemName: 'a-stem (未然形)' },
  
  // --- CAUSATIVE PASSIVE ---
  'causative passive': { stem: 'nai_stem', chunk: { godan: 'せられる', default: 'させられる' }, name: 'Causative Passive', stemName: 'a-stem (未然形)' },
  'causative passive negative': { stem: 'nai_stem', chunk: { godan: 'せられない', default: 'させられない' }, name: 'Negative Causative Passive', stemName: 'a-stem (未然形)' },
  'causative passive past': { stem: 'nai_stem', chunk: { godan: 'せられた', default: 'させられた' }, name: 'Past Causative Passive', stemName: 'a-stem (未然形)' },
  'causative passive negative past': { stem: 'nai_stem', chunk: { godan: 'せられなかった', default: 'させられなかった' }, name: 'Past Negative Causative Passive', stemName: 'a-stem (未然形)' }, // Godan key
  'causative passive past negative': { stem: 'nai_stem', chunk: { godan: 'せられなかった', default: 'させられなかった' }, name: 'Past Negative Causative Passive', stemName: 'a-stem (未然形)' }, // Ichidan key
  
  // --- POTENTIAL ---
  'potential': { stem: 'e_stem', chunk: { godan: 'る', default: 'られる' }, name: 'Potential', stemName: 'e-stem (godan) / masu-stem (ichidan)' },
  'potential negative': { stem: 'e_stem', chunk: { godan: 'ない', default: 'られない' }, name: 'Negative Potential', stemName: 'e-stem (godan) / masu-stem (ichidan)' },
  'polite potential': { stem: 'e_stem', chunk: { godan: 'ます', default: 'られます' }, name: 'Polite Potential', stemName: 'e-stem (godan) / masu-stem (ichidan)' },
  'polite potential negative': { stem: 'e_stem', chunk: { godan: 'ません', default: 'られません' }, name: 'Polite Negative Potential', stemName: 'e-stem (godan) / masu-stem (ichidan)' },
  
  // --- IMPERATIVE ---
  'imperative negative': { stem: 'dict', chunk: 'な', name: 'Negative Imperative (〜な)', stemName: 'dictionary form' },
};

export function generateExplanation(dictForm: string, group: string, targetLabel: string): string[] {
  if (targetLabel === 'plain' || targetLabel === 'dictionary') return [];

  // Protect irregular verbs and adjectives from broken string math since they don't follow uniform chunks
  if (['iku', 'kuru', 'suru', 'ii', 'i-adjective', 'na-adjective'].includes(group)) {
    return [`Apply the standard ${targetLabel} conjugation rules to ${dictForm}.`];
  }

  const recipe = RECIPES[targetLabel];
  if (!recipe) {
    return [`Apply the standard ${targetLabel} conjugation rules to ${dictForm}.`];
  }

  let stem = dictForm;
  
  if (recipe.stem === 'masu_stem') {
    const politeForm = applyRule(dictForm, group, 'polite', 'kanji')[0];
    stem = politeForm.replace(/ます$/, '');
  } else if (recipe.stem === 'nai_stem') {
    const negativeForm = applyRule(dictForm, group, 'negative', 'kanji')[0];
    stem = negativeForm.replace(/ない$/, '');
  } else if (recipe.stem === 'te_form') {
    stem = applyRule(dictForm, group, 'te-form', 'kanji')[0];
  } else if (recipe.stem === 'e_stem') {
    if (group === 'godan') {
      // For godan, the e-stem is identical to the imperative form
      stem = applyRule(dictForm, group, 'imperative', 'kanji')[0];
    } else {
      // For ichidan, potential attaches to the masu-stem
      const politeForm = applyRule(dictForm, group, 'polite', 'kanji')[0];
      stem = politeForm.replace(/ます$/, '');
    }
  }

  let chunkText = '';
  if (typeof recipe.chunk === 'string') {
    chunkText = recipe.chunk;
  } else {
    chunkText = recipe.chunk[group] || recipe.chunk['default'] || '';
  }

  return [
    `Start with the root: ${dictForm}`,
    `Convert to ${recipe.stemName}: ${stem}`,
    `Attach the ${recipe.name} chunk: ${stem} + ${chunkText} -> ${stem}${chunkText}`
  ];
}