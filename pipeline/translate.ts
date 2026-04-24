import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { sha1 } from './hash';
import type { RawQuestion } from './types';

const MODEL = 'claude-haiku-4-5-20251001';
const CACHE_PATH = 'data/translations-cache.json';
const BATCH_SIZE = 20;

const SYSTEM = `You translate German text from the official SBF sailing exam catalog into idiomatic English for an English-speaking sailor studying for the German test.

Glossary (use these translations exactly):
- Backbord → port
- Steuerbord → starboard
- Bug → bow
- Heck → stern
- Luv → windward
- Lee → leeward
- Kollisionsverhütungsregeln (KVR) → Collision Regulations (COLREGs)
- Binnenschifffahrtsstraßen-Ordnung (BinSchStrO) → Inland Waterways Order (BinSchStrO)
- Seeschifffahrtsstraßen-Ordnung (SeeSchStrO) → Maritime Waterways Order (SeeSchStrO)
- Wasserstraßen- und Schifffahrtsverwaltung → Waterways and Shipping Administration
- Fahrrinne → fairway
- Tonne (as navigation mark) → buoy
- Spill / Spillkopf → bollard
- Sportboot → recreational boat

Rules:
- Preserve numbers, units, and regulation references verbatim.
- Keep the same sentence count as the German.
- Do not add explanations. Output only the translation.
- Do not wrap output in quotes or code blocks.`;

type Cache = Record<string, { de: string; en: string }>;

async function translateOne(client: Anthropic, de: string): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: de }],
  });
  const block = res.content[0];
  if (!block || block.type !== 'text') throw new Error('Unexpected response shape');
  return block.text.trim();
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Export it before running this script.');
  }
  const client = new Anthropic();
  const raw: RawQuestion[] = JSON.parse(readFileSync('data/raw-parsed.json', 'utf8'));
  const cache: Cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));

  const todo = new Map<string, string>();
  for (const q of raw) {
    for (const s of [q.question, ...q.answers]) {
      const h = sha1(s);
      if (!cache[h]) todo.set(h, s);
    }
  }

  process.stderr.write(`Translating ${todo.size} new strings (cache has ${Object.keys(cache).length})\n`);

  const entries = [...todo.entries()];
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(async ([h, de]) => {
      const en = await translateOne(client, de);
      return [h, { de, en }] as const;
    }));
    for (const r of results) {
      if (r.status === 'fulfilled') cache[r.value[0]] = r.value[1];
      else process.stderr.write(`  WARN: translation failed: ${r.reason}\n`);
    }
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    process.stderr.write(`  ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}\n`);
  }
  process.stderr.write('Done.\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
