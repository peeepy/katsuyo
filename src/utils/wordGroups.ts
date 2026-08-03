import { type Word } from '../types';

export const GROUP_META = [
  { key: 'godan',        label: 'Godan Verb',                    category: 'verb' },
  { key: 'ichidan',      label: 'Ichidan Verb',                  category: 'verb' },
  { key: 'iku',          label: '行く verb',          category: 'verb' },
  { key: 'kuru',         label: '来る verb',          category: 'verb' },
  { key: 'suru',         label: 'する verbs',          category: 'verb' },
  { key: 'aru',          label: 'ある verb',          category: 'verb' },
  { key: 'i-adjective',  label: 'い-Adjective',                  category: 'adj'  },
  { key: 'na-adjective', label: 'な-Adjective',                  category: 'adj'  },
  { key: 'ii',           label: 'いい adjective', category: 'adj'  },
] as const;

export type WordGroup = typeof GROUP_META[number]['key'];

const LABEL_MAP = Object.fromEntries(GROUP_META.map(g => [g.key, g.label])) as Record<WordGroup, string>;
export function getWordGroupLabel(group: WordGroup): string { return LABEL_MAP[group]; }

function classifyIrregular(word: Word): WordGroup | null {
  if (word.reading.endsWith('ある') || word.kanji.endsWith('有る') || word.kanji.endsWith('在る')) return 'aru';
  if (word.reading.endsWith('いく') || word.kanji.endsWith('行く')) return 'iku';
  if (word.reading.endsWith('くる') || word.kanji.endsWith('来る')) return 'kuru';
  if (word.reading.endsWith('する') || word.kanji.endsWith('する')) return 'suru';
  if (word.reading.endsWith('いい') || word.reading.endsWith('よい') || word.kanji.endsWith('良い')) return 'ii';
  return null;
}

export function getWordGroup(word: Word): WordGroup {
  const pos = word.pos.toLowerCase();
  if (pos === 'godan') return 'godan';
  if (pos === 'ichidan') return 'ichidan';
  if (pos === 'iadj' || pos === 'i-adjective' || pos === 'i_adjective') return 'i-adjective';
  if (pos === 'naadj' || pos === 'na-adjective' || pos === 'na_adjective') return 'na-adjective';
  if (pos.includes('irregular') || pos === 'irreg') {
    const irregularGroup = classifyIrregular(word);
    if (irregularGroup) return irregularGroup;
  }
  return classifyIrregular(word) ?? 'godan';
}