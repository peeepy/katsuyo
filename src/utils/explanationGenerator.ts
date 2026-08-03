import { applyRule } from '../engine';
import { rules } from './rules';
import { getFormFeatures } from './formFeatures';
import { type WordGroup, getWordGroupLabel } from './wordGroups';

type StemType = 'dict' | 'masu_stem' | 'nai_stem' | 'te_form' | 'e_stem' | 'i_stem' | 'dict_minus_ru';

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

  // --- PLAIN GODAN/ICHIDAN FORMS THAT WERE MISSING ---
  // NOTE: for godan these are never actually reached (see GODAN_ONBIN_LABELS branch below,
  // which computes the real per-ending sound change). These entries exist so ichidan
  // (う/る-drop, fixed suffix, no onbin) still gets a real breakdown.
  'past': { stem: 'dict_minus_ru', chunk: 'た', name: 'Past (〜た)', stemName: 'stem (drop る)' },
  'te-form': { stem: 'dict_minus_ru', chunk: 'て', name: 'Te-form (〜て)', stemName: 'stem (drop る)' },
  'imperative': { stem: 'dict_minus_ru', chunk: 'ろ', name: 'Imperative (〜ろ)', stemName: 'stem (drop る)' },
  'volitional': { stem: 'dict_minus_ru', chunk: 'よう', name: 'Volitional (〜よう)', stemName: 'stem (drop る)' },

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
  'causative passive negative past': { stem: 'nai_stem', chunk: { godan: 'せられなかった', default: 'させられなかった' }, name: 'Past Negative Causative Passive', stemName: 'a-stem (未然形)' },
  'causative passive past negative': { stem: 'nai_stem', chunk: { godan: 'せられなかった', default: 'させられなかった' }, name: 'Past Negative Causative Passive', stemName: 'a-stem (未然形)' },

  // --- POTENTIAL ---
  'potential': { stem: 'e_stem', chunk: { godan: 'る', default: 'られる' }, name: 'Potential', stemName: 'e-stem (godan) / masu-stem (ichidan)' },
  'potential negative': { stem: 'e_stem', chunk: { godan: 'ない', default: 'られない' }, name: 'Negative Potential', stemName: 'e-stem (godan) / masu-stem (ichidan)' },
  'polite potential': { stem: 'e_stem', chunk: { godan: 'ます', default: 'られます' }, name: 'Polite Potential', stemName: 'e-stem (godan) / masu-stem (ichidan)' },
  'polite potential negative': { stem: 'e_stem', chunk: { godan: 'ません', default: 'られません' }, name: 'Polite Negative Potential', stemName: 'e-stem (godan) / masu-stem (ichidan)' },

  // --- IMPERATIVE ---
  'imperative negative': { stem: 'dict', chunk: 'な', name: 'Negative Imperative (〜な)', stemName: 'dictionary form' },

  // --- NA-ADJECTIVES ---
  'na-adjective negative': { stem: 'dict', chunk: 'じゃない', name: 'Negative (〜じゃない)', stemName: 'dictionary form (だ dropped)' },
  'na-adjective polite': { stem: 'dict', chunk: 'です', name: 'Polite (〜です)', stemName: 'dictionary form' },
  'na-adjective polite negative': { stem: 'dict', chunk: 'ではありません', name: 'Polite Negative (〜ではありません)', stemName: 'dictionary form' },
  'na-adjective past': { stem: 'dict', chunk: 'だった', name: 'Past (〜だった)', stemName: 'dictionary form (だ dropped)' },
  'na-adjective past negative': { stem: 'dict', chunk: 'じゃなかった', name: 'Past Negative (〜じゃなかった)', stemName: 'dictionary form (だ dropped)' },
  'na-adjective polite past': { stem: 'dict', chunk: 'でした', name: 'Polite Past (〜でした)', stemName: 'dictionary form' },
  'na-adjective polite past negative': { stem: 'dict', chunk: 'ではありませんでした', name: 'Polite Past Negative (〜ではありませんでした)', stemName: 'dictionary form' },
  'na-adjective te-form': { stem: 'dict', chunk: 'で', name: 'Te-form (〜で)', stemName: 'dictionary form (だ dropped)' },
  'na-adjective te-form negative': { stem: 'dict', chunk: 'じゃなくて', name: 'Negative Te-form (〜じゃなくて)', stemName: 'dictionary form (だ dropped)' },

  // --- I-ADJECTIVES ---
  'i-adjective negative': { stem: 'i_stem', chunk: 'くない', name: 'Negative (〜くない)', stemName: 'stem (drop い)' },
  'i-adjective past': { stem: 'i_stem', chunk: 'かった', name: 'Past (〜かった)', stemName: 'stem (drop い)' },
  'i-adjective past negative': { stem: 'i_stem', chunk: 'くなかった', name: 'Past Negative (〜くなかった)', stemName: 'stem (drop い)' },
  'i-adjective polite': { stem: 'dict', chunk: 'です', name: 'Polite (〜です)', stemName: 'dictionary form' },
  'i-adjective polite negative': { stem: 'i_stem', chunk: 'くないです', name: 'Polite Negative (〜くないです)', stemName: 'stem (drop い)' },
  'i-adjective polite past': { stem: 'i_stem', chunk: 'かったです', name: 'Polite Past (〜かったです)', stemName: 'stem (drop い)' },
  'i-adjective polite past negative': { stem: 'i_stem', chunk: 'くなかったです', name: 'Polite Past Negative (〜くなかったです)', stemName: 'stem (drop い)' },
  'i-adjective te-form': { stem: 'i_stem', chunk: 'くて', name: 'Te-form (〜くて)', stemName: 'stem (drop い)' },
  'i-adjective te-form negative': { stem: 'i_stem', chunk: 'くなくて', name: 'Negative Te-form (〜くなくて)', stemName: 'stem (drop い)' },
};

