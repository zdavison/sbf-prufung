import { request } from 'undici';
import { writeFileSync, mkdirSync } from 'node:fs';
import { parseElwisHtml } from './parse-elwis';
import type { RawQuestion } from './types';

const SOURCES = {
  binnen: 'https://www.elwis.de/DE/Sportschifffahrt/Sportbootfuehrerscheine/Fragenkataloge/SBF-Binnen/SBF-Binnen-node.html',
  see: 'https://www.elwis.de/DE/Sportschifffahrt/Sportbootfuehrerscheine/Fragenkataloge/SBF-See/SBF-See-node.html',
} as const;

async function fetchHtml(url: string): Promise<string> {
  const res = await request(url, { headers: { 'user-agent': 'sbf-prufung-pipeline/0.1 (local tool)' } });
  if (res.statusCode !== 200) throw new Error(`GET ${url} returned ${res.statusCode}`);
  return await res.body.text();
}

async function main() {
  mkdirSync('data', { recursive: true });
  const all: RawQuestion[] = [];
  for (const [exam, url] of Object.entries(SOURCES)) {
    process.stderr.write(`Fetching ${exam}... `);
    const html = await fetchHtml(url);
    const parsed = parseElwisHtml(html, exam as 'binnen' | 'see');
    process.stderr.write(`${parsed.length} questions\n`);
    all.push(...parsed);
  }
  writeFileSync('data/raw-parsed.json', JSON.stringify(all, null, 2));
  process.stderr.write(`Wrote data/raw-parsed.json (${all.length} questions)\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
