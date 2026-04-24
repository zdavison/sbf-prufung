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

<h1>Weak questions</h1>
{#if weakList.length === 0}
  <p>No weak questions yet. Answer some wrong and come back!</p>
{:else}
  <p>{weakList.length} questions with more wrong answers than correct ones.</p>
  <button onclick={startReview}>Review all</button>
  <ol class="list">
    {#each weakList as q}
      {@const p = progress[q.id]}
      <li>
        <span class="id">{q.id}</span>
        <span class="q">{q.de.question}</span>
        <span class="stats">✓ {p?.correct ?? 0} · ✗ {p?.wrong ?? 0}</span>
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
