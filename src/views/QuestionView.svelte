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
    <button class="ghost" onclick={onCancel}>← Zurück</button>
    {#if revealed}
      <button onclick={next}>
        {index + 1 >= queue.length ? 'Fertig' : 'Weiter →'}
      </button>
    {/if}
  </div>
{/if}

<style>
  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 760px) {
    .split { grid-template-columns: 1fr; }
  }
  .nav-task {
    background: oklch(var(--b1));
    border: 1px solid oklch(var(--s) / 0.3);
    padding: 1.25rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
  }
  .nav-task img { max-width: 100%; margin: 1rem 0; border: 1px solid oklch(var(--s) / 0.3); border-radius: 0.2rem; }
  .official-answer {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: oklch(var(--c-correct) / 0.08);
    border-left: 3px solid oklch(var(--c-correct));
    border-radius: 0 0.2rem 0.2rem 0;
    font-size: 0.9rem;
  }
  .official-answer h3 {
    margin: 0 0 0.35rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: oklch(var(--c-correct));
    font-weight: 800;
  }
  .official-answer p { margin: 0; }
  .actions {
    display: flex;
    justify-content: space-between;
    margin-top: 1.25rem;
    gap: 0.6rem;
  }
</style>
