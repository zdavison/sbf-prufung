<script lang="ts">
  import type { Exam, Mode, Question } from '../lib/types';
  import { weakQuestions, loadProgress } from '../lib/progress';
  import { getQuestion } from '../lib/data';

  let { onStart, onBack } = $props<{
    onStart: (exam: Exam, mode: Mode, queue: Question[]) => void;
    onBack: () => void;
  }>();

  const progress = loadProgress();
  const weakList = weakQuestions()
    .map(id => getQuestion(id))
    .filter((q): q is Question => !!q);

  function startReview() {
    if (weakList.length === 0) return;
    const counts = weakList.reduce<Record<string, number>>((acc, q) => {
      const key = q.exam === 'basis' ? 'binnen' : q.exam;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const exam = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'binnen') as Exam;
    onStart(exam, 'weak', weakList);
  }
</script>

<div class="card hatch-shadow">
  <h2 class="card-title">Schwache Fragen</h2>
  {#if weakList.length === 0}
    <p class="muted small" style="margin: 0 0 0.75rem;">Noch keine. Beantworte Fragen falsch und komm wieder.</p>
  {:else}
    <div class="row between" style="margin-bottom: 0.9rem;">
      <span class="muted small">{weakList.length} Fragen · |falsch| &gt; |richtig|</span>
      <button onclick={startReview}>Alle wiederholen</button>
    </div>
  {/if}
</div>

{#if weakList.length > 0}
  <ol class="list">
    {#each weakList as q}
      {@const p = progress[q.id]}
      <li>
        <span class="badge badge-soft mono">{q.id}</span>
        <span class="qtext">{q.de.question}</span>
        <span class="stats mono">
          <span class="ok">✓{p?.correct ?? 0}</span>
          <span class="sep">·</span>
          <span class="bad">✗{p?.wrong ?? 0}</span>
        </span>
      </li>
    {/each}
  </ol>
{/if}

<div class="row" style="margin-top: 1.25rem;">
  <button class="ghost" onclick={onBack}>← Zurück</button>
</div>

<style>
  .list { list-style: none; padding: 0; margin: 0; }
  .list li {
    display: grid;
    grid-template-columns: 7rem 1fr 5.5rem;
    gap: 0.75rem;
    padding: 0.5rem 0.25rem;
    border-bottom: 1px solid oklch(var(--s) / 0.2);
    align-items: center;
    font-size: 0.88rem;
    line-height: 1.4;
  }
  .list li:last-child { border-bottom: 0; }
  .qtext { line-height: 1.4; }
  .stats { text-align: right; font-size: 0.78rem; display: inline-flex; gap: 0.3rem; justify-content: flex-end; }
  .stats .ok { color: oklch(var(--c-correct)); }
  .stats .bad { color: oklch(var(--c-wrong)); }
  .stats .sep { color: oklch(var(--bc2)); }
</style>
