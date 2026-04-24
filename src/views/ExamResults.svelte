<script lang="ts">
  import type { Exam, Question } from '../lib/types';
  let { queue, answers, exam, onHome } = $props<{
    queue: Question[]; answers: Record<string, boolean>; exam: Exam; onHome: () => void;
  }>();
  const correctCount = $derived(queue.filter((q: Question) => answers[q.id]).length);
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
