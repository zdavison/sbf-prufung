<script lang="ts">
  import type { Exam, Question } from '../lib/types';

  const PASS_THRESHOLD = 24;

  let { queue, answers, exam, onHome } = $props<{
    queue: Question[]; answers: Record<string, boolean>; exam: Exam; onHome: () => void;
  }>();
  const correctCount = $derived(queue.filter((q: Question) => answers[q.id]).length);
  const passed = $derived(correctCount >= PASS_THRESHOLD);
</script>

<div class="card hatch-shadow">
  <header class="rhead">
    <span class="badge">{exam.toUpperCase()}</span>
    <h2 class="card-title" style="margin:0;">Prüfungssimulation</h2>
  </header>
  <div class="grade" class:pass={passed} class:fail={!passed}>
    <div class="score mono">{correctCount} / {queue.length}</div>
    <div class="verdict">
      <span class="label">{passed ? 'Bestanden' : 'Nicht bestanden'}</span>
      <span class="muted small">Bestehensgrenze {PASS_THRESHOLD}/{queue.length}</span>
    </div>
  </div>
</div>

<ol class="review">
  {#each queue as q}
    <li class:correct={answers[q.id]} class:wrong={!answers[q.id]}>
      <span class="badge badge-soft num mono">#{q.officialNumber}</span>
      <span class="text">{q.de.question}</span>
      <span class="mark mono" aria-hidden="true">{answers[q.id] ? '✓' : '✗'}</span>
    </li>
  {/each}
</ol>

<div class="row" style="margin-top: 1.25rem;">
  <button onclick={onHome}>Zurück zum Menü</button>
</div>

<style>
  .rhead { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem; }
  .grade {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    padding: 1rem 1.1rem;
    border-radius: 0.25rem;
    border: 1px solid oklch(var(--s) / 0.4);
  }
  .grade.pass { background: oklch(var(--c-correct) / 0.1); border-color: oklch(var(--c-correct)); }
  .grade.fail { background: oklch(var(--c-wrong) / 0.1); border-color: oklch(var(--c-wrong)); }
  .score {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .grade.pass .score { color: oklch(var(--c-correct)); }
  .grade.fail .score { color: oklch(var(--c-wrong)); }
  .verdict { display: flex; flex-direction: column; gap: 0.15rem; }
  .verdict .label {
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.85rem;
  }
  .review { list-style: none; padding: 0; margin: 1rem 0 0; }
  .review li {
    display: grid;
    grid-template-columns: 4rem 1fr 1.5rem;
    gap: 0.75rem;
    padding: 0.55rem 0.25rem;
    border-bottom: 1px solid oklch(var(--s) / 0.2);
    align-items: center;
    font-size: 0.88rem;
  }
  .review li:last-child { border-bottom: 0; }
  .review .num { justify-self: start; }
  .review .text { line-height: 1.4; }
  .review .mark { font-weight: 700; text-align: center; }
  .review li.correct .mark { color: oklch(var(--c-correct)); }
  .review li.wrong .mark { color: oklch(var(--c-wrong)); }
</style>
