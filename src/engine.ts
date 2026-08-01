import { getGodanParts } from './utils/mappings';
import type { Question, DrillSettings, Word, Paradigm, WordState, TargetStructure } from './types';

export const IDENTITY_CHAIN = 'IDENTITY';

const replaceSuffix = (text: string, suffix: string, replacement: string): string =>
  text.endsWith(suffix) ? text.slice(0, -suffix.length) + replacement : text;

const isSuruVerb = (state: WordState): boolean =>
  state.reading.endsWith('する') || state.kanji.endsWith('する');

const isKuruVerb = (state: WordState): boolean =>
  state.reading.endsWith('くる') || state.kanji.endsWith('来る');

const createDictionaryState = (word: Word): WordState => ({
  kanji: word.kanji,
  reading: word.reading,
  paradigm: word.pos as Paradigm,
  chain: [],
  label: 'Dictionary'
});

const appendLabel = (priorLabel: string, part: string): string =>
  priorLabel !== 'Dictionary' ? `${priorLabel} ${part}` : part;

const appendChain = (state: WordState, note: string): WordState => ({
  ...state,
  chain: [...state.chain, note]
});

const safeApply = (word: Word, config: TargetStructure): WordState | null => {
  try {
    return applyConjugations(word, config);
  } catch {
    return null;
  }
};

const isDictionaryTargetStructure = (config: TargetStructure): boolean =>
  config.voice === 'none' &&
  config.aspect === 'none' &&
  config.desire === false &&
  config.volitional === false &&
  config.imperative === false &&
  config.polarity === 'positive' &&
  config.politeness === 'plain' &&
  config.tense === 'present' &&
  config.te === false;

export const applyNegative = (state: WordState): WordState => {
  if (state.paradigm === 'ichidan') {
    return {
      kanji: state.kanji.slice(0, -1) + 'ない',
      reading: state.reading.slice(0, -1) + 'ない',
      paradigm: 'iadj',
      chain: [...state.chain, 'Drop る and add ない (Negative)'],
      label: 'Negative'
    };
  }

  if (state.paradigm === 'godan') {
    if (state.reading === 'ある') {
      return {
        kanji: 'ない',
        reading: 'ない',
        paradigm: 'iadj',
        chain: [...state.chain, 'ある becomes ない (Irregular)'],
        label: 'Negative'
      };
    }

    const kParts = getGodanParts(state.kanji);
    const rParts = getGodanParts(state.reading);
    return {
      kanji: kParts.root + kParts.stems.a + 'ない',
      reading: rParts.root + rParts.stems.a + 'ない',
      paradigm: 'iadj',
      chain: [...state.chain, `Change ending to ${rParts.stems.a} and add ない (Negative)`],
      label: 'Negative'
    };
  }

  if (state.paradigm === 'iadj') {
    return {
      kanji: state.kanji.slice(0, -1) + 'くない',
      reading: state.reading.slice(0, -1) + 'くない',
      paradigm: 'iadj',
      chain: [...state.chain, 'Drop い and add くない (Negative)'],
      label: 'Negative'
    };
  }

  if (state.paradigm === 'naadj') {
    return {
      kanji: state.kanji + 'じゃない',
      reading: state.reading + 'じゃない',
      paradigm: 'iadj',
      chain: [...state.chain, 'Add じゃない (Negative)'],
      label: 'Negative'
    };
  }

  if (state.paradigm === 'irregular') {
    if (isSuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, 'する', 'しない'),
        reading: replaceSuffix(state.reading, 'する', 'しない'),
        paradigm: 'iadj',
        chain: [...state.chain, 'Replace する with しない (Negative)'],
        label: 'Negative'
      };
    }

    if (isKuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, '来る', '来ない'),
        reading: replaceSuffix(state.reading, 'くる', 'こない'),
        paradigm: 'iadj',
        chain: [...state.chain, 'Replace 来る/くる with 来ない/こない (Negative)'],
        label: 'Negative'
      };
    }
  }

  throw new Error(`Grammar Error: Cannot apply Negative to paradigm ${state.paradigm} (${state.reading})`);
};