// Groups whose forms are lookup tables of {before, after} pairs keyed to a *fixed* root
// (行く/来る/する/いい・よい/ある), rather than a general godan/ichidan pattern. There's no
// generalizable "stem" for these — the correct move is to look up the exact rule and show
// dict form -> result directly.
const IRREGULAR_GROUPS: WordGroup[] = ['iku', 'kuru', 'suru', 'ii', 'aru'];

// Godan forms where the ending change is euphonic (音便) or a fixed row-shift that varies
// per verb-ending consonant (う/く/ぐ/す/ぬ/ぶ/む/つ/る). These can't use a single static
// "chunk" string like the RECIPES table (unlike negative/polite/etc, which absorb the
// per-ending variation into an intermediate stem computed via applyRule). Instead, look
// up the specific before/after pair that matches this word's ending and show it directly.
const GODAN_DIRECT_LABELS = ['te-form', 'past', 'imperative', 'volitional'];

function findRule(group: string, dictForm: string, formLabel: string): { before: string; after: string } | null {
  const groupRules = (rules as any)[group]?.[formLabel];
  if (!groupRules) return null;
  for (const rule of groupRules.forms) {
    if (rule.before && dictForm.endsWith(rule.before)) return rule;
  }
  return null;
}

export function generateExplanation(dictForm: string, group: WordGroup, targetLabel: string): string[] {
  if (targetLabel === 'plain' || targetLabel === 'dictionary') return [];

  // Irregular groups: look up the exact rule for this root and show it directly.
  if (IRREGULAR_GROUPS.includes(group)) {
    const rule = findRule(group, dictForm, targetLabel);
    if (!rule) {
      return [`Apply the standard ${targetLabel} conjugation rules to ${dictForm}.`];
    }
    const stem = dictForm.slice(0, dictForm.length - rule.before.length);
    return [
      `${dictForm} is irregular (${getWordGroupLabel(group)}) — it doesn't follow the standard stem pattern.`,
      `${dictForm} → ${stem}${rule.after}`
    ];
  }

  // Godan te-form/past/imperative/volitional: per-ending sound change, looked up directly.
  if (group === 'godan' && GODAN_DIRECT_LABELS.includes(targetLabel)) {
    const rule = findRule('godan', dictForm, targetLabel);
    if (rule) {
      const stem = dictForm.slice(0, dictForm.length - rule.before.length);
      const desc: Record<string, string> = {
        'te-form': 'euphonic sound change (音便)',
        'past': 'euphonic sound change (音便) — same pattern as て-form',
        'imperative': 'う-row → え-row ending shift',
        'volitional': 'う-row → お-row + う',
      };
      return [
        `Start with the root: ${dictForm}`,
        `Godan ending 〜${rule.before} becomes 〜${rule.after} (${desc[targetLabel]})`,
        `Result: ${stem}${rule.after}`
      ];
    }
  }

  const recipeKey = (group === 'na-adjective' || group === 'i-adjective')
    ? `${group} ${targetLabel}`
    : targetLabel;

  const recipe = RECIPES[recipeKey];
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
      stem = applyRule(dictForm, group, 'imperative', 'kanji')[0];
    } else {
      const politeForm = applyRule(dictForm, group, 'polite', 'kanji')[0];
      stem = politeForm.replace(/ます$/, '');
    }
  } else if (recipe.stem === 'i_stem') {
    stem = dictForm.replace(/い$/, '');
  } else if (recipe.stem === 'dict_minus_ru') {
    stem = dictForm.replace(/る$/, '');
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

export function generateInstruction(source: string, target: string, mode: string): string {
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