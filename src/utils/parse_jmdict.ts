// parse_jmdict.ts
// run this with bun or ts-node to generate your clean data.ts

import * as fs from 'node:fs';

interface JMdictEntry {
  id: string;
  kanji?: { common: boolean; text: string; tags: string[] }[];
  kana?: { common: boolean; text: string; tags: string[]; appliesToKanji: string[] }[];
  sense: { partOfSpeech: string[]; gloss: { text: string }[] }[];
}

// Add an interface for the root JSON structure
interface JMdictRoot {
  version: string;
  languages: string[];
  commonOnly: boolean;
  dictDate: string;
  dictRevisions: string[];
  tags: Record<string, string>;
  words: JMdictEntry[];
}

type POS = 'godan' | 'ichidan' | 'iadj' | 'naadj' | 'irregular';

interface OutputWord {
  kanji: string;
  reading: string;
  pos: POS;
  english: string;
}

const mapJMdictPos = (tags: string[]): POS | null => {
  if (tags.includes('v1')) return 'ichidan';
  if (tags.some(t => t.startsWith('v5'))) return 'godan'; 
  if (tags.includes('adj-i')) return 'iadj';
  if (tags.includes('adj-na')) return 'naadj';
  if (tags.includes('vk') || tags.includes('vs-i') || tags.includes('vs-s')) return 'irregular';
  
  return null;
};

// Parse it as the root object, not a Record of arrays
const rawData: JMdictRoot = JSON.parse(fs.readFileSync('jmdict.json', 'utf-8'));
const outputWords: OutputWord[] = [];

// Loop directly over the words array, no Object.entries garbage
for (const entry of rawData.words) {
  const commonKanji = entry.kanji?.find(k => k.common);
  const commonKana = entry.kana?.find(k => k.common);
  
  if (!commonKana) continue; 
  
  const mainSense = entry.sense[0];
  if (!mainSense) continue;

  const mappedPos = mapJMdictPos(mainSense.partOfSpeech);
  if (!mappedPos) continue; 

  const englishDef = mainSense.gloss[0]?.text || '';

  outputWords.push({
    kanji: commonKanji ? commonKanji.text : commonKana.text, 
    reading: commonKana.text,
    pos: mappedPos,
    english: englishDef
  });
}

const fileContent = `
import { type Word } from './types';

export const WORDS: Word[] = ${JSON.stringify(outputWords, null, 2)};
`;

fs.writeFileSync('./data.ts', fileContent.trim());
console.log(`successfully extracted ${outputWords.length} words into data.ts`);