export const applyTeForm = (state: WordState): WordState => {
  if (state.paradigm === 'ichidan') {
    return {
      kanji: state.kanji.slice(0, -1) + 'て',
      reading: state.reading.slice(0, -1) + 'て',
      paradigm: 'te-form',
      chain: [...state.chain, 'Drop る and add て'],
      label: 'Te-Form'
    };
  }

  if (state.paradigm === 'godan') {
    if (state.reading === 'いく') {
      return {
        kanji: state.kanji.replace(/.$/, 'って'),
        reading: 'いって',
        paradigm: 'te-form',
        chain: [...state.chain, '行く is irregular: add って'],
        label: 'Te-Form'
      };
    }

    const kParts = getGodanParts(state.kanji);
    const rParts = getGodanParts(state.reading);
    const suffix = ['ぐ', 'ぶ', 'む', 'ぬ'].includes(rParts.ending) ? 'で' : 'て';
    return {
      kanji: kParts.root + kParts.stems.te + suffix,
      reading: rParts.root + rParts.stems.te + suffix,
      paradigm: 'te-form',
      chain: [...state.chain, `Change ending to ${rParts.stems.te} and add ${suffix}`],
      label: 'Te-Form'
    };
  }

  if (state.paradigm === 'iadj') {
    return {
      kanji: state.kanji.slice(0, -1) + 'くて',
      reading: state.reading.slice(0, -1) + 'くて',
      paradigm: 'te-form',
      chain: [...state.chain, 'Drop い and add くて'],
      label: 'Te-Form'
    };
  }

  if (state.paradigm === 'naadj') {
    return {
      kanji: state.kanji + 'で',
      reading: state.reading + 'で',
      paradigm: 'te-form',
      chain: [...state.chain, 'Add で'],
      label: 'Te-Form'
    };
  }

  if (state.paradigm === 'irregular') {
    if (isSuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, 'する', 'して'),
        reading: replaceSuffix(state.reading, 'する', 'して'),
        paradigm: 'te-form',
        chain: [...state.chain, 'Replace する with して'],
        label: 'Te-Form'
      };
    }

    if (isKuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, '来る', '来て'),
        reading: replaceSuffix(state.reading, 'くる', 'きて'),
        paradigm: 'te-form',
        chain: [...state.chain, 'Replace 来る/くる with 来て/きて'],
        label: 'Te-Form'
      };
    }
  }

  throw new Error(`Grammar Error: Cannot apply te-form to paradigm ${state.paradigm} (${state.reading})`);
};

export const applyPast = (state: WordState): WordState => {
  if (state.paradigm === 'iadj') {
    return {
      kanji: state.kanji.slice(0, -1) + 'かった',
      reading: state.reading.slice(0, -1) + 'かった',
      paradigm: 'iadj',
      chain: [...state.chain, 'Drop い and add かった (Past)'],
      label: 'Past'
    };
  }

  if (state.paradigm === 'naadj') {
    return {
      kanji: state.kanji + 'だった',
      reading: state.reading + 'だった',
      paradigm: 'irregular',
      chain: [...state.chain, 'Add だった (Past)'],
      label: 'Past'
    };
  }

  if (state.paradigm === 'ichidan' || state.paradigm === 'godan') {
    const teState = applyTeForm(state);
    const suffix = teState.reading.endsWith('で') ? 'だ' : 'た';
    return {
      kanji: teState.kanji.slice(0, -1) + suffix,
      reading: teState.reading.slice(0, -1) + suffix,
      paradigm: 'irregular',
      chain: [...state.chain, 'Apply te-form rules but end in た/だ (Past)'],
      label: 'Past'
    };
  }

  if (state.paradigm === 'irregular') {
    if (isSuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, 'する', 'した'),
        reading: replaceSuffix(state.reading, 'する', 'した'),
        paradigm: 'irregular',
        chain: [...state.chain, 'Replace する with した (Past)'],
        label: 'Past'
      };
    }

    if (isKuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, '来る', '来た'),
        reading: replaceSuffix(state.reading, 'くる', 'きた'),
        paradigm: 'irregular',
        chain: [...state.chain, 'Replace 来る/くる with 来た/きた (Past)'],
        label: 'Past'
      };
    }
  }

  throw new Error(`Grammar Error: Cannot apply Past to paradigm ${state.paradigm} (${state.reading})`);
};

export const applyDesire = (state: WordState): WordState => {
  if (state.paradigm === 'ichidan') {
    return {
      kanji: state.kanji.slice(0, -1) + 'たい',
      reading: state.reading.slice(0, -1) + 'たい',
      paradigm: 'iadj',
      chain: [...state.chain, 'Drop る and add たい (Desire)'],
      label: 'Desire'
    };
  }

  if (state.paradigm === 'godan') {
    const kParts = getGodanParts(state.kanji);
    const rParts = getGodanParts(state.reading);
    return {
      kanji: kParts.root + kParts.stems.i + 'たい',
      reading: rParts.root + rParts.stems.i + 'たい',
      paradigm: 'iadj',
      chain: [...state.chain, `Change ending to ${rParts.stems.i} and add たい (Desire)`],
      label: 'Desire'
    };
  }

  if (state.paradigm === 'irregular') {
    if (isSuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, 'する', 'したい'),
        reading: replaceSuffix(state.reading, 'する', 'したい'),
        paradigm: 'iadj',
        chain: [...state.chain, 'Replace する with したい (Desire)'],
        label: 'Desire'
      };
    }

    if (isKuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, '来る', '来たい'),
        reading: replaceSuffix(state.reading, 'くる', 'きたい'),
        paradigm: 'iadj',
        chain: [...state.chain, 'Replace 来る/くる with 来たい/きたい (Desire)'],
        label: 'Desire'
      };
    }
  }

  throw new Error(`Grammar Error: Cannot apply Desire to paradigm ${state.paradigm} (${state.reading})`);
};

