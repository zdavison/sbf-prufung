# Tampermonkey Translator Userscript — Design

Date: 2026-04-24
Status: Approved (pending user review of written spec)

## Purpose

Provide a Tampermonkey userscript that shows English translations as hover tooltips
on question and answer text at `https://www.bootspruefung.de/quiz/*`. The existing
SBF translation database (`data/questions.json` in this repo, sourced from ELWIS)
supplies the translations — the questions are the same between the two sites.

Goal: a learner practicing on bootspruefung.de can hover any German question or
answer, wait ~500 ms, and see the English version.

## Deliverable

A single userscript file at `userscript/sbf-translate.user.js` in this repo.

## Userscript Metadata

```
// ==UserScript==
// @name         SBF Translator
// @namespace    https://github.com/zdavison/sbf-prufung
// @match        https://www.bootspruefung.de/quiz/*
// @connect      raw.githubusercontent.com
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @version      0.1.0
// ==/UserScript==
```

## Data Source

On load, fetch via `GM_xmlhttpRequest`:

```
https://raw.githubusercontent.com/zdavison/sbf-prufung/main/data/questions.json
```

Parse the JSON array of questions. Each item has `de.question`, `de.answers[]`,
`en.question`, `en.answers[]`.

## Lookup Tables

Build two in-memory maps keyed by **normalized German text**:

- `questionMap`: normalized `de.question` → `en.question`
- `answerMap`: normalized German answer → English answer (for every answer in every question)

**Normalization** (applied both when building the map and when looking up DOM text):

1. Lowercase
2. Trim leading/trailing whitespace
3. Collapse internal whitespace runs to a single space
4. Strip trailing punctuation (`.`, `?`, `!`, `:`, `;`)

Questions and answers are kept in separate maps so a short answer (e.g. "Ja.")
can never accidentally match a long question and vice versa.

## DOM Targeting

Site DOM is not inspectable remotely (JS-rendered) and may change. The script is
therefore **text-driven**, not selector-driven.

1. Install a `MutationObserver` on `document.body` that watches `childList` and
   `subtree` additions.
2. For each added `Element`, walk descendants and identify **candidate leaf
   elements**: elements whose combined text content (trimmed) is non-empty and
   whose children are only text nodes or simple inline markup (no nested
   block-level elements with their own text).
3. Normalize the candidate's text. Look it up in `questionMap`, then `answerMap`.
4. On miss, run a fuzzy match against both maps:
   - Skip entries whose length differs by more than 30%.
   - Compute token Jaccard similarity. Accept if ≥ 0.85.
   - Otherwise compute Levenshtein ratio. Accept if ≥ 0.9.
   - Take the highest-scoring match above threshold; ties broken by map order
     (questionMap first).
5. On match, set `element.dataset.sbfTranslation = "<english text>"` and attach
   `mouseenter` / `mouseleave` listeners. Also set a `data-sbf-matched` flag to
   avoid reprocessing the same element.

Run the walker once on initial load against `document.body` before the observer
starts, to cover already-rendered content.

## Tooltip Behavior

One shared tooltip DOM node, created lazily, appended to `document.body`:

- `position: fixed`, high `z-index`, dark background (`#222`), white text,
  small padding, `max-width: 420px`, `word-wrap: break-word`, `pointer-events: none`.
- Hidden by default (`display: none`).

Event flow on a matched element:

- `mouseenter` → start 500 ms timer (store ID on the element).
- Timer fires → populate tooltip with the element's `data-sbf-translation`,
  position it ~12 px below-right of the cursor, show it.
- While shown, a `mousemove` listener on the element repositions the tooltip to
  follow the cursor (keeps tooltip on screen with viewport-edge clamping).
- `mouseleave` → clear timer, hide tooltip, remove `mousemove` listener.

Only one tooltip is ever visible. Entering a second matched element while the
first is showing cancels the first's state.

## Error Handling

- Fetch failure: `console.warn('[SBF Translator] failed to load translations', err)`
  once. Script does nothing further. Site remains fully functional.
- Malformed JSON: same as above.
- No retries, no user-visible error UI.

## Out of Scope

- No configuration menu (delay, enable/disable, language).
- No persistent caching of the JSON across page loads.
- No answer-reveal, auto-grading, or interaction beyond tooltips.
- No styling beyond the tooltip itself — site layout is untouched.
- No offline/bundled translation data.

## Testing

Manual verification only:

1. Install the userscript in Tampermonkey.
2. Visit a quiz page under `https://www.bootspruefung.de/quiz/...`.
3. Confirm: hover a question → tooltip appears after ~500 ms with English text.
4. Confirm: hover each answer → separate tooltip per answer.
5. Confirm: leaving the element hides the tooltip.
6. Confirm: a question whose German text differs slightly from ELWIS still matches
   via the fuzzy fallback (pick one example manually to verify).
7. Confirm: with network blocked to `raw.githubusercontent.com`, the page still
   works and the console shows one warning.

Automated tests are not part of this deliverable — the script is small and the
behavior is entirely DOM/network-dependent.

## File Layout

```
userscript/
  sbf-translate.user.js    (the userscript)
```

No build step. The file is plain JavaScript a user installs directly in
Tampermonkey.
