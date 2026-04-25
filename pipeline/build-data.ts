import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';
import { sha1 } from './hash';
import type { RawQuestion, BuiltQuestion } from './types';

type Cache = Record<string, { de: string; en: string }>;
type Overrides = Record<string, string>;

function idOf(q: RawQuestion): string {
  if (q.officialNumber <= 72) return `basis-${q.officialNumber}`;
  return `${q.exam}-${q.officialNumber}`;
}

function examOf(q: RawQuestion): BuiltQuestion['exam'] {
  return q.officialNumber <= 72 ? 'basis' : q.exam;
}

function translate(s: string, cache: Cache, overrides: Overrides): string {
  const h = sha1(s);
  if (h in overrides) return overrides[h]!;
  const hit = cache[h];
  if (!hit) throw new Error(`Missing translation for string: "${s.slice(0, 60)}..." (hash ${h})`);
  return hit.en;
}

function findImage(id: string): string | undefined {
  for (const ext of ['.png', '.jpg', '.jpeg', '.gif']) {
    const path = `public/assets/questions/${id}${ext}`;
    if (existsSync(path)) return `assets/questions/${id}${ext}`;
  }
  return undefined;
}

export function buildQuestions(raw: RawQuestion[], cache: Cache, overrides: Overrides): BuiltQuestion[] {
  const byId = new Map<string, BuiltQuestion>();
  for (const q of raw) {
    const id = idOf(q);
    if (byId.has(id)) continue;
    byId.set(id, {
      id,
      exam: examOf(q),
      category: q.category,
      officialNumber: q.officialNumber,
      image: findImage(id),
      ...(q.isNavigationTask ? { isNavigationTask: true } : {}),
      correctIndex: q.correctIndex,
      de: { question: q.question, answers: q.answers },
      en: {
        question: translate(q.question, cache, overrides),
        answers: q.answers.map(a => translate(a, cache, overrides)),
      },
    });
  }
  return [...byId.values()].sort((a, b) => {
    const order = { basis: 0, binnen: 1, segeln: 2, see: 3 };
    return (order[a.exam] - order[b.exam]) || (a.officialNumber - b.officialNumber);
  });
}

async function main() {
  const raw: RawQuestion[] = JSON.parse(readFileSync('data/raw-parsed.json', 'utf8'));
  const cache: Cache = JSON.parse(readFileSync('data/translations-cache.json', 'utf8'));
  const overrides: Overrides = JSON.parse(readFileSync('data/overrides.json', 'utf8'));
  const built = buildQuestions(raw, cache, overrides);
  writeFileSync('data/questions.json', JSON.stringify(built, null, 2));
  writeFileSync('data/questions-de.json', JSON.stringify(
    built.map(q => ({ id: q.id, de: q.de })), null, 2
  ));
  process.stderr.write(`Wrote data/questions.json (${built.length} questions)\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