export const applyCausative = (state: WordState): WordState => {
  if (state.paradigm === 'ichidan') {
    return {
      kanji: state.kanji.slice(0, -1) + 'させる',
      reading: state.reading.slice(0, -1) + 'させる',
      paradigm: 'ichidan',
      chain: [...state.chain, 'Drop る and add させる (Causative)'],
      label: 'Causative'
    };
  }

  if (state.paradigm === 'godan') {
    const kParts = getGodanParts(state.kanji);
    const rParts = getGodanParts(state.reading);
    return {
      kanji: kParts.root + kParts.stems.a + 'せる',
      reading: rParts.root + rParts.stems.a + 'せる',
      paradigm: 'ichidan',
      chain: [...state.chain, `Change ending to ${rParts.stems.a} and add せる (Causative)`],
      label: 'Causative'
    };
  }

  if (state.paradigm === 'irregular') {
    if (isSuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, 'する', 'させる'),
        reading: replaceSuffix(state.reading, 'する', 'させる'),
        paradigm: 'ichidan',
        chain: [...state.chain, 'Replace する with させる (Causative)'],
        label: 'Causative'
      };
    }

    if (isKuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, '来る', '来させる'),
        reading: replaceSuffix(state.reading, 'くる', 'こさせる'),
        paradigm: 'ichidan',
        chain: [...state.chain, 'Replace 来る/くる with 来させる/こさせる (Causative)'],
        label: 'Causative'
      };
    }
  }

  throw new Error(`Grammar Error: Cannot apply Causative to paradigm ${state.paradigm} (${state.reading})`);
};

export const applyPassive = (state: WordState): WordState => {
  if (state.paradigm === 'ichidan') {
    return {
      kanji: state.kanji.slice(0, -1) + 'られる',
      reading: state.reading.slice(0, -1) + 'られる',
      paradigm: 'ichidan',
      chain: [...state.chain, 'Drop る and add られる (Passive)'],
      label: 'Passive'
    };
  }

  if (state.paradigm === 'godan') {
    const kParts = getGodanParts(state.kanji);
    const rParts = getGodanParts(state.reading);
    return {
      kanji: kParts.root + kParts.stems.a + 'れる',
      reading: rParts.root + rParts.stems.a + 'れる',
      paradigm: 'ichidan',
      chain: [...state.chain, `Change ending to ${rParts.stems.a} and add れる (Passive)`],
      label: 'Passive'
    };
  }

  if (state.paradigm === 'irregular') {
    if (isSuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, 'する', 'される'),
        reading: replaceSuffix(state.reading, 'する', 'される'),
        paradigm: 'ichidan',
        chain: [...state.chain, 'Replace する with される (Passive)'],
        label: 'Passive'
      };
    }

    if (isKuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, '来る', '来られる'),
        reading: replaceSuffix(state.reading, 'くる', 'こられる'),
        paradigm: 'ichidan',
        chain: [...state.chain, 'Replace 来る/くる with 来られる/こられる (Passive)'],
        label: 'Passive'
      };
    }
  }

  throw new Error(`Grammar Error: Cannot apply Passive to paradigm ${state.paradigm} (${state.reading})`);
};

export const applyPotential = (state: WordState): WordState => {
  if (state.paradigm === 'ichidan') {
    return {
      kanji: state.kanji.slice(0, -1) + 'られる',
      reading: state.reading.slice(0, -1) + 'られる',
      paradigm: 'ichidan',
      chain: [...state.chain, 'Drop る and add られる (Potential)'],
      label: 'Potential'
    };
  }

  if (state.paradigm === 'godan') {
    const kParts = getGodanParts(state.kanji);
    const rParts = getGodanParts(state.reading);
    return {
      kanji: kParts.root + kParts.stems.e + 'る',
      reading: rParts.root + rParts.stems.e + 'る',
      paradigm: 'ichidan',
      chain: [...state.chain, `Change ending to ${rParts.stems.e} and add る (Potential)`],
      label: 'Potential'
    };
  }

  if (state.paradigm === 'irregular') {
    if (isSuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, 'する', 'できる'),
        reading: replaceSuffix(state.reading, 'する', 'できる'),
        paradigm: 'ichidan',
        chain: [...state.chain, 'Replace する with できる (Potential)'],
        label: 'Potential'
      };
    }

    if (isKuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, '来る', '来られる'),
        reading: replaceSuffix(state.reading, 'くる', 'こられる'),
        paradigm: 'ichidan',
        chain: [...state.chain, 'Replace 来る/くる with 来られる/こられる (Potential)'],
        label: 'Potential'
      };
    }
  }

  throw new Error(`Grammar Error: Cannot apply Potential to paradigm ${state.paradigm} (${state.reading})`);
};

