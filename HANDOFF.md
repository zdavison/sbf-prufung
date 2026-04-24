# Sandbox Handoff

This repo is set up to be picked up by a Claude instance running in a **sandboxed environment** — no network, no filesystem access outside the repo. Subagents dispatched from that instance run under the same constraints.

If you are that Claude instance: **read this file first**, then follow `docs/superpowers/plans/2026-04-24-sbf-exam-translator-plan.md`.

## Current state

- Branch: `main`.
- Commits on main (most recent last):
  - `0c9d6e6` — design doc
  - `72c407b` — Task 0: Vite + Svelte 5 + TS scaffolding
  - `0b7dfed` — Task 1: pipeline shared types
  - `8190df3` — docs: implementation plan
- `node_modules/` is pre-installed and committed to the working tree (not to git). Do **not** run `npm install` — you have no network.
- `npm run typecheck` passes cleanly (253 files, 0 errors).
- `npm test` passes (no test files yet; exits 0).

## Constraints you operate under

- **No network.** You cannot `npm install`, `curl`, fetch ELWIS, call Anthropic, `git push`, or hit any external URL.
- **Filesystem isolated.** You can only read/write inside this repo. No worktrees, no global cache, no temp files outside the project.
- **No subagent worktree setup.** When the `subagent-driven-development` skill tells you to create a worktree, skip that step — commit directly to a working branch instead. Suggested branch name: `sandbox-work`. Create it off `main` before starting Task 2.

## How to pick up from here

1. Create a working branch: `git checkout -b sandbox-work`.
2. Start from Task 2 of the plan.
3. For each task: dispatch an implementer subagent with the full task text inline (don't make the subagent read the plan file), follow the two-stage review workflow from `superpowers:subagent-driven-development`, commit after each task.
4. Tasks flagged below need pre-staged artifacts already committed to the repo. If an artifact is missing, **stop and surface the gap** — do not try to fetch it.

## Network-gated tasks

Each of these tasks in the plan contains a step that requires the network. In a sandbox, those steps are not executable; handle them as noted.

### Task 2 — ELWIS HTML parser

- **Needs:** `pipeline/__fixtures__/elwis-binnen.html` and `pipeline/__fixtures__/elwis-see.html` already committed.
- **If present:** proceed as written in the plan. The parser is developed TDD against the fixtures; no network needed.
- **If missing:** stop. Ask the user (outside the sandbox) to capture the two HTML pages from elwis.de and commit them, then resume.

### Task 3 — `fetch-elwis.ts` CLI

- The plan has you write the CLI and then run it against the live site. Skip the live run.
- Instead: write the CLI exactly as the plan specifies, but add a small unit test that feeds the CLI a fake HTTP response (mock `undici.request`) and asserts it calls the parser and writes `data/raw-parsed.json` with the expected shape.
- **Needs (for downstream tasks):** `data/raw-parsed.json` pre-staged by the user, produced by running the CLI once outside the sandbox. If missing, the CLI is still implementable but Task 6 will be blocked.

### Task 4 — image downloader

- Write the script as specified; skip the live run step.
- **Needs (for the built site to display images):** `public/assets/questions/*.png` pre-staged by the user.

### Task 5 — translator

- Write the script as specified; skip the live run step.
- Add a unit test that mocks the Anthropic SDK and verifies the cache-read / translate / cache-write flow.
- **Needs (for Task 6 to produce output):** `data/translations-cache.json` pre-staged by the user, fully populated. If missing, Task 6's end-to-end run will fail, but Task 6's unit tests still work on their own fixtures.

### Task 6 — build-data

- Tests use in-memory fixtures → runnable in the sandbox regardless.
- Running the CLI (`npm run pipeline:build`) requires the artifacts from Tasks 3 and 5 to be pre-staged. If they are, commit the resulting `data/questions.json` + `data/questions-de.json`. If not, stop and surface the gap.

### Task 7 onward

- All pure code or UI — no network. Runnable in sandbox provided `data/questions.json` exists.
- If `data/questions.json` is missing (because Task 6 couldn't run end-to-end), you can temporarily commit a tiny hand-crafted stub (2–3 questions) so the site builds. Note it as temporary in the commit message; the real file will replace it once the pipeline runs outside the sandbox.

### Task 17 — GitHub Pages deploy

- The workflow YAML and `vite.config.ts` base-path change are sandbox-safe.
- Pushing to GitHub and toggling Pages in Settings are **not** sandbox-safe. Stop after committing; the user pushes and configures Pages.

## Skills to use

- `superpowers:subagent-driven-development` — per-task implementer + two-stage review. Skip the worktree step.
- `superpowers:test-driven-development` — for each implementation step that has tests.
- `superpowers:verification-before-completion` — run `npm run typecheck` and `npm test` before marking a task complete; do not claim "done" without output.

## What not to do

- Do **not** run `npm install`, `npm update`, `npm audit`, or any package-manager command that touches the network.
- Do **not** attempt to `curl`, `wget`, or WebFetch external URLs.
- Do **not** create a git worktree.
- Do **not** `git push` or open PRs.
- Do **not** commit secrets. If `ANTHROPIC_API_KEY` or similar shows up in any diff, stop and flag it.
