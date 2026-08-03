// Shared vocabulary for comparing conjugation form labels (e.g. "polite past negative")
// as sets of grammatical features. Used both for picking a source form that's "one step away"
// from the target (engine.ts) and for describing what changed between two forms (explanationGenerator.ts).

export function getFormFeatures(label: string): Set<string> {
  const features = new Set<string>();
  if (label === 'plain' || label === 'dictionary') return features;

  const words = label.split(' ');
  for (const word of words) {
    if (word === 'te-form') features.add('te');
    else features.add(word);
  }
  return features;
}

export function getFormDistance(labelA: string, labelB: string): number {
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