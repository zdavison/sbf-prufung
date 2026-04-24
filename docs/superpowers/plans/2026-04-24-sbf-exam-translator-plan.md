# SBF Exam Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Read `HANDOFF.md` at the repo root first** — it explains the current progress, sandbox constraints, and which tasks need pre-staged artifacts.

**Goal:** Ship a static Svelte site that quizzes the user on German SBF-Binnen and SBF-See exam questions and reveals English translations only after each question is answered, with a Node/TS data pipeline that scrapes, translates, and bundles the official ELWIS catalog.

**Architecture:** Two decoupled pieces in one repo. The pipeline (`pipeline/*.ts`) is run manually; it produces `data/questions.json` + `public/assets/questions/*.png` which are committed. The Svelte app imports `data/questions.json` at build time and stores progress in `localStorage`. GitHub Actions builds the site and deploys `dist/` to GitHub Pages on every push to `main`.

**Tech Stack:** Node.js 20+, TypeScript (strict), Vite 5, Svelte 5 (runes), Vitest, undici, cheerio, `@anthropic-ai/sdk` (model `claude-opus-4-7`), GitHub Pages / GitHub Actions.

## Progress

- [x] Task 0: Project scaffolding — committed as `72c407b`
- [x] Task 1: Pipeline shared types — committed as `0b7dfed`
- [ ] Task 2–17: pending

See `HANDOFF.md` for sandbox execution notes before picking up Task 2.

---

## File structure

Pipeline (Node, run locally):
- `pipeline/types.ts` — `RawQuestion`, `ParsedExam`, `Translation` shared types.
- `pipeline/parse-elwis.ts` — pure parser: `parseElwisHtml(html, exam)` → `RawQuestion[]`.
- `pipeline/fetch-elwis.ts` — CLI wrapper that downloads HTML via `undici` and calls the parser.
- `pipeline/images.ts` — CLI that downloads referenced images into `public/assets/questions/`.
- `pipeline/translate.ts` — CLI that translates unique strings via Anthropic SDK, caches by SHA-1.
- `pipeline/build-data.ts` — CLI that merges parsed + translated + overrides into `data/questions.json` and `data/questions-de.json`.
- `pipeline/__fixtures__/` — saved ELWIS HTML snapshots used by parser tests.
- `pipeline/*.test.ts` — Vitest unit tests colocated with the module under test.

Data artifacts (committed):
- `data/questions.json`
- `data/questions-de.json`
- `data/overrides.json` (hand-authored translation overrides; starts as `{}`)
- `data/translations-cache.json` (hash → English; committed so re-runs are cheap)
- `public/assets/questions/*.png`

Site (Svelte 5):
- `index.html`
- `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `tsconfig.node.json`
- `src/main.ts`
- `src/app.css` — CSS variables, reset, base layout.
- `src/App.svelte` — view switcher (`home | question | results | weak`) via a reactive `view` variable.
- `src/lib/types.ts` — `Question`, `Progress`, `Queue`, `Mode` types.
- `src/lib/data.ts` — imports `data/questions.json`, exposes `byExam`, `byCategory`, `getQuestion`.
- `src/lib/progress.ts` — `loadProgress`, `recordAnswer`, `weakQuestions`.
- `src/lib/shuffle.ts` — deterministic Fisher-Yates with optional seed.
- `src/lib/simulation.ts` — builds the 30-question exam simulation queue.
- `src/views/Home.svelte`, `src/views/QuestionView.svelte`, `src/views/ExamResults.svelte`, `src/views/WeakQuestions.svelte`.
- `src/components/QuestionCard.svelte`, `src/components/TranslationPanel.svelte`, `src/components/ProgressBar.svelte`.
- `src/lib/*.test.ts` — unit tests for pure lib code.

Deployment:
- `.github/workflows/deploy.yml`

---

## Task 0: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `svelte.config.js`, `index.html`, `.gitignore`, `.nvmrc`, `src/main.ts`, `src/App.svelte`, `src/app.css`, `src/vite-env.d.ts`

- [ ] **Step 1: Initialize package.json**

Create `package.json`:

```json
{
  "name": "sbf-prufung",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit && svelte-check --tsconfig tsconfig.json",
    "pipeline:fetch": "tsx pipeline/fetch-elwis.ts",
    "pipeline:images": "tsx pipeline/images.ts",
    "pipeline:translate": "tsx pipeline/translate.ts",
    "pipeline:build": "tsx pipeline/build-data.ts",
    "pipeline:all": "npm run pipeline:fetch && npm run pipeline:images && npm run pipeline:translate && npm run pipeline:build"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install --save-dev vite @sveltejs/vite-plugin-svelte svelte svelte-check typescript tsx vitest @vitest/ui jsdom @testing-library/svelte @testing-library/jest-dom
npm install --save-dev cheerio undici @anthropic-ai/sdk
npm install --save-dev @types/node
```

Expected: `package.json` and `package-lock.json` updated, `node_modules/` populated.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "svelte", "node"]
  },
  "include": ["src/**/*", "pipeline/**/*", "data/**/*.json"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "composite": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create Vite + Svelte config**

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

Create `svelte.config.js`:

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
};
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Create `src/vite-env.d.ts`:

```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

- [ ] **Step 5: Create `index.html` and entry point**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>SBF Prüfung</title>
    <link rel="stylesheet" href="/src/app.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Create `src/main.ts`:

```ts
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app')! });
export default app;
```

Create `src/App.svelte`:

```svelte
<h1>SBF Prüfung</h1>
<p>Scaffolding ready.</p>
```

Create `src/app.css`:

```css
:root {
  --bg: #fafafa;
  --fg: #111;
  --accent: #0a66c2;
  --correct: #2e7d32;
  --wrong: #c62828;
  --border: #ddd;
  --panel: #fff;
  --gap: 1rem;
  font-family: system-ui, sans-serif;
  color: var(--fg);
  background: var(--bg);
}
body { margin: 0; }
```

- [ ] **Step 6: Create `.gitignore` and `.nvmrc`**

`.gitignore`:

```
node_modules
dist
.env
.env.local
*.log
.DS_Store
```

`.nvmrc`:

```
20
```

- [ ] **Step 7: Verify dev server boots**

Run: `npm run dev`

Expected: Vite prints a local URL and no errors. Stop it with Ctrl-C.

- [ ] **Step 8: Verify typecheck and tests**

Run: `npm run typecheck`
Expected: no errors.

Run: `npm test`
Expected: "No test files found" — exits 0 because we haven't written tests yet (OK for now).

- [ ] **Step 9: Commit scaffolding**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts svelte.config.js index.html .gitignore .nvmrc src/
git commit -m "chore: scaffold Vite + Svelte + TS project"
```

---

## Task 1: Pipeline shared types

**Files:**
- Create: `pipeline/types.ts`

- [ ] **Step 1: Write types**

Create `pipeline/types.ts`:

