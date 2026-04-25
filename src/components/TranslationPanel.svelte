<script lang="ts">
  import type { Question } from '../lib/types';

  let { question, revealed, displayOrder } = $props<{
    question: Question;
    revealed: boolean;
    displayOrder: number[];
  }>();
</script>

<aside class="tpanel card" lang="en">
  <header class="thead">
    <span class="badge badge-soft">EN</span>
    <span class="muted small">Translation</span>
  </header>
  {#if !revealed}
    <p class="placeholder">Answer the question to reveal the translation.</p>
  {:else}
    <p class="question">{question.en.question}</p>
    <ol class="answers">
      {#each displayOrder as origIdx, pos}
        <li class:correct={origIdx === question.correctIndex}>
          <span class="letter">{String.fromCharCode(97 + pos)}</span>
          <span>{question.en.answers[origIdx]}</span>
        </li>
      {/each}
    </ol>
  {/if}
</aside>

<style>
  .tpanel {
    min-height: 200px;
    margin: 0;
    background: oklch(var(--b2));
    border-color: oklch(var(--s) / 0.25);
  }
  .thead { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
  .placeholder { color: oklch(var(--bc2)); font-style: italic; font-size: 0.9rem; margin: 0; }
  .question { font-size: 0.95rem; line-height: 1.5; margin: 0 0 0.9rem; }
  .answers { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.55rem 0.75rem;
    border: 1px solid oklch(var(--s) / 0.35);
    border-radius: 0.2rem;
    background: oklch(var(--b1));
    font-size: 0.88rem;
    line-height: 1.45;
  }
  li.correct {
    border-color: oklch(var(--c-correct));
    background: oklch(var(--c-correct) / 0.1);
  }
  .letter {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.08rem 0.35rem;
    border: 1px solid oklch(var(--s) / 0.4);
    border-radius: 0.15rem;
    color: oklch(var(--bc2));
    flex: 0 0 auto;
    text-transform: uppercase;
  }
  li.correct .letter { border-color: oklch(var(--c-correct)); color: oklch(var(--c-correct)); }
</style>
