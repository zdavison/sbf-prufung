<script lang="ts">
  import type { Question } from '../lib/types';
  import { shuffle } from '../lib/shuffle';

  let { question, onAnswer } = $props<{
    question: Question;
    onAnswer: (outcome: { correct: boolean; displayOrder: number[] }) => void;
  }>();

  let displayOrder = $state<number[]>([0, 1, 2, 3]);
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

<article class="qcard card hatch-shadow">
  <header class="qhead">
    <span class="badge">Frage {question.officialNumber}</span>
    <span class="badge badge-soft">{question.category}</span>
  </header>
  <p class="question">{question.de.question}</p>
  {#if question.image}
    <img src={`${import.meta.env.BASE_URL}${question.image}`} alt="Diagramm Frage {question.officialNumber}" />
  {/if}
  <ol class="answers">
    {#each displayOrder as origIdx, pos}
      <li>
        <button
          type="button"
          class="answer"
          class:picked={picked === origIdx}
          class:correct={picked !== null && origIdx === question.correctIndex}
          class:wrong={picked === origIdx && origIdx !== question.correctIndex}
          disabled={picked !== null}
          onclick={() => choose(origIdx)}>
          <span class="letter">{String.fromCharCode(97 + pos)}</span>
          <span class="text">{question.de.answers[origIdx]}</span>
        </button>
      </li>
    {/each}
  </ol>
</article>

<style>
  .qcard { padding: 1.3rem 1.4rem 1.2rem; }
  .qhead { display: flex; gap: 0.4rem; align-items: center; margin-bottom: 0.9rem; flex-wrap: wrap; }
  .question { font-size: 1.05rem; line-height: 1.5; margin: 0 0 1rem; font-weight: 500; }
  img {
    max-width: 100%;
    margin: 0 0 1rem;
    border: 1px solid oklch(var(--s) / 0.3);
    border-radius: 0.2rem;
    background: oklch(var(--b2));
    padding: 0.25rem;
  }
  .answers { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.55rem; }
  .answer {
    width: 100%;
    text-align: left;
    padding: 0.7rem 0.9rem;
    background: oklch(var(--b1));
    color: oklch(var(--bc));
    border: 1px solid oklch(var(--s) / 0.4);
    border-radius: 0.2rem;
    box-shadow: 1px 1px 0 oklch(var(--s) / 0.4);
    cursor: pointer;
    font: inherit;
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    line-height: 1.45;
    transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.1s ease;
  }
  .answer:hover:not(:disabled) {
    background: oklch(var(--b2));
    border-color: oklch(var(--s));
    box-shadow: 2px 2px 0 oklch(var(--s));
    transform: translate(-1px, -1px);
  }
  .answer:disabled { cursor: default; }
  .letter {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border: 1px solid oklch(var(--s) / 0.5);
    border-radius: 0.15rem;
    color: oklch(var(--bc2));
    flex: 0 0 auto;
    text-transform: uppercase;
  }
  .text { flex: 1; }
  .answer.picked { border-width: 2px; padding: calc(0.7rem - 1px) calc(0.9rem - 1px); }
  .answer.correct {
    background: oklch(var(--c-correct) / 0.12);
    border-color: oklch(var(--c-correct));
    box-shadow: 1px 1px 0 oklch(var(--c-correct));
  }
  .answer.correct .letter { border-color: oklch(var(--c-correct)); color: oklch(var(--c-correct)); }
  .answer.wrong {
    background: oklch(var(--c-wrong) / 0.1);
    border-color: oklch(var(--c-wrong));
    box-shadow: 1px 1px 0 oklch(var(--c-wrong));
  }
  .answer.wrong .letter { border-color: oklch(var(--c-wrong)); color: oklch(var(--c-wrong)); }
</style>