```ts
export type Exam = 'binnen' | 'see' | 'basis';

export type RawQuestion = {
  exam: Exam;
  officialNumber: number;
  category: string;
  question: string;
  answers: string[];      // raw order as shown in ELWIS; first entry is the correct one.
  correctIndex: number;   // always 0 in ELWIS output — kept explicit in case that changes.
  imageRef?: string;      // URL of image on elwis.de, if any.
  isNavigationTask: boolean;
};

export type Translation = {
  sourceHash: string;     // sha1(de text)
  de: string;
  en: string;
};

export type BuiltQuestion = {
  id: string;
  exam: Exam;
  category: string;
  officialNumber: number;
  image?: string;
  isNavigationTask?: boolean;
  correctIndex: number;
  de: { question: string; answers: string[] };
  en: { question: string; answers: string[] };
};
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/types.ts
git commit -m "feat(pipeline): shared types"
```

---

## Task 2: ELWIS HTML parser

The parser is a pure function `parseElwisHtml(html, exam)` that returns `RawQuestion[]`. We develop it against a saved HTML fixture so tests are deterministic and don't hit the network.

**Files:**
- Create: `pipeline/__fixtures__/elwis-binnen.html`, `pipeline/__fixtures__/elwis-see.html`, `pipeline/parse-elwis.ts`, `pipeline/parse-elwis.test.ts`

- [ ] **Step 1: Capture real ELWIS fixtures**

Manually browse to the ELWIS SBF question catalog pages (Binnen and See) and save the full rendered HTML to:

- `pipeline/__fixtures__/elwis-binnen.html`
- `pipeline/__fixtures__/elwis-see.html`

Inspect the DOM (e.g., open the file in a browser or use `cheerio` in a Node REPL) to identify the repeating question structure. Note down:

- Selector(s) that yield one node per question.
- Where the official number, category heading, question text, and answer list live.
- Where images are referenced (`<img src>` or a link).

Record findings at the top of `parse-elwis.ts` as a short `// DOM map:` comment — 5-10 lines, selectors only.

- [ ] **Step 2: Write the first failing test**

Create `pipeline/parse-elwis.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseElwisHtml } from './parse-elwis';

let binnenHtml: string;
let seeHtml: string;

beforeAll(() => {
  binnenHtml = readFileSync('pipeline/__fixtures__/elwis-binnen.html', 'utf8');
  seeHtml = readFileSync('pipeline/__fixtures__/elwis-see.html', 'utf8');
});

describe('parseElwisHtml', () => {
  it('returns 300 questions for Binnen', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    expect(qs).toHaveLength(300);
  });

  it('returns 300 questions for See', () => {
    const qs = parseElwisHtml(seeHtml, 'see');
    expect(qs).toHaveLength(300);
  });

  it('assigns officialNumber 1..300 in order', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    expect(qs.map(q => q.officialNumber)).toEqual(Array.from({ length: 300 }, (_, i) => i + 1));
  });

  it('every question has exactly 4 answers', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    for (const q of qs) expect(q.answers).toHaveLength(4);
  });

  it('correctIndex is 0 for every question (first answer is correct per ELWIS convention)', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    for (const q of qs) expect(q.correctIndex).toBe(0);
  });

  it('flags navigation tasks for See 286-300', () => {
    const qs = parseElwisHtml(seeHtml, 'see');
    for (const q of qs) {
      const expected = q.officialNumber >= 286 && q.officialNumber <= 300;
      expect(q.isNavigationTask).toBe(expected);
    }
  });

  it('extracts image URLs when present', () => {
    const qs = parseElwisHtml(binnenHtml, 'binnen');
    const withImages = qs.filter(q => q.imageRef);
    expect(withImages.length).toBeGreaterThan(0);
    for (const q of withImages) {
      expect(q.imageRef).toMatch(/^https?:\/\//);
    }
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

Run: `npm test -- parse-elwis`
Expected: FAIL — `parse-elwis` module does not exist.

- [ ] **Step 4: Implement `parseElwisHtml`**

Create `pipeline/parse-elwis.ts`. Use `cheerio` to load the HTML, iterate the question nodes (selectors from Step 1), extract category from the nearest preceding heading, and emit `RawQuestion`.

```ts
import * as cheerio from 'cheerio';
import type { Exam, RawQuestion } from './types';

// DOM map: (fill in from Step 1 — e.g., each question lives in `div.question`,
//   number in `.question-number`, body in `.question-body`, answers in `ol > li`,
//   images in `.question-body img`, category headings in `h2.section-title`.)

export function parseElwisHtml(html: string, exam: Exam): RawQuestion[] {
  const $ = cheerio.load(html);
  const questions: RawQuestion[] = [];
  let currentCategory = '';

  // Walk the document in order so category headings accumulate for following questions.
  $('h2.section-title, div.question').each((_, el) => {
    const $el = $(el);
    if ($el.is('h2.section-title')) {
      currentCategory = $el.text().trim();
      return;
    }

    const officialNumber = parseInt($el.find('.question-number').text().replace(/\D/g, ''), 10);
    const questionText = $el.find('.question-body > p').first().text().trim();
    const answers = $el.find('ol > li').map((_, li) => $(li).text().trim()).get();
    const imageRef = $el.find('.question-body img').attr('src');
    const isNavigationTask = exam === 'see' && officialNumber >= 286 && officialNumber <= 300;

    if (!Number.isFinite(officialNumber) || !questionText || answers.length !== 4) {
      throw new Error(
        `parseElwisHtml: malformed question near officialNumber=${officialNumber}. ` +
        `Got ${answers.length} answers; expected 4. Check the DOM map at the top of parse-elwis.ts.`
      );
    }

    questions.push({
      exam,
      officialNumber,
      category: currentCategory,
      question: questionText,
      answers,
      correctIndex: 0,
      imageRef: imageRef ? new URL(imageRef, 'https://www.elwis.de/').toString() : undefined,
      isNavigationTask,
    });
  });

  return questions;
}
```

> **Important:** the selectors above are the placeholder shape from the design doc. Replace them with the actual selectors you recorded in Step 1. The test suite is the arbiter — tune the selectors until all tests in `parse-elwis.test.ts` pass.

- [ ] **Step 5: Iterate selectors until tests pass**

Run: `npm test -- parse-elwis`

Expected after iteration: PASS (all 7 tests).

- [ ] **Step 6: Commit**

```bash
git add pipeline/types.ts pipeline/parse-elwis.ts pipeline/parse-elwis.test.ts pipeline/__fixtures__/
git commit -m "feat(pipeline): parse ELWIS HTML into RawQuestion[]"
```

---

## Task 3: ELWIS fetcher CLI

**Files:**
- Create: `pipeline/fetch-elwis.ts`, `data/raw-parsed.json` (output, committed)

- [ ] **Step 1: Write the fetcher**

Create `pipeline/fetch-elwis.ts`:

```ts
import { request } from 'undici';
import { writeFileSync } from 'node:fs';
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
```

- [ ] **Step 2: Ensure `data/` exists and run the fetcher**

```bash
mkdir -p data
npm run pipeline:fetch
```

Expected: stderr prints `Fetching binnen... 300 questions`, `Fetching see... 300 questions`, `data/raw-parsed.json` is written (~600 entries).

If it fails because the live HTML differs from the fixtures, re-capture fixtures (Task 2 Step 1) and fix the parser. Do not lower the 300-count assertion in tests — if the catalog version changes, update the spec first.

- [ ] **Step 3: Commit fetcher + first snapshot**

```bash
git add pipeline/fetch-elwis.ts data/raw-parsed.json
git commit -m "feat(pipeline): fetch-elwis CLI + first catalog snapshot"
```

---

## Task 4: Image downloader

**Files:**
- Create: `pipeline/images.ts`

- [ ] **Step 1: Write the downloader**

Create `pipeline/images.ts`:

```ts
import { request } from 'undici';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import type { RawQuestion } from './types';

