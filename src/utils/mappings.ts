export type GodanEnding = 'う' | 'く' | 'ぐ' | 'す' | 'つ' | 'ぬ' | 'ぶ' | 'む' | 'る';

export interface StemMap {
  a: string;  // Mizenkei (Negative, Passive, Causative)
  i: string;  // Ren'youkei (Polite, Desire, Stem)
  u: string;  // Shuushikei (Dictionary form)
  e: string;  // Kateikei/Meireikei (Potential, Imperative, Conditional)
  o: string;  // Mizenkei-2 (Volitional)
  te: string; // Onbin (Base for te/ta forms)
}

export const GODAN_MAPPINGS: Record<GodanEnding, StemMap> = {
  'う': { a: 'わ', i: 'い', u: 'う', e: 'え', o: 'お', te: 'っ' }, // Note: 'a' is 'わ' (wa), not 'あ' (a)
  'く': { a: 'か', i: 'き', u: 'く', e: 'け', o: 'こ', te: 'い' }, // Note: 行く (iku) is an exception for 'te'
  'ぐ': { a: 'が', i: 'ぎ', u: 'ぐ', e: 'げ', o: 'ご', te: 'い' }, // Note: te/ta suffixes become voiced (で/だ)
  'す': { a: 'さ', i: 'し', u: 'す', e: 'せ', o: 'そ', te: 'し' },
  'つ': { a: 'た', i: 'ち', u: 'つ', e: 'て', o: 'と', te: 'っ' },
  'ぬ': { a: 'な', i: 'に', u: 'ぬ', e: 'ね', o: 'の', te: 'ん' },
  'ぶ': { a: 'ば', i: 'び', u: 'ぶ', e: 'べ', o: 'ぼ', te: 'ん' }, // Note: te/ta suffixes become voiced (で/だ)
  'む': { a: 'ま', i: 'み', u: 'む', e: 'め', o: 'も', te: 'ん' }, // Note: te/ta suffixes become voiced (で/だ)
  'る': { a: 'ら', i: 'り', u: 'る', e: 'れ', o: 'ろ', te: 'っ' }
};

export interface VerbParts {
  root: string;
  ending: GodanEnding;
  stems: StemMap;
}

export const getGodanParts = (text: string): VerbParts => {
  const ending = text.slice(-1) as GodanEnding;
  const root = text.slice(0, -1);

  if (!GODAN_MAPPINGS[ending]) {
    throw new Error(`Grammar Error: '${text}' is not a valid Godan verb ending in a standard kana.`);
  }

  return { root, ending, stems: GODAN_MAPPINGS[ending] };
};