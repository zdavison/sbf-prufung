<script lang="ts">
  import type { Exam, Mode, Question } from '../lib/types';
  import { untrack } from 'svelte';
  import QuestionCard from '../components/QuestionCard.svelte';
  import TranslationPanel from '../components/TranslationPanel.svelte';
  import ProgressBar from '../components/ProgressBar.svelte';
  import { recordAnswer, appendLastWrong, lastWrongKey } from '../lib/progress';
  import { saveSession } from '../lib/session';

  let {
    queue, mode, exam, category,
    initialIndex = 0, initialAnswers = {},
    onFinish, onCancel,
  } = $props<{
    queue: Question[]; mode: Mode; exam: Exam; category?: string;
    initialIndex?: number;
    initialAnswers?: Record<string, boolean>;
    onFinish: (answers: Record<string, boolean>) => void;
    onCancel: () => void;
  }>();

  // One-shot seed from props on mount — this component owns these from here on.
  let index = $state(untrack(() => initialIndex));
  let revealed = $state(false);
  let displayOrder = $state<number[]>([0, 1, 2, 3]);
  let answers = $state<Record<string, boolean>>(untrack(() => ({ ...initialAnswers })));

  // Persist a compact snapshot on every index/answers change so a refresh resumes
  // mid-run. Queue is stored as IDs; App.svelte rehydrates to Question[] via getQuestion.
  $effect(() => {
    saveSession({
      mode, exam, category,
      queueIds: queue.map((q: Question) => q.id),
      index,
      answers: { ...answers },
    });
  });
  // safe: guarded by queue.length > 0 check in template
  const current = $derived(queue[index]!);

  function onCardAnswer(outcome: { correct: boolean; displayOrder: number[] }) {
    revealed = true;
    displayOrder = outcome.displayOrder;
    answers[current.id] = outcome.correct;
    if (!current.isNavigationTask) recordAnswer(current.id, outcome.correct);
    if (!outcome.correct && mode === 'sequential' && category) {
      appendLastWrong(lastWrongKey(exam, category), current.id);
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

{#if queue.length === 0}
  <p>No questions in this queue.</p>
  <button class="secondary" onclick={onCancel}>Back to menu</button>
{:else}
  <ProgressBar current={index + 1} total={queue.length} />

  {#if current.isNavigationTask}
    <article class="nav-task">
      <h2>Frage {current.officialNumber} — Navigationsaufgabe</h2>
      <p>{current.de.question}</p>
      {#if current.image}<img src={`${import.meta.env.BASE_URL}${current.image}`} alt="Chart {current.officialNumber}" />{/if}
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
{/if}

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
