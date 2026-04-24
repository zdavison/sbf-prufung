# SBF Exam Translator — Design

**Date:** 2026-04-24
**Status:** Approved design, pending implementation plan

## Goal

A self-hosted static website that lets the user study for the German SBF-Binnen and SBF-See sailing exams, with English translations revealed alongside each question only *after* it has been answered.

Originally scoped as a Tampermonkey userscript that overlays translations on bootspruefung.de; pivoted to a self-hosted quiz site because the official question catalogs are published by ELWIS under public authority and can be used directly.

## Non-goals

- Accounts, sync, backend services. Pure static site, localStorage only.
- Mobile / responsive layout. Desktop-only.
- Real-time translation at runtime. Translations are precomputed and bundled.
- Coverage of exams beyond SBF-Binnen and SBF-See (no SKS, SRC, UBI, etc.).

## Source of truth

The current official catalog (as of 2026-04) is **August 2023**, published by Generaldirektion Wasserstraßen und Schifffahrt at `elwis.de`. No 2024/2025/2026 revisions exist. The site re-runs the data pipeline whenever ELWIS publishes a new version.

- SBF-Binnen: 300 questions. Basisfragen 1–72, Binnen-specific 73–253, Sailing 254–300.
- SBF-See: 300 questions. Basisfragen 1–72, See-specific 73–285, Navigation tasks 286–300.
- Basisfragen 1–72 are identical across both exams and are stored once.

## Architecture

Two decoupled pieces in one repo:

1. **Data pipeline** — Node.js + TypeScript scripts, run manually by the maintainer. Output checked into git.
2. **Static site** — Vite + Svelte + TypeScript. Reads the pipeline's output JSON at build time. Deployed to GitHub Pages.

```
┌──────────────────┐     ┌────────────────────┐     ┌──────────────────┐
│  ELWIS HTML +    │ ──► │   Data pipeline    │ ──► │  questions.json  │
│  official images │     │ (fetch/parse/trans)│     │  + /assets/*.png │
└──────────────────┘     └────────────────────┘     └────────┬─────────┘
                                                             │ bundled
                                                             ▼
                                                    ┌──────────────────┐
                                                    │   Svelte app     │
                                                    │   (GH Pages)     │
                                                    └──────────────────┘
```

## Data pipeline

Located at `pipeline/` in the repo. Each script is independently runnable.

### Steps

1. **`fetch-elwis.ts`** — downloads the ELWIS HTML pages for Binnen and See. Uses `undici` + `cheerio`. Parses into an intermediate structure: `{ exam, officialNumber, category, question, answers[], correctIndex, imageRef?, isNavigationTask }`. The ELWIS HTML is highly regular; expect ~100 lines of parser code.
2. **`images.ts`** — downloads all official question diagrams into `public/assets/questions/<id>.png`. Skips files already on disk.
3. **`translate.ts`** — sends all unique German strings (questions, answers) to the Claude API in batches. Model: **claude-opus-4-7** (best quality for niche sailing/maritime terminology). Uses prompt caching for the system prompt with glossary. Output keyed by SHA-1 hash of source text so re-runs only translate new/changed strings.
4. **`build-data.ts`** — merges parsed questions + translations into a single `data/questions.json`. Deduplicates Basisfragen (stored once with `exam: "basis"`). Writes a companion `data/questions-de.json` with originals, for diffing against future ELWIS updates.

### Keys

Question ID = `<exam>-<officialNumber>` (e.g. `binnen-147`, `basis-12`). Stable across ELWIS updates as long as numbering stays stable. The raw German text is also hashed so we can detect wording changes.

### Translation prompt

The system prompt gives Claude a short maritime glossary (Backbord → port, Steuerbord → starboard, Kollisionsverhütungsregeln → COLREGs, etc.) so translations stay idiomatic for English-speaking sailors. Cached.

## Data model

`data/questions.json` is a single array:

```ts
type Question = {
  id: string;                      // "binnen-147" | "see-120" | "basis-12"
  exam: 'binnen' | 'see' | 'basis';
  category: string;                // ELWIS section title
  officialNumber: number;          // 1..300 within the exam
  image?: string;                  // relative path under /assets/questions/
  isNavigationTask?: boolean;      // true for see 286-300; display-only
  correctIndex: number;            // index into answers[]; shared by de and en
  de: {
    question: string;
    answers: string[];
  };
  en: {
    question: string;
    answers: string[];             // same length and order as de.answers
  };
};
```