const OUT_DIR = 'public/assets/questions';

function idOf(q: RawQuestion): string {
  // Basisfragen 1-72 are identical across exams; store once under "basis".
  if (q.officialNumber <= 72) return `basis-${q.officialNumber}`;
  return `${q.exam}-${q.officialNumber}`;
}

async function downloadOne(url: string, dest: string) {
  const res = await request(url);
  if (res.statusCode !== 200) throw new Error(`GET ${url} returned ${res.statusCode}`);
  const buf = Buffer.from(await res.body.arrayBuffer());
  writeFileSync(dest, buf);
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const raw: RawQuestion[] = JSON.parse(readFileSync('data/raw-parsed.json', 'utf8'));
  const seen = new Set<string>();
  let downloaded = 0, skipped = 0;

  for (const q of raw) {
    if (!q.imageRef) continue;
    const id = idOf(q);
    if (seen.has(id)) continue;
    seen.add(id);
    const ext = extname(new URL(q.imageRef).pathname) || '.png';
    const dest = `${OUT_DIR}/${id}${ext}`;
    if (existsSync(dest)) { skipped++; continue; }
    process.stderr.write(`↓ ${id}${ext}\n`);
    await downloadOne(q.imageRef, dest);
    downloaded++;
  }
  process.stderr.write(`Images: ${downloaded} downloaded, ${skipped} already present\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run**

```bash
npm run pipeline:images
```

Expected: a handful to a hundred PNG/JPG files appear under `public/assets/questions/`. Re-running prints `0 downloaded, N already present`.

- [ ] **Step 3: Commit**

```bash
git add pipeline/images.ts public/assets/questions
git commit -m "feat(pipeline): download official question images"
```

---

## Task 5: Translator

**Files:**
- Create: `pipeline/translate.ts`, `pipeline/hash.ts`, `pipeline/hash.test.ts`, `data/translations-cache.json` (starts `{}`)

- [ ] **Step 1: Hash helper + test**

Create `pipeline/hash.ts`:

```ts
import { createHash } from 'node:crypto';
export const sha1 = (s: string) => createHash('sha1').update(s, 'utf8').digest('hex');
```

Create `pipeline/hash.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sha1 } from './hash';

describe('sha1', () => {
  it('is stable and 40 chars', () => {
    expect(sha1('hello')).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
    expect(sha1('hello')).toHaveLength(40);
  });
  it('differs on different input', () => {
    expect(sha1('a')).not.toBe(sha1('b'));
  });
});
```

- [ ] **Step 2: Run hash tests**

Run: `npm test -- hash`
Expected: PASS.

- [ ] **Step 3: Initialize empty cache**

```bash
echo '{}' > data/translations-cache.json
```

- [ ] **Step 4: Write the translator**

Create `pipeline/translate.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { sha1 } from './hash';
import type { RawQuestion } from './types';

const MODEL = 'claude-opus-4-7';
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

  // Collect every unique source string (questions + answers).
  const todo = new Map<string, string>(); // hash → de
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
    const results = await Promise.all(batch.map(async ([h, de]) => {
      const en = await translateOne(client, de);
      return [h, { de, en }] as const;
    }));
    for (const [h, v] of results) cache[h] = v;
    // Checkpoint after each batch so an interrupt doesn't lose progress.
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    process.stderr.write(`  ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}\n`);
  }
  process.stderr.write('Done.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 5: Run translator**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run pipeline:translate
```

Expected: stderr shows `Translating N new strings`, then progress, then `Done.`. `data/translations-cache.json` grows to cover every unique German string. Re-running prints `Translating 0 new strings`.

Spot-check 10 random entries by opening the cache — translations should be idiomatic and preserve numbers.

- [ ] **Step 6: Commit**

```bash
git add pipeline/hash.ts pipeline/hash.test.ts pipeline/translate.ts data/translations-cache.json
git commit -m "feat(pipeline): Claude-based translator with hash-keyed cache"
```

---

## Task 6: Data builder

Merges `raw-parsed.json` + `translations-cache.json` + optional `overrides.json` into the final `data/questions.json`, deduplicating Basisfragen.

**Files:**
- Create: `pipeline/build-data.ts`, `pipeline/build-data.test.ts`, `data/overrides.json`

- [ ] **Step 1: Create empty overrides file**

```bash
echo '{}' > data/overrides.json
```

(Overrides are `Record<sha1, string>` — hand-edited English that wins over Claude's translation.)

- [ ] **Step 2: Write failing tests**

Create `pipeline/build-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildQuestions } from './build-data';
import type { RawQuestion } from './types';
import { sha1 } from './hash';

const mkRaw = (exam: 'binnen' | 'see', n: number, q: string, a: string[]): RawQuestion => ({
  exam, officialNumber: n, category: 'Test',
  question: q, answers: a, correctIndex: 0, isNavigationTask: false,
});

describe('buildQuestions', () => {
  it('assigns basis- ids to officialNumber <= 72 and deduplicates across exams', () => {
    const raw = [
      mkRaw('binnen', 1, 'Was ist Backbord?', ['links', 'rechts', 'oben', 'unten']),
      mkRaw('see', 1, 'Was ist Backbord?', ['links', 'rechts', 'oben', 'unten']),
      mkRaw('binnen', 73, 'Binnen-spezifisch', ['a', 'b', 'c', 'd']),
    ];
    const cache = Object.fromEntries(
      ['Was ist Backbord?', 'links', 'rechts', 'oben', 'unten', 'Binnen-spezifisch', 'a', 'b', 'c', 'd']
        .map(s => [sha1(s), { de: s, en: `EN:${s}` }])
    );
    const built = buildQuestions(raw, cache, {});
    const ids = built.map(b => b.id).sort();
    expect(ids).toEqual(['basis-1', 'binnen-73']);
  });

  it('applies overrides by hash', () => {
    const raw = [mkRaw('binnen', 73, 'Hallo', ['a', 'b', 'c', 'd'])];
    const cache = Object.fromEntries(
      ['Hallo', 'a', 'b', 'c', 'd'].map(s => [sha1(s), { de: s, en: `EN:${s}` }])
    );
    const overrides = { [sha1('Hallo')]: 'Hello (override)' };
    const built = buildQuestions(raw, cache, overrides);
    expect(built[0].en.question).toBe('Hello (override)');
  });

  it('throws if any string is missing from cache', () => {
    const raw = [mkRaw('binnen', 73, 'Untranslated', ['a', 'b', 'c', 'd'])];
    expect(() => buildQuestions(raw, {}, {})).toThrow(/Untranslated/);
  });
});
```

- [ ] **Step 3: Run test — expect fail**

Run: `npm test -- build-data`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement**

Create `pipeline/build-data.ts`:

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
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
  if (overrides[h]) return overrides[h];
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
    if (byId.has(id)) continue; // Basisfragen dedupe — first wins (binnen comes before see in raw).
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
    const order = { basis: 0, binnen: 1, see: 2 };
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

// Run main only when invoked as a script, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1); });
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- build-data`
Expected: PASS (all 3 tests).