export const applyProgressive = (state: WordState): WordState => {
  const teState = applyTeForm(state);
  return {
    kanji: teState.kanji + 'いる',
    reading: teState.reading + 'いる',
    paradigm: 'ichidan',
    chain: [...teState.chain, 'Add いる (Progressive)'],
    label: 'Progressive'
  };
};

export const applyVolitional = (state: WordState): WordState => {
  if (state.paradigm === 'ichidan') {
    return {
      kanji: state.kanji.slice(0, -1) + 'よう',
      reading: state.reading.slice(0, -1) + 'よう',
      paradigm: 'irregular',
      chain: [...state.chain, 'Drop る and add よう (Volitional)'],
      label: 'Volitional'
    };
  }

  if (state.paradigm === 'godan') {
    const kParts = getGodanParts(state.kanji);
    const rParts = getGodanParts(state.reading);
    return {
      kanji: kParts.root + kParts.stems.o + 'う',
      reading: rParts.root + rParts.stems.o + 'う',
      paradigm: 'irregular',
      chain: [...state.chain, `Change ending to ${rParts.stems.o} and add う (Volitional)`],
      label: 'Volitional'
    };
  }

  if (state.paradigm === 'irregular') {
    if (isSuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, 'する', 'しよう'),
        reading: replaceSuffix(state.reading, 'する', 'しよう'),
        paradigm: 'irregular',
        chain: [...state.chain, 'Replace する with しよう (Volitional)'],
        label: 'Volitional'
      };
    }

    if (isKuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, '来る', '来よう'),
        reading: replaceSuffix(state.reading, 'くる', 'こよう'),
        paradigm: 'irregular',
        chain: [...state.chain, 'Replace 来る/くる with 来よう/こよう (Volitional)'],
        label: 'Volitional'
      };
    }
  }

  throw new Error(`Grammar Error: Cannot apply Volitional to paradigm ${state.paradigm} (${state.reading})`);
};

export const applyImperative = (state: WordState): WordState => {
  if (state.paradigm === 'ichidan') {
    return {
      kanji: state.kanji.slice(0, -1) + 'ろ',
      reading: state.reading.slice(0, -1) + 'ろ',
      paradigm: 'irregular',
      chain: [...state.chain, 'Drop る and add ろ (Imperative)'],
      label: 'Imperative'
    };
  }

  if (state.paradigm === 'godan') {
    const kParts = getGodanParts(state.kanji);
    const rParts = getGodanParts(state.reading);
    return {
      kanji: kParts.root + kParts.stems.e,
      reading: rParts.root + rParts.stems.e,
      paradigm: 'irregular',
      chain: [...state.chain, `Change ending to ${rParts.stems.e} (Imperative)`],
      label: 'Imperative'
    };
  }

  if (state.paradigm === 'irregular') {
    if (isSuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, 'する', 'しろ'),
        reading: replaceSuffix(state.reading, 'する', 'しろ'),
        paradigm: 'irregular',
        chain: [...state.chain, 'Replace する with しろ (Imperative)'],
        label: 'Imperative'
      };
    }

    if (isKuruVerb(state)) {
      return {
        kanji: replaceSuffix(state.kanji, '来る', '来い'),
        reading: replaceSuffix(state.reading, 'くる', 'こい'),
        paradigm: 'irregular',
        chain: [...state.chain, 'Replace 来る/くる with 来い/こい (Imperative)'],
        label: 'Imperative'
      };
    }
  }

  throw new Error(`Grammar Error: Cannot apply Imperative to paradigm ${state.paradigm} (${state.reading})`);
};

type ConvertTargetKey =
  | 'active'
  | 'passive'
  | 'causative'
  | 'potential'
  | 'progressive'
  | 'desire'
  | 'volitional'
  | 'imperative'
  | 'negative'
  | 'positive'
  | 'polite'
  | 'plain'
  | 'past'
  | 'present'
  | 'te';

type ConvertOption = {
  key: ConvertTargetKey;
  label: string;
  canUse: (word: Word, settings: DrillSettings) => boolean;
  isCompatible: (sourceConfig: TargetStructure, sourceState: WordState, word: Word) => boolean;
  buildTargetConfig: (sourceConfig: TargetStructure, sourceState: WordState, word: Word) => TargetStructure;
  labelSuffix?: (word: Word) => string;
};

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const baseTargetStructure = (): TargetStructure => ({
  voice: 'none',
  aspect: 'none',
  desire: false,
  volitional: false,
  imperative: false,
  polarity: 'positive',
  politeness: 'plain',
  tense: 'present',
  te: false
});

