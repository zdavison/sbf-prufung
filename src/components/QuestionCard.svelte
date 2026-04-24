<script lang="ts">
  import type { Question } from '../lib/types';
  import { shuffle } from '../lib/shuffle';

  let { question, onAnswer } = $props<{
    question: Question;
    onAnswer: (outcome: { correct: boolean; displayOrder: number[] }) => void;
  }>();

  let displayOrder = $state<number[]>(shuffle([0, 1, 2, 3]));
  let picked = $state<number | null>(null);

  $effect(() => {
    question.id;
    displayOrder = shuffle([0, 1, 2, 3]);
    picked = null;
  });

  function choose(originalIndex: number) {
    if (picked !== null) return;
    picked = originalIndex;
    onAnswer({ correct: originalIndex === question.correctIndex, displayOrder });
  }
</script>

<article class="card">
  <h2>Frage {question.officialNumber}</h2>
  <p class="question">{question.de.question}</p>
  {#if question.image}
    <img src={question.image} alt="Diagramm Frage {question.officialNumber}" />
  {/if}
  <ol class="answers">
    {#each displayOrder as origIdx}
      <li>
        <button
          type="button"
          class:picked={picked === origIdx}
          class:correct={picked !== null && origIdx === question.correctIndex}
          class:wrong={picked === origIdx && origIdx !== question.correctIndex}
          disabled={picked !== null}
          onclick={() => choose(origIdx)}>
          {question.de.answers[origIdx]}
        </button>
      </li>
    {/each}
  </ol>
</article>

<style>
  .card { background: var(--panel); border: 1px solid var(--border); padding: 1.25rem; border-radius: 4px; }
  .question { font-size: 1.15rem; line-height: 1.5; }
  img { max-width: 100%; margin: 1rem 0; border: 1px solid var(--border); }
  .answers { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
  button {
    width: 100%; text-align: left;
    padding: 0.75rem 1rem; background: #fff; border: 1px solid var(--border);
    border-radius: 3px; cursor: pointer; font: inherit;
  }
  button:disabled { cursor: default; }
  button.picked { border-width: 2px; }
  button.correct { background: #e7f3e8; border-color: var(--correct); }
  button.wrong { background: #fbe7e7; border-color: var(--wrong); }
</style>