- [ ] **Step 6: Run the builder**

```bash
npm run pipeline:build
```

Expected: `data/questions.json` produced with 300 + 228 = 528 questions (72 basis + 228 binnen-specific + 228 see-specific). Exact numbers depend on the live catalog; confirm 300 Binnen + 300 See after merge minus 72 dedup = 528.

- [ ] **Step 7: Commit**

```bash
git add pipeline/build-data.ts pipeline/build-data.test.ts data/overrides.json data/questions.json data/questions-de.json
git commit -m "feat(pipeline): merge parsed + translated + overrides into questions.json"
```

---

## Task 7: Site — shared types and data helpers

**Files:**
- Create: `src/lib/types.ts`, `src/lib/data.ts`, `src/lib/data.test.ts`

- [ ] **Step 1: Site types**

Create `src/lib/types.ts`:

```ts
export type Exam = 'binnen' | 'see';
export type QuestionExam = Exam | 'basis';

export type Question = {
  id: string;
  exam: QuestionExam;
  category: string;
  officialNumber: number;
  image?: string;
  isNavigationTask?: boolean;
  correctIndex: number;
  de: { question: string; answers: string[] };
  en: { question: string; answers: string[] };
};

export type Mode = 'sequential' | 'shuffle' | 'simulation' | 'weak';

export type Progress = Record<string, {
  correct: number;
  wrong: number;
  lastSeen: number;
}>;
```

- [ ] **Step 2: Write failing tests for data helpers**

Create `src/lib/data.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Question } from './types';

vi.mock('../../data/questions.json', () => ({
  default: [
    { id: 'basis-1', exam: 'basis', category: 'A', officialNumber: 1, correctIndex: 0,
      de: { question: 'dq1', answers: ['d1','d2','d3','d4'] },
      en: { question: 'eq1', answers: ['e1','e2','e3','e4'] } },
    { id: 'binnen-73', exam: 'binnen', category: 'B', officialNumber: 73, correctIndex: 0,
      de: { question: 'dq2', answers: ['d1','d2','d3','d4'] },
      en: { question: 'eq2', answers: ['e1','e2','e3','e4'] } },
    { id: 'see-73', exam: 'see', category: 'C', officialNumber: 73, correctIndex: 0,
      de: { question: 'dq3', answers: ['d1','d2','d3','d4'] },
      en: { question: 'eq3', answers: ['e1','e2','e3','e4'] } },
  ] satisfies Question[],
}));

import { byExam, byCategory, getQuestion, allCategories } from './data';

describe('data helpers', () => {
  it('byExam("binnen") returns basis + binnen questions, in officialNumber order', () => {
    const qs = byExam('binnen');
    expect(qs.map(q => q.id)).toEqual(['basis-1', 'binnen-73']);
  });
  it('byExam("see") returns basis + see questions', () => {
    const qs = byExam('see');
    expect(qs.map(q => q.id)).toEqual(['basis-1', 'see-73']);
  });
  it('byCategory groups questions', () => {
    const map = byCategory('binnen');
    expect([...map.keys()]).toEqual(['A', 'B']);
    expect(map.get('A')!.map(q => q.id)).toEqual(['basis-1']);
  });
  it('getQuestion looks up by id', () => {
    expect(getQuestion('basis-1')?.de.question).toBe('dq1');
    expect(getQuestion('missing')).toBeUndefined();
  });
  it('allCategories returns deduped list for an exam', () => {
    expect(allCategories('binnen')).toEqual(['A', 'B']);
  });
});
```

- [ ] **Step 3: Implement `data.ts`**

Create `src/lib/data.ts`:

```ts
import raw from '../../data/questions.json';
import type { Question, Exam } from './types';

const all = raw as Question[];
const byId = new Map(all.map(q => [q.id, q]));

export function byExam(exam: Exam): Question[] {
  return all.filter(q => q.exam === 'basis' || q.exam === exam)
            .sort((a, b) => a.officialNumber - b.officialNumber);
}

export function byCategory(exam: Exam): Map<string, Question[]> {
  const map = new Map<string, Question[]>();
  for (const q of byExam(exam)) {
    const list = map.get(q.category) ?? [];
    list.push(q);
    map.set(q.category, list);
  }
  return map;
}

export function allCategories(exam: Exam): string[] {
  return [...byCategory(exam).keys()];
}

export function getQuestion(id: string): Question | undefined {
  return byId.get(id);
}

export function allQuestions(): Question[] {
  return all;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- data`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data.ts src/lib/data.test.ts
git commit -m "feat(site): shared types and data helpers"
```

---

## Task 8: Progress (localStorage)

**Files:**
- Create: `src/lib/progress.ts`, `src/lib/progress.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/progress.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress, recordAnswer, weakQuestions, resetProgress, STORAGE_KEY } from './progress';

beforeEach(() => localStorage.clear());

describe('progress', () => {
  it('loadProgress returns {} for empty storage', () => {
    expect(loadProgress()).toEqual({});
  });

  it('recordAnswer increments correct/wrong and updates lastSeen', () => {
    recordAnswer('q1', true);
    recordAnswer('q1', true);
    recordAnswer('q1', false);
    const p = loadProgress();
    expect(p['q1'].correct).toBe(2);
    expect(p['q1'].wrong).toBe(1);
    expect(p['q1'].lastSeen).toBeGreaterThan(0);
  });

  it('weakQuestions returns ids with wrong > correct, worst first', () => {
    recordAnswer('q1', false); recordAnswer('q1', false); recordAnswer('q1', true);
    recordAnswer('q2', false); recordAnswer('q2', true);   // tie; not weak
    recordAnswer('q3', false); recordAnswer('q3', false); recordAnswer('q3', false);
    const weak = weakQuestions();
    expect(weak).toEqual(['q3', 'q1']);
  });

  it('resetProgress clears storage', () => {
    recordAnswer('q1', true);
    resetProgress();
    expect(loadProgress()).toEqual({});
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('survives a corrupt storage payload', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadProgress()).toEqual({});
  });
});
```

- [ ] **Step 2: Implement**

Create `src/lib/progress.ts`:

```ts
import type { Progress } from './types';