const isVerbWord = (word: Word): boolean =>
  word.pos === 'godan' || word.pos === 'ichidan' || word.pos === 'irregular';

const supportsPotential = (word: Word): boolean => word.pos !== 'irregular';

const createLegalTargetConfig = (settings: DrillSettings, word: Word): TargetStructure => {
  const config = baseTargetStructure();
  const isVerb = isVerbWord(word);

  const voices: TargetStructure['voice'][] = ['none'];
  if (isVerb) {
    if (settings.forms.causative) voices.push('causative');
    if (settings.forms.passive) voices.push('passive');
    if (settings.forms.potential && supportsPotential(word)) voices.push('potential');
  }

  const polarities: TargetStructure['polarity'][] = ['positive'];
  if (settings.forms.negative) polarities.push('negative');

  const politenesses: TargetStructure['politeness'][] = [];
  if (settings.forms.plain) politenesses.push('plain');
  if (settings.forms.polite) politenesses.push('polite');
  if (politenesses.length === 0) politenesses.push('plain');

  const tenses: TargetStructure['tense'][] = ['present'];
  if (settings.forms.past) tenses.push('past');

  config.voice = pickRandom(voices);
  config.aspect = isVerb && settings.forms.progressive && Math.random() > 0.5 ? 'progressive' : 'none';
  config.desire = isVerb && settings.forms.desire && Math.random() > 0.5;
  config.volitional = isVerb && settings.forms.volitional && Math.random() > 0.5;
  config.imperative = isVerb && settings.forms.imperative && Math.random() > 0.5;
  config.polarity = pickRandom(polarities);
  config.politeness = pickRandom(politenesses);
  config.tense = pickRandom(tenses);
  config.te = settings.forms.te && Math.random() > 0.5 && word.pos !== 'naadj';

  if (config.volitional || config.imperative) {
    config.voice = 'none';
    config.aspect = 'none';
    config.desire = false;
    config.polarity = 'positive';
    config.politeness = 'plain';
    config.tense = 'present';
    config.te = false;
  }

  if (config.te) {
    config.voice = 'none';
    config.aspect = 'none';
    config.volitional = false;
    config.imperative = false;
    config.desire = false;
    config.tense = 'present';
    config.politeness = 'plain';
  }

  return config;
};

