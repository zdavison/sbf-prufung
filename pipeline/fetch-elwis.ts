import { request } from 'undici';
import { writeFileSync, mkdirSync } from 'node:fs';
import { parseElwisHtml } from './parse-elwis';
import type { Exam, RawQuestion } from './types';

type SubPage = { url: string; exam: Exam; isNavigationTask?: boolean; label: string };

const BASE = 'https://www.elwis.de/DE/Sportschifffahrt/Sportbootfuehrerscheine';

export const SOURCES: SubPage[] = [
  // SBF-Binnen (300 Qs = 72 basis + 181 binnen + 47 segeln)
  { url: `${BASE}/Fragenkatalog-Binnen/Basisfragen/Basisfragen-node.html`, exam: 'basis', label: 'SBF-Binnen basisfragen' },
  { url: `${BASE}/Fragenkatalog-Binnen/Spezifische-Fragen-Binnen/Spezifische-Fragen-Binnen-node.html`, exam: 'binnen', label: 'SBF-Binnen binnen-specific' },
  { url: `${BASE}/Fragenkatalog-Binnen/Spezifische-Fragen-Segeln/Spezifische-Fragen-Segeln-node.html`, exam: 'segeln', label: 'SBF-Binnen segeln (254-300)' },

  // SBF-See (300 Qs = 72 + 213 + 15). URLs TBD — user to confirm the /Fragenkatalog-See/ paths.
  // { url: `${BASE}/Fragenkatalog-See/Basisfragen/Basisfragen-node.html`, exam: 'basis', label: 'SBF-See basisfragen' },
  // { url: `${BASE}/Fragenkatalog-See/Spezifische-Fragen-See/Spezifische-Fragen-See-node.html`, exam: 'see', label: 'SBF-See see-specific' },
  // { url: `${BASE}/Fragenkatalog-See/Navigationsaufgaben/Navigationsaufgaben-node.html`, exam: 'see', isNavigationTask: true, label: 'SBF-See nav tasks' },
];

export async function fetchHtml(url: string): Promise<string> {
  const res = await request(url, { headers: { 'user-agent': 'sbf-prufung-pipeline/0.1 (local tool)' } });
  if (res.statusCode !== 200) throw new Error(`GET ${url} returned ${res.statusCode}`);
  return await res.body.text();
}

async function main() {
  mkdirSync('data', { recursive: true });
  const all: RawQuestion[] = [];
  for (const src of SOURCES) {
    process.stderr.write(`Fetching ${src.label}... `);
    const html = await fetchHtml(src.url);
    const parsed = parseElwisHtml(html, src.exam);
    const tagged = src.isNavigationTask ? parsed.map(q => ({ ...q, isNavigationTask: true })) : parsed;
    process.stderr.write(`${tagged.length} questions\n`);
    all.push(...tagged);
  }
  writeFileSync('data/raw-parsed.json', JSON.stringify(all, null, 2));
  process.stderr.write(`Wrote data/raw-parsed.json (${all.length} questions)\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
