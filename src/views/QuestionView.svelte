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
  const current = $derived(queue[index]!);

  function onCardAnswer(outcome: { correct: boolean; displayOrder: number[] }) {
    revealed = true;
    displayOrder = outcome.displayOrder;
    answers[current.id] = outcome.correct;
    if (!current.isNavigationTask) recordAnswer(current.id, outcome.correct);
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