const convertOptions = (settings: DrillSettings, word: Word): ConvertOption[] => {
  const isVerb = isVerbWord(word);
  const options: ConvertOption[] = [
    {
      key: 'active',
      label: 'Active',
      canUse: (_word: Word, currentSettings: DrillSettings) => isVerb && (currentSettings.forms.passive || currentSettings.forms.causative || currentSettings.forms.potential),
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.voice !== 'none',
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, voice: 'none' })
    },
    {
      key: 'passive',
      label: 'Passive',
      canUse: (_word: Word, currentSettings: DrillSettings) => isVerb && currentSettings.forms.passive && word.pos !== 'irregular',
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.voice === 'none',
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, voice: 'passive' }),
      labelSuffix: (currentWord: Word) => (currentWord.pos === 'ichidan' ? ' (same surface as Potential)' : '')
    },
    {
      key: 'causative',
      label: 'Causative',
      canUse: (_word: Word, currentSettings: DrillSettings) => isVerb && currentSettings.forms.causative,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.voice === 'none',
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, voice: 'causative' })
    },
    {
      key: 'potential',
      label: 'Potential',
      canUse: (_word: Word, currentSettings: DrillSettings) => isVerb && currentSettings.forms.potential && supportsPotential(word),
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.voice === 'none',
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, voice: 'potential' }),
      labelSuffix: (currentWord: Word) => (currentWord.pos === 'ichidan' ? ' (same surface as Passive)' : '')
    },
    {
      key: 'progressive',
      label: 'Progressive',
      canUse: (_word: Word, currentSettings: DrillSettings) => isVerb && currentSettings.forms.progressive,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.aspect === 'none' && !sourceConfig.volitional && !sourceConfig.imperative,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, aspect: 'progressive' })
    },
    {
      key: 'desire',
      label: 'Desire',
      canUse: (_word: Word, currentSettings: DrillSettings) => isVerb && currentSettings.forms.desire,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.desire === false && !sourceConfig.volitional && !sourceConfig.imperative,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, desire: true })
    },
    {
      key: 'volitional',
      label: 'Volitional',
      canUse: (_word: Word, currentSettings: DrillSettings) => isVerb && currentSettings.forms.volitional,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.voice === 'none' && sourceConfig.aspect === 'none' && sourceConfig.desire === false && sourceConfig.polarity === 'positive' && sourceConfig.politeness === 'plain' && sourceConfig.tense === 'present' && sourceConfig.te === false && !sourceConfig.imperative && !sourceConfig.volitional,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({
        ...sourceConfig,
        voice: 'none',
        aspect: 'none',
        desire: false,
        volitional: true,
        imperative: false,
        polarity: 'positive',
        politeness: 'plain',
        tense: 'present',
        te: false
      })
    },
    {
      key: 'imperative',
      label: 'Imperative',
      canUse: (_word: Word, currentSettings: DrillSettings) => isVerb && currentSettings.forms.imperative,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.voice === 'none' && sourceConfig.aspect === 'none' && sourceConfig.desire === false && sourceConfig.polarity === 'positive' && sourceConfig.politeness === 'plain' && sourceConfig.tense === 'present' && sourceConfig.te === false && !sourceConfig.imperative && !sourceConfig.volitional,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({
        ...sourceConfig,
        voice: 'none',
        aspect: 'none',
        desire: false,
        volitional: false,
        imperative: true,
        polarity: 'positive',
        politeness: 'plain',
        tense: 'present',
        te: false
      })
    },
    {
      key: 'negative',
      label: 'Negative',
      canUse: (_word: Word, currentSettings: DrillSettings) => currentSettings.forms.negative,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.polarity === 'positive' && !sourceConfig.volitional && !sourceConfig.imperative,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, polarity: 'negative' })
    },
    {
      key: 'positive',
      label: 'Positive',
      canUse: (_word: Word, currentSettings: DrillSettings) => currentSettings.forms.negative,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.polarity === 'negative' && !sourceConfig.volitional && !sourceConfig.imperative,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, polarity: 'positive' })
    },
    {
      key: 'polite',
      label: 'Polite',
      canUse: (_word: Word, currentSettings: DrillSettings) => currentSettings.forms.polite,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.politeness === 'plain' && !sourceConfig.volitional && !sourceConfig.imperative,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, politeness: 'polite' })
    },
    {
      key: 'plain',
      label: 'Plain',
      canUse: (_word: Word, currentSettings: DrillSettings) => currentSettings.forms.plain,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.politeness === 'polite' && !sourceConfig.volitional && !sourceConfig.imperative,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, politeness: 'plain' })
    },
    {
      key: 'past',
      label: 'Past',
      canUse: (_word: Word, currentSettings: DrillSettings) => currentSettings.forms.past,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.tense === 'present' && !sourceConfig.volitional && !sourceConfig.imperative,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, tense: 'past' })
    },
    {
      key: 'present',
      label: 'Present',
      canUse: (_word: Word, currentSettings: DrillSettings) => currentSettings.forms.past,
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.tense === 'past' && !sourceConfig.volitional && !sourceConfig.imperative,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, tense: 'present' })
    },
    {
      key: 'te',
      label: 'Te-Form',
      canUse: (_word: Word, currentSettings: DrillSettings) => currentSettings.forms.te && word.pos !== 'naadj',
      isCompatible: (sourceConfig: TargetStructure) => sourceConfig.te === false && sourceConfig.tense === 'present' && sourceConfig.politeness === 'plain' && !sourceConfig.volitional && !sourceConfig.imperative,
      buildTargetConfig: (sourceConfig: TargetStructure) => ({ ...sourceConfig, te: true, tense: 'present', politeness: 'plain' })
    }
  ];

  return options.filter(option => option.canUse(word, settings));
};

const getSourceAwareConvertOptions = (settings: DrillSettings, word: Word): ConvertOption[] =>
  convertOptions(settings, word);

const buildConvertLabel = (option: ConvertOption, word: Word): string => {
  const suffix = option.labelSuffix?.(word) ?? '';
  return `${option.label}${suffix}`;
};

export const isValidWordForSettings = (w: Word, settings: DrillSettings): boolean =>
  settings.wordTypes[w.pos as keyof DrillSettings['wordTypes']] === true;

export const isValidWordForConvertSettings = (w: Word, settings: DrillSettings): boolean => {
  if (settings.mode !== 'convert') return true;
  return getSourceAwareConvertOptions(settings, w).length > 0;
};