localStorage schema:

```ts
type Progress = Record<string /* question id */, {
  correct: number;
  wrong: number;
  lastSeen: number;                // epoch ms
}>;
```

## Site

### Tech stack

- **Vite + Svelte + TypeScript.** Svelte for minimal runtime and clean reactive UI for a small app. No router — view state is a single reactive variable in `App.svelte`.
- Styling: plain CSS with a small design system (variables for colors + spacing).
- No UI component library.

### Project layout

```
pipeline/
  fetch-elwis.ts
  images.ts
  translate.ts
  build-data.ts
data/
  questions.json           # committed
  questions-de.json        # committed, for diffing
public/
  assets/questions/*.png   # committed
src/
  main.ts
  App.svelte               # top-level view switcher
  lib/
    data.ts                # imports questions.json, helpers (byExam, shuffle, etc.)
    progress.ts            # localStorage read/write
    shuffle.ts
    types.ts
  views/
    Home.svelte            # pick exam + mode
    QuestionView.svelte    # the main study loop
    ExamResults.svelte
    WeakQuestions.svelte
  components/
    QuestionCard.svelte    # German question + shuffled answers
    TranslationPanel.svelte# the right-hand side column
    ProgressBar.svelte
vite.config.ts
package.json
.github/workflows/deploy.yml
```

### Views

- **Home** — pick exam (Binnen / See) and mode (Sequential by category / Shuffle whole exam / Exam simulation 30 random / Review weak questions).
- **QuestionView** — the study loop. Left: `QuestionCard` (German question, optional image, shuffled answers). Right: `TranslationPanel` (blank until answer clicked). Bottom: Next button.
- **ExamResults** — end-of-simulation grade card with the 30 questions and which were right/wrong.
- **WeakQuestions** — list of questions with wrong > correct, sorted worst-first. Clicking starts a QuestionView iteration over them.

### Question flow

1. User lands on `QuestionView` with a queue of question IDs.
2. `QuestionCard` shuffles answer positions (fresh shuffle each display) and shows German.
3. `TranslationPanel` shows a placeholder ("Answer the question to reveal the translation.").
4. On click: the card marks right/wrong, reveals the correct answer with color coding, `progress.ts` writes to localStorage, and `TranslationPanel` fades in with the English question + all English answers in the same shuffled order + correct answer highlighted.
5. Next button → next question in the queue. End of queue → back to Home or to `ExamResults`.

### Navigation tasks (See 286–300)

`isNavigationTask: true` questions render differently in `QuestionView`: no clickable answers, just the question text, any provided chart reference, and the official answer already shown. A "Got it" button advances. No right/wrong counted.

### Modes

- **Sequential by category** — queue is all questions in a chosen category, in official order.
- **Shuffle whole exam** — queue is all questions for the chosen exam (Basisfragen + exam-specific), shuffled.
- **Exam simulation** — 30 random questions drawn per the official exam weighting (7 Basisfragen + 23 exam-specific for Binnen; mirrors the real test). Grading at the end.
- **Review weak questions** — queue pulled from localStorage where `wrong > correct`, worst first.

## Deployment

GitHub Pages via GitHub Actions. The workflow:

1. On push to `main`: `npm ci`, `npm run build`, upload `dist/` as Pages artifact, deploy.
2. Data pipeline is **not** run in CI — it's run locally by the maintainer when ELWIS updates, and the resulting JSON is committed.

## Risks / open items

- **ELWIS HTML structure may drift.** The parser needs clear error messages when an unexpected structure is encountered. `questions-de.json` diffs give early warning of wording changes.
- **Translation quality for ambiguous sailing terms.** Mitigated by the glossary in the translation prompt and the ability to manually override individual translations via an override file (`data/overrides.json`) that `build-data.ts` merges last.
- **Images are hosted by ELWIS under public authority.** Redistribution is fine for the official question diagrams since the catalog is public; no legal risk.
- **Exam simulation weighting** — needs to be verified against the official exam rules before implementation. Placeholder values above may not match the real ratio exactly.

## Out of scope for v1

- User accounts or cross-device sync
- Mobile layout
- Additional certifications (SKS, SRC, UBI)
- AI-generated explanations per question (ELWIS doesn't provide them; could be added later)
- Multi-target-language support (English only for now)