export const STORAGE_KEY = 'sbf.progress.v1';

export function loadProgress(): Progress {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Progress;
  } catch {
    return {};
  }
}

function save(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function recordAnswer(id: string, correct: boolean): void {
  const p = loadProgress();
  const entry = p[id] ?? { correct: 0, wrong: 0, lastSeen: 0 };
  if (correct) entry.correct += 1; else entry.wrong += 1;
  entry.lastSeen = Date.now();
  p[id] = entry;
  save(p);
}

export function weakQuestions(): string[] {
  const p = loadProgress();
  return Object.entries(p)
    .filter(([, v]) => v.wrong > v.correct)
    .sort((a, b) => (b[1].wrong - b[1].correct) - (a[1].wrong - a[1].correct))
    .map(([id]) => id);
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- progress`
Expected: PASS (all 5).

- [ ] **Step 4: Commit**

```bash
git add src/lib/progress.ts src/lib/progress.test.ts
git commit -m "feat(site): localStorage-backed progress"
```

---

## Task 9: Shuffle and simulation helpers

**Files:**
- Create: `src/lib/shuffle.ts`, `src/lib/shuffle.test.ts`, `src/lib/simulation.ts`, `src/lib/simulation.test.ts`

- [ ] **Step 1: Shuffle test**

Create `src/lib/shuffle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('returns a new array with same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic with a seed', () => {
    const a = shuffle([1, 2, 3, 4, 5], 42);
    const b = shuffle([1, 2, 3, 4, 5], 42);
    expect(a).toEqual(b);
  });

  it('varies without a seed', () => {
    // Not a strict test, but over 20 runs at least one ordering should change.
    const base = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const differs = Array.from({ length: 20 }, () => shuffle([1,2,3,4,5,6,7,8,9,10]))
      .some(r => r.join() !== base.join());
    expect(differs).toBe(true);
  });
});
```

- [ ] **Step 2: Implement shuffle**

Create `src/lib/shuffle.ts`:

```ts
// Mulberry32 PRNG for deterministic testing.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], seed?: number): T[] {
  const rand = seed === undefined ? Math.random : mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

- [ ] **Step 3: Run**

Run: `npm test -- shuffle`
Expected: PASS.

- [ ] **Step 4: Simulation test**

Create `src/lib/simulation.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Question } from './types';

const fakeQuestions: Question[] = [
  ...Array.from({ length: 72 }, (_, i) => makeQ('basis', i + 1)),
  ...Array.from({ length: 228 }, (_, i) => makeQ('binnen', i + 73)),
  ...Array.from({ length: 228 }, (_, i) => makeQ('see', i + 73)),
];
function makeQ(exam: 'basis' | 'binnen' | 'see', n: number): Question {
  return {
    id: `${exam}-${n}`, exam, category: 'X', officialNumber: n, correctIndex: 0,
    de: { question: 'd', answers: ['a', 'b', 'c', 'd'] },
    en: { question: 'e', answers: ['a', 'b', 'c', 'd'] },
  };
}

vi.mock('./data', () => ({
  byExam: (exam: 'binnen' | 'see') =>
    fakeQuestions.filter(q => q.exam === 'basis' || q.exam === exam),
}));

import { buildSimulation } from './simulation';

describe('buildSimulation', () => {
  it('returns 30 questions for binnen with 7 basis + 23 binnen', () => {
    const q = buildSimulation('binnen');
    expect(q).toHaveLength(30);
    expect(q.filter(x => x.exam === 'basis')).toHaveLength(7);
    expect(q.filter(x => x.exam === 'binnen')).toHaveLength(23);
  });
  it('returns 30 questions for see with 7 basis + 23 see', () => {
    const q = buildSimulation('see');
    expect(q).toHaveLength(30);
    expect(q.filter(x => x.exam === 'basis')).toHaveLength(7);
    expect(q.filter(x => x.exam === 'see')).toHaveLength(23);
  });
  it('ids are unique within a simulation', () => {
    const q = buildSimulation('binnen');
    expect(new Set(q.map(x => x.id)).size).toBe(30);
  });
});
```

- [ ] **Step 5: Implement simulation**

> **Open item:** The design doc flags the 7/23 split as a placeholder that should be verified against the official exam rules. Implement with 7/23 now; revisit if the maintainer confirms different numbers. Update `buildSimulation` and its test together if so.

Create `src/lib/simulation.ts`:

```ts
import type { Exam, Question } from './types';
import { byExam } from './data';
import { shuffle } from './shuffle';

export const SIM_SIZE = 30;
export const SIM_BASIS_COUNT = 7;
export const SIM_SPECIFIC_COUNT = SIM_SIZE - SIM_BASIS_COUNT;

export function buildSimulation(exam: Exam): Question[] {
  const all = byExam(exam);
  const basis = all.filter(q => q.exam === 'basis');
  const specific = all.filter(q => q.exam === exam);
  return shuffle([
    ...shuffle(basis).slice(0, SIM_BASIS_COUNT),
    ...shuffle(specific).slice(0, SIM_SPECIFIC_COUNT),
  ]);
}
```

- [ ] **Step 6: Run**

Run: `npm test -- simulation`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shuffle.ts src/lib/shuffle.test.ts src/lib/simulation.ts src/lib/simulation.test.ts
git commit -m "feat(site): shuffle + exam simulation helpers"
```

---

## Task 10: App shell and Home view

**Files:**
- Modify: `src/App.svelte`
- Create: `src/views/Home.svelte`

- [ ] **Step 1: Rewrite `App.svelte` as a view switcher**

Replace `src/App.svelte`:

```svelte
<script lang="ts">
  import Home from './views/Home.svelte';
  import QuestionView from './views/QuestionView.svelte';
  import ExamResults from './views/ExamResults.svelte';
  import WeakQuestions from './views/WeakQuestions.svelte';
  import type { Exam, Mode, Question } from './lib/types';

  type View =
    | { name: 'home' }
    | { name: 'question'; queue: Question[]; mode: Mode; exam: Exam }
    | { name: 'results'; queue: Question[]; answers: Record<string, boolean>; exam: Exam }
    | { name: 'weak' };

  let view = $state<View>({ name: 'home' });

  function start(exam: Exam, mode: Mode, queue: Question[]) {
    view = { name: 'question', queue, mode, exam };
  }
  function goHome() { view = { name: 'home' }; }
  function goResults(queue: Question[], answers: Record<string, boolean>, exam: Exam) {
    view = { name: 'results', queue, answers, exam };
  }
  function goWeak() { view = { name: 'weak' }; }
</script>

<main>
  {#if view.name === 'home'}
    <Home onStart={start} onWeak={goWeak} />
  {:else if view.name === 'question'}
    <QuestionView
      queue={view.queue}
      mode={view.mode}
      exam={view.exam}
      onFinish={(answers) =>
        view.name === 'question' && view.mode === 'simulation'
          ? goResults(view.queue, answers, view.exam)
          : goHome()}
      onCancel={goHome} />
  {:else if view.name === 'results'}
    <ExamResults queue={view.queue} answers={view.answers} exam={view.exam} onHome={goHome} />
  {:else if view.name === 'weak'}
    <WeakQuestions onStart={start} onBack={goHome} />
  {/if}
</main>

<style>
  main { max-width: 1100px; margin: 0 auto; padding: 2rem; }
</style>
```

- [ ] **Step 2: Create Home**

Create `src/views/Home.svelte`:

```svelte
<script lang="ts">
  import type { Exam, Mode, Question } from '../lib/types';
  import { byExam, allCategories } from '../lib/data';
  import { shuffle } from '../lib/shuffle';
  import { buildSimulation } from '../lib/simulation';

  let { onStart, onWeak } = $props<{
    onStart: (exam: Exam, mode: Mode, queue: Question[]) => void;
    onWeak: () => void;
  }>();

  let exam = $state<Exam>('binnen');
  let category = $state<string>('');

  const categories = $derived(allCategories(exam));

  function startSequential() {
    const queue = category
      ? byExam(exam).filter(q => q.category === category)
      : byExam(exam);
    onStart(exam, 'sequential', queue);
  }
  function startShuffle() { onStart(exam, 'shuffle', shuffle(byExam(exam))); }
  function startSimulation() { onStart(exam, 'simulation', buildSimulation(exam)); }
</script>

<h1>SBF Prüfung Trainer</h1>

<section class="panel">
  <label>
    Exam:
    <select bind:value={exam}>
      <option value="binnen">SBF-Binnen</option>
      <option value="see">SBF-See</option>
    </select>
  </label>
</section>

<section class="panel">
  <h2>Sequential by category</h2>
  <label>
    Category:
    <select bind:value={category}>
      <option value="">— all categories —</option>
      {#each categories as c}
        <option value={c}>{c}</option>
      {/each}
    </select>
  </label>
  <button onclick={startSequential}>Start</button>
</section>

<section class="panel">
  <h2>Shuffle whole exam</h2>
  <button onclick={startShuffle}>Start</button>
</section>

<section class="panel">
  <h2>Exam simulation (30 random)</h2>
  <button onclick={startSimulation}>Start</button>
</section>

<section class="panel">
  <h2>Review weak questions</h2>
  <button onclick={onWeak}>Open</button>
</section>

<style>
  .panel {
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
    border-radius: 4px;
  }
  button {
    background: var(--accent);
    color: white;
    border: 0;
    padding: 0.5rem 1rem;
    border-radius: 3px;
    cursor: pointer;
    margin-top: 0.75rem;
  }
  label { display: block; margin-bottom: 0.5rem; }
</style>
```

- [ ] **Step 3: Stub the remaining views so the app compiles**

Create `src/views/QuestionView.svelte`:

```svelte
<script lang="ts">
  import type { Exam, Mode, Question } from '../lib/types';
  let { queue, mode, exam, onFinish, onCancel } = $props<{
    queue: Question[]; mode: Mode; exam: Exam;
    onFinish: (answers: Record<string, boolean>) => void;
    onCancel: () => void;
  }>();
</script>
<p>QuestionView stub — {queue.length} questions, mode {mode}, exam {exam}</p>
<button onclick={onCancel}>Back</button>
```

Create `src/views/ExamResults.svelte`:

```svelte
<script lang="ts">
  import type { Exam, Question } from '../lib/types';
  let { queue, answers, exam, onHome } = $props<{
    queue: Question[]; answers: Record<string, boolean>; exam: Exam; onHome: () => void;
  }>();
</script>
<p>ExamResults stub</p>
<button onclick={onHome}>Home</button>
```

Create `src/views/WeakQuestions.svelte`:

```svelte
<script lang="ts">
  import type { Exam, Mode, Question } from '../lib/types';
  let { onStart, onBack } = $props<{
    onStart: (exam: Exam, mode: Mode, queue: Question[]) => void;
    onBack: () => void;
  }>();
</script>
<p>WeakQuestions stub</p>
<button onclick={onBack}>Back</button>
```

- [ ] **Step 4: Run dev server and click through Home**

Run: `npm run dev`, open the URL, verify you can pick an exam, pick a category, and click "Start" — it should navigate to the `QuestionView` stub and back.

Then: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte src/views/
git commit -m "feat(site): app shell + Home view"
```

---

## Task 11: QuestionCard component

The card renders German question + image + 4 answer buttons (in a freshly shuffled order per display). Clicking an answer locks it and reports which index was chosen.

**Files:**
- Create: `src/components/QuestionCard.svelte`

- [ ] **Step 1: Implement**

Create `src/components/QuestionCard.svelte`:

```svelte
<script lang="ts">
  import type { Question } from '../lib/types';
  import { shuffle } from '../lib/shuffle';

  let { question, onAnswer } = $props<{
    question: Question;
    onAnswer: (outcome: { correct: boolean; displayOrder: number[] }) => void;
  }>();

  // Fresh shuffle of indices [0,1,2,3] for every new question.
  let displayOrder = $state<number[]>(shuffle([0, 1, 2, 3]));
  let picked = $state<number | null>(null);

  $effect(() => {
    // Reset local state when a new question is passed in.
    question.id; // track dep
    displayOrder = shuffle([0, 1, 2, 3]);
    picked = null;
  });

  function choose(originalIndex: number) {
    if (picked !== null) return;
    picked = originalIndex;
    onAnswer({ correct: originalIndex === question.correctIndex, displayOrder });
  }
</script>

<article class="card">
  <h2>Frage {question.officialNumber}</h2>
  <p class="question">{question.de.question}</p>
  {#if question.image}
    <img src={question.image} alt="Diagramm Frage {question.officialNumber}" />
  {/if}
  <ol class="answers">
    {#each displayOrder as origIdx}
      <li>
        <button
          type="button"
          class:picked={picked === origIdx}
          class:correct={picked !== null && origIdx === question.correctIndex}
          class:wrong={picked === origIdx && origIdx !== question.correctIndex}
          disabled={picked !== null}
          onclick={() => choose(origIdx)}>
          {question.de.answers[origIdx]}
        </button>
      </li>
    {/each}
  </ol>
</article>

<style>
  .card { background: var(--panel); border: 1px solid var(--border); padding: 1.25rem; border-radius: 4px; }
  .question { font-size: 1.15rem; line-height: 1.5; }
  img { max-width: 100%; margin: 1rem 0; border: 1px solid var(--border); }
  .answers { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
  button {
    width: 100%; text-align: left;
    padding: 0.75rem 1rem; background: #fff; border: 1px solid var(--border);
    border-radius: 3px; cursor: pointer; font: inherit;
  }
  button:disabled { cursor: default; }
  button.picked { border-width: 2px; }
  button.correct { background: #e7f3e8; border-color: var(--correct); }
  button.wrong { background: #fbe7e7; border-color: var(--wrong); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuestionCard.svelte
git commit -m "feat(site): QuestionCard component"
```

---

## Task 12: TranslationPanel component

**Files:**
- Create: `src/components/TranslationPanel.svelte`

- [ ] **Step 1: Implement**

Create `src/components/TranslationPanel.svelte`:

```svelte
<script lang="ts">
  import type { Question } from '../lib/types';

  let { question, revealed, displayOrder } = $props<{
    question: Question;
    revealed: boolean;
    displayOrder: number[];  // same shuffled order as QuestionCard
  }>();
</script>

<aside class="panel">
  <h3>English</h3>
  {#if !revealed}
    <p class="placeholder">Answer the question to reveal the translation.</p>
  {:else}
    <p class="question">{question.en.question}</p>
    <ol class="answers">
      {#each displayOrder as origIdx}
        <li class:correct={origIdx === question.correctIndex}>
          {question.en.answers[origIdx]}
        </li>
      {/each}
    </ol>
  {/if}
</aside>

<style>
  .panel {
    background: var(--panel); border: 1px solid var(--border); padding: 1.25rem;
    border-radius: 4px; min-height: 200px;
  }
  .placeholder { color: #888; font-style: italic; }
  .answers { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
  li { padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 3px; }
  li.correct { border-color: var(--correct); background: #e7f3e8; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TranslationPanel.svelte
git commit -m "feat(site): TranslationPanel component"
```

---

## Task 13: QuestionView — the study loop

Wires QuestionCard + TranslationPanel, records progress, advances through the queue, handles navigation tasks (no scoring).

**Files:**
- Modify: `src/views/QuestionView.svelte`
- Create: `src/components/ProgressBar.svelte`

- [ ] **Step 1: ProgressBar**

Create `src/components/ProgressBar.svelte`:

```svelte
<script lang="ts">
  let { current, total } = $props<{ current: number; total: number }>();
  const pct = $derived(Math.round((current / total) * 100));
</script>
<div class="bar" aria-label="Progress">
  <div class="fill" style="width: {pct}%"></div>
  <span class="text">{current} / {total}</span>
</div>
<style>
  .bar { position: relative; background: #eee; height: 24px; border-radius: 12px; overflow: hidden; margin: 0 0 1rem; }
  .fill { background: var(--accent); height: 100%; transition: width .2s; }
  .text { position: absolute; inset: 0; display: grid; place-items: center; font-size: 0.85rem; color: #222; }
</style>
```

- [ ] **Step 2: QuestionView (replaces the stub)**

Replace `src/views/QuestionView.svelte`:

```svelte
<script lang="ts">
  import type { Exam, Mode, Question } from '../lib/types';
  import QuestionCard from '../components/QuestionCard.svelte';
  import TranslationPanel from '../components/TranslationPanel.svelte';
  import ProgressBar from '../components/ProgressBar.svelte';
  import { recordAnswer } from '../lib/progress';

  let { queue, mode, exam, onFinish, onCancel } = $props<{
    queue: Question[]; mode: Mode; exam: Exam;
    onFinish: (answers: Record<string, boolean>) => void;
    onCancel: () => void;
  }>();

  let index = $state(0);
  let revealed = $state(false);
  let displayOrder = $state<number[]>([0, 1, 2, 3]);
  let answers = $state<Record<string, boolean>>({});
  const current = $derived(queue[index]);

  function onCardAnswer(outcome: { correct: boolean; displayOrder: number[] }) {
    revealed = true;
    displayOrder = outcome.displayOrder;
    answers[current.id] = outcome.correct;
    if (mode !== 'simulation') {
      // Navigation tasks are not scored even outside simulation.
      if (!current.isNavigationTask) recordAnswer(current.id, outcome.correct);
    } else {
      recordAnswer(current.id, outcome.correct);
    }
  }

  function onNavAck() {
    revealed = true;
    answers[current.id] = true;
  }

  function next() {
    if (index + 1 >= queue.length) { onFinish(answers); return; }
    index += 1;
    revealed = false;
    displayOrder = [0, 1, 2, 3];
  }
</script>

<ProgressBar current={index + 1} total={queue.length} />

{#if current.isNavigationTask}
  <article class="nav-task">
    <h2>Frage {current.officialNumber} — Navigationsaufgabe</h2>
    <p>{current.de.question}</p>
    {#if current.image}<img src={current.image} alt="Chart {current.officialNumber}" />{/if}
    <div class="official-answer">
      <h3>Offizielle Lösung</h3>
      <p>{current.de.answers[current.correctIndex]}</p>
    </div>
    {#if !revealed}
      <button onclick={onNavAck}>Got it</button>
    {/if}
  </article>
  {#if revealed}
    <TranslationPanel question={current} revealed={true} displayOrder={[current.correctIndex]} />
  {/if}
{:else}
  <div class="split">
    <QuestionCard question={current} onAnswer={onCardAnswer} />
    <TranslationPanel question={current} {revealed} {displayOrder} />
  </div>
{/if}

<div class="actions">
  <button class="secondary" onclick={onCancel}>Back to menu</button>
  {#if revealed}
    <button class="primary" onclick={next}>
      {index + 1 >= queue.length ? 'Finish' : 'Next'}
    </button>
  {/if}
</div>

<style>
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); align-items: start; }
  .nav-task { background: var(--panel); border: 1px solid var(--border); padding: 1.25rem; border-radius: 4px; }
  .nav-task img { max-width: 100%; margin: 1rem 0; }
  .official-answer { margin-top: 1rem; padding: 0.75rem 1rem; background: #f3f8f4; border-left: 3px solid var(--correct); }
  .actions { display: flex; justify-content: space-between; margin-top: var(--gap); }
  button { padding: 0.6rem 1.2rem; border-radius: 3px; border: 0; cursor: pointer; font: inherit; }
  button.primary { background: var(--accent); color: #fff; }
  button.secondary { background: transparent; border: 1px solid var(--border); }
</style>
```

- [ ] **Step 3: Smoke-test in the browser**

Run: `npm run dev`

Click through:
1. Home → Binnen, pick a category, Start.
2. Click an answer. Correct answer highlights green. Translation panel fades in.
3. Click Next. Progress bar advances. Fresh question shows with a fresh answer shuffle and no revealed translation.
4. Back to menu works mid-queue.
5. Pick "Shuffle whole exam" — confirm non-sequential question numbers.
6. Pick "Exam simulation" — the queue has 30 items.

If the app has unstored localStorage progress, open DevTools → Application → Local Storage and confirm `sbf.progress.v1` updates.

Then `npm run typecheck` — no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProgressBar.svelte src/views/QuestionView.svelte
git commit -m "feat(site): QuestionView study loop"
```

---

## Task 14: ExamResults view

**Files:**
- Modify: `src/views/ExamResults.svelte`

- [ ] **Step 1: Replace the stub**

Replace `src/views/ExamResults.svelte`:

```svelte
<script lang="ts">
  import type { Exam, Question } from '../lib/types';
  let { queue, answers, exam, onHome } = $props<{
    queue: Question[]; answers: Record<string, boolean>; exam: Exam; onHome: () => void;
  }>();
  const correctCount = $derived(queue.filter(q => answers[q.id]).length);
  // SBF passing grade: at least 24 of 30 correct.
  const passed = $derived(correctCount >= 24);
</script>

<h1>Exam Simulation — {exam.toUpperCase()}</h1>
<p class="grade" class:pass={passed} class:fail={!passed}>
  {correctCount} / {queue.length} correct — {passed ? 'Bestanden' : 'Nicht bestanden'}
</p>

<ol class="review">
  {#each queue as q}
    <li class:correct={answers[q.id]} class:wrong={!answers[q.id]}>
      <span class="num">{q.officialNumber}</span>
      <span class="text">{q.de.question}</span>
      <span class="mark">{answers[q.id] ? '✓' : '✗'}</span>
    </li>
  {/each}
</ol>

<button onclick={onHome}>Back to menu</button>

<style>
  .grade { font-size: 1.4rem; padding: 1rem; border-radius: 4px; }
  .grade.pass { background: #e7f3e8; color: var(--correct); }
  .grade.fail { background: #fbe7e7; color: var(--wrong); }
  .review { list-style: none; padding: 0; }
  .review li { display: grid; grid-template-columns: 3rem 1fr 2rem; gap: 0.5rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); align-items: center; }
  .review li.correct .mark { color: var(--correct); }
  .review li.wrong .mark { color: var(--wrong); }
  button { margin-top: 1rem; padding: 0.6rem 1.2rem; background: var(--accent); color: #fff; border: 0; border-radius: 3px; cursor: pointer; }
</style>
```

- [ ] **Step 2: Smoke-test**

Run: `npm run dev`. Start an exam simulation, click through all 30 questions, verify the results page shows the count and ticks.

- [ ] **Step 3: Commit**

```bash
git add src/views/ExamResults.svelte
git commit -m "feat(site): ExamResults view with pass/fail"
```

---

## Task 15: WeakQuestions view

**Files:**
- Modify: `src/views/WeakQuestions.svelte`

- [ ] **Step 1: Replace the stub**

Replace `src/views/WeakQuestions.svelte`:

```svelte
<script lang="ts">
  import type { Exam, Mode, Question } from '../lib/types';
  import { weakQuestions, loadProgress } from '../lib/progress';
  import { getQuestion } from '../lib/data';

  let { onStart, onBack } = $props<{
    onStart: (exam: Exam, mode: Mode, queue: Question[]) => void;
    onBack: () => void;
  }>();

  const progress = loadProgress();
  const weakList = $derived(
    weakQuestions()
      .map(id => getQuestion(id))
      .filter((q): q is Question => !!q)
  );

  function startReview() {
    if (weakList.length === 0) return;
    // Use the dominant exam in the weak set to label the session.
    const counts = weakList.reduce<Record<string, number>>((acc, q) => {
      const key = q.exam === 'basis' ? 'binnen' : q.exam;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const exam = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'binnen') as Exam;
    onStart(exam, 'weak', weakList);
  }
</script>

<h1>Weak questions</h1>
{#if weakList.length === 0}
  <p>No weak questions yet. Answer some wrong and come back!</p>
{:else}
  <p>{weakList.length} questions where wrong answers outnumber correct ones.</p>
  <button onclick={startReview}>Review all</button>
  <ol class="list">
    {#each weakList as q}
      {@const p = progress[q.id]}
      <li>
        <span class="id">{q.id}</span>
        <span class="q">{q.de.question}</span>
        <span class="stats">✓ {p.correct} · ✗ {p.wrong}</span>
      </li>
    {/each}
  </ol>
{/if}
<button class="secondary" onclick={onBack}>Back</button>

<style>
  .list { list-style: none; padding: 0; }
  .list li { display: grid; grid-template-columns: 7rem 1fr 7rem; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid var(--border); }
  .stats { color: #666; font-variant-numeric: tabular-nums; text-align: right; }
  button { padding: 0.6rem 1.2rem; background: var(--accent); color: #fff; border: 0; border-radius: 3px; cursor: pointer; margin-right: 0.5rem; }
  button.secondary { background: transparent; color: inherit; border: 1px solid var(--border); }
</style>
```

- [ ] **Step 2: Smoke-test**

Run: `npm run dev`. Deliberately answer several questions wrong in a row, go to Home → Weak questions, verify they appear. Click "Review all" and confirm you iterate over only those questions.

- [ ] **Step 3: Commit**

```bash
git add src/views/WeakQuestions.svelte
git commit -m "feat(site): WeakQuestions view"
```

---

## Task 16: Production build check

**Files:** none changed

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: `dist/` created with `index.html`, hashed `assets/*.js`, `assets/*.css`, and `assets/questions/*.png` copied from `public/`. No errors.

- [ ] **Step 2: Preview the build**

Run: `npm run preview`

Expected: preview server serves the built site. Click through Home → Start sequential → answer a question — translation reveals and progress persists on reload.

- [ ] **Step 3: Confirm test + typecheck green**

```bash
npm run typecheck
npm test
```

Expected: both pass.

---

## Task 17: GitHub Pages deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Configure repo for Pages**

In GitHub: Repo → Settings → Pages → Source: **GitHub Actions**. (Do this once, in the browser. It cannot be done from the CLI.)

- [ ] **Step 2: Set the Vite base path**

The site will be served from `https://<user>.github.io/<repo>/`. Update `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [svelte()],
  base: process.env.GITHUB_ACTIONS ? '/sbf-prufung/' : './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 3: Write the workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Commit and push**

```bash
git add .github/workflows/deploy.yml vite.config.ts
git commit -m "ci: deploy to GitHub Pages on push to main"
git push origin main
```

- [ ] **Step 5: Verify the deploy**

Watch the Actions tab; once green, visit the Pages URL. Click through all modes end-to-end on the live site.

---

## Risks / open items recap

Carry these forward from the design doc; they're not blocking but need attention:

- **ELWIS selector drift** — parser test suite will fail loudly if the HTML shape changes; re-capture fixtures and adjust selectors.
- **Exam simulation weighting** — the 7/23 split in `simulation.ts` is a placeholder; verify against the official SBF exam rules and update together with its test if different.
- **Translation quality** — Claude's output is cached; use `data/overrides.json` (hash → english) to manually fix bad translations without re-running the whole pipeline.
- **ELWIS catalog update cadence** — when a new catalog lands, re-run `npm run pipeline:all`, diff `data/questions-de.json` against the previous commit to review changes, and commit.