const buildConvertTarget = (settings: DrillSettings, word: Word) => {
  const options = getSourceAwareConvertOptions(settings, word);
  if (options.length === 0) {
    throw new Error(`Grammar Error: no convert-mode rules available for paradigm ${word.pos}`);
  }

  const focusedKey = settings.focus.toUpperCase();
  const focused = options.find(option => option.key.toUpperCase() === focusedKey);

  for (let attempt = 0; attempt < 96; attempt++) {
    const sourceConfig = createLegalTargetConfig(settings, word);
    if (isDictionaryTargetStructure(sourceConfig)) {
      continue;
    }

    const sourceState = safeApply(word, sourceConfig);
    if (!sourceState) {
      continue;
    }

    const compatibleOptions = options.filter(option => option.isCompatible(sourceConfig, sourceState, word));
    const choice = focused && compatibleOptions.some(option => option.key === focused.key)
      ? focused
      : pickRandom(compatibleOptions);

    if (!choice) {
      continue;
    }

    const targetConfig = choice.buildTargetConfig(sourceConfig, sourceState, word);
    const targetState = safeApply(word, targetConfig);
    if (!targetState) {
      continue;
    }

    if (sourceState.kanji === targetState.kanji && sourceState.reading === targetState.reading) {
      continue;
    }

    return { sourceConfig, targetConfig, targetLabel: buildConvertLabel(choice, word) };
  }

  throw new Error(`Grammar Error: unable to build a legal one-step convert question for ${word.kanji} (${word.reading})`);
};

const buildTargetStructure = (settings: DrillSettings, word: Word): TargetStructure => {
  for (let attempt = 0; attempt < 96; attempt++) {
    const config = createLegalTargetConfig(settings, word);
    const targetState = safeApply(word, config);
    if (!targetState) {
      continue;
    }

    if (isDictionaryTargetStructure(config)) {
      continue;
    }

    return config;
  }

  throw new Error(`Grammar Error: unable to build a legal plain-mode target for ${word.kanji} (${word.reading})`);
};

const conjugateVerb = (state: WordState, config: TargetStructure): WordState => {
  const polite = config.politeness === 'polite';
  const negative = config.polarity === 'negative';
  const past = config.tense === 'past';
  const priorLabel = state.label;

  if (!polite) {
    let s = state;
    let label = priorLabel;
    if (negative) {
      s = applyNegative(s);
      label = appendLabel(label, 'Negative');
    }
    if (past) {
      if (negative) {
        s = {
          ...s,
          kanji: s.kanji.slice(0, -1) + 'かった',
          reading: s.reading.slice(0, -1) + 'かった',
          chain: [...s.chain, 'Drop い and add かった (Past)']
        };
      } else {
        s = applyPast(s);
      }
      label = appendLabel(label, 'Past');
    }

    return { ...s, label };
  }

  if (state.paradigm !== 'godan' && state.paradigm !== 'ichidan' && state.paradigm !== 'irregular') {
    throw new Error(`Grammar Error: no masu-stem rule defined for paradigm ${state.paradigm} (${state.reading}).`);
  }

  let masuKanji: string;
  let masuReading: string;
  let ruleNote: string;
  if (state.paradigm === 'ichidan') {
    masuKanji = state.kanji.slice(0, -1);
    masuReading = state.reading.slice(0, -1);
    ruleNote = 'Drop る';
  } else if (state.paradigm === 'irregular' && isSuruVerb(state)) {
    masuKanji = replaceSuffix(state.kanji, 'する', 'し');
    masuReading = replaceSuffix(state.reading, 'する', 'し');
    ruleNote = 'Replace する with し';
  } else if (state.paradigm === 'irregular' && isKuruVerb(state)) {
    masuKanji = replaceSuffix(state.kanji, '来る', '来');
    masuReading = replaceSuffix(state.reading, 'くる', 'き');
    ruleNote = 'Replace 来る/くる with 来/き';
  } else {
    const kParts = getGodanParts(state.kanji);
    const rParts = getGodanParts(state.reading);
    masuKanji = kParts.root + kParts.stems.i;
    masuReading = rParts.root + rParts.stems.i;
    ruleNote = `Change ending to ${rParts.stems.i}`;
  }

  const suffix = negative && past ? 'ませんでした' : negative ? 'ません' : past ? 'ました' : 'ます';
  const politeLabel = ['Polite', negative && 'Negative', past && 'Past'].filter(Boolean).join(' ');
  const label = appendLabel(priorLabel, politeLabel);

  return {
    kanji: masuKanji + suffix,
    reading: masuReading + suffix,
    paradigm: 'irregular',
    chain: [...state.chain, `${ruleNote} and add ${suffix} (${politeLabel})`],
    label
  };
};

const conjugateIAdj = (state: WordState, config: TargetStructure): WordState => {
  let s = state;
  let label = state.label;
  if (config.polarity === 'negative') {
    s = applyNegative(s);
    label = appendLabel(label, 'Negative');
  }
  if (config.tense === 'past') {
    s = applyPast({ ...s, paradigm: 'iadj' });
    label = appendLabel(label, 'Past');
  }
  if (config.politeness === 'polite') {
    s = {
      ...s,
      kanji: s.kanji + 'です',
      reading: s.reading + 'です',
      chain: [...s.chain, 'Add です (Polite)']
    };
    label = appendLabel(label, 'Polite');
  }
  return { ...s, label };
};

const conjugateNaAdj = (state: WordState, config: TargetStructure): WordState => {
  const negative = config.polarity === 'negative';
  const past = config.tense === 'past';
  const polite = config.politeness === 'polite';

  let s = state;
  let label = state.label;

  if (negative) {
    s = applyNegative(s);
    label = appendLabel(label, 'Negative');
  }

  if (past && negative) {
    s = applyPast({ ...s, paradigm: 'iadj' });
    label = appendLabel(label, 'Past');
  } else if (past && !negative && polite) {
    return {
      ...s,
      kanji: s.kanji + 'でした',
      reading: s.reading + 'でした',
      chain: [...s.chain, 'Add でした (Polite Past)'],
      label: appendLabel(appendLabel(label, 'Past'), 'Polite')
    };
  } else if (past && !negative) {
    s = applyPast(s);
    label = appendLabel(label, 'Past');
  }

  if (polite) {
    s = {
      ...s,
      kanji: s.kanji + 'です',
      reading: s.reading + 'です',
      chain: [...s.chain, 'Add です (Polite)']
    };
    label = appendLabel(label, 'Polite');
  }

  return { ...s, label };
};

const applyFinalTerminalMood = (state: WordState, config: TargetStructure): WordState => {
  if (config.volitional) {
    return appendChain(applyVolitional(state), 'Apply volitional as terminal mood');
  }

  if (config.imperative) {
    return appendChain(applyImperative(state), 'Apply imperative as terminal mood');
  }

  return state;
};

const applyConjugations = (word: Word, config: TargetStructure): WordState => {
  let state: WordState = createDictionaryState(word);

  if (config.voice === 'causative') {
    state = applyCausative(state);
  } else if (config.voice === 'passive') {
    state = applyPassive(state);
  } else if (config.voice === 'potential') {
    state = applyPotential(state);
  }

  if (config.aspect === 'progressive') {
    state = applyProgressive(state);
  }

  if (config.desire) {
    state = applyDesire(state);
  }

  state = applyFinalTerminalMood(state, config);

  if (config.volitional || config.imperative) {
    if (state.chain.length === 0) {
      state.chain.push('Dictionary Form');
    }
    return { ...state, label: state.label.trim() };
  }

  if (state.paradigm === 'iadj') {
    state = conjugateIAdj(state, config);
  } else if (state.paradigm === 'naadj') {
    state = conjugateNaAdj(state, config);
  } else {
    state = conjugateVerb(state, config);
  }

  if (config.te && config.tense === 'present' && config.politeness === 'plain') {
    const priorLabel = state.label;
    state = applyTeForm(state);
    state.label = appendLabel(priorLabel, 'Te-Form');
  }

  if (state.chain.length === 0) {
    state.chain.push('Dictionary Form');
  }

  return { ...state, label: state.label.trim() };
};

export const generateQuestion = (word: Word, settings: DrillSettings): Question => {
  if (settings.mode === 'convert') {
    for (let attempt = 0; attempt < 16; attempt++) {
      const { sourceConfig, targetConfig, targetLabel } = buildConvertTarget(settings, word);
      const sourceState = applyConjugations(word, sourceConfig);
      const targetState = applyConjugations(word, targetConfig);

      if (sourceState.reading === targetState.reading && sourceState.kanji === targetState.kanji) {
        continue;
      }

      return {
        source: {
          kanji: sourceState.kanji,
          reading: sourceState.reading,
          furiRoot: word.kanji,
          furiReading: word.reading,
          explanation: sourceState.chain
        },
        target: {
          kanji: targetState.kanji,
          reading: targetState.reading,
          furiRoot: '',
          furiReading: '',
          explanation: targetState.chain
        },
        sourceChain: sourceState.label,
        targetLabel
      };
    }

    throw new Error(`Grammar Error: unable to build a distinct convert-mode question for ${word.kanji} (${word.reading})`);
  }

  const targetConfig = buildTargetStructure(settings, word);
  const targetState = applyConjugations(word, targetConfig);
  const sourceState = createDictionaryState(word);

  return {
    source: {
      kanji: sourceState.kanji,
      reading: sourceState.reading,
      furiRoot: word.kanji,
      furiReading: word.reading,
      explanation: sourceState.chain
    },
    target: {
      kanji: targetState.kanji,
      reading: targetState.reading,
      furiRoot: '',
      furiReading: '',
      explanation: targetState.chain
    },
    sourceChain: sourceState.label,
    targetLabel: targetState.label
  };
};

export const getDiffLabel = (targetLabel: string) => targetLabel;