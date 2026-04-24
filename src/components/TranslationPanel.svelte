<script lang="ts">
  import type { Question } from '../lib/types';

  let { question, revealed, displayOrder } = $props<{
    question: Question;
    revealed: boolean;
    displayOrder: number[];
  }>();
</script>

<aside class="panel">
  <h3>English</h3>
  {#if !revealed}
    <p class="placeholder">Answer the question to reveal the translation.</p>
  {:else}
    <p class="question">{question.en.question}</p>
    <ol class="answers">
      {#each displayOrder as origIdx}
        <li class:correct={origIdx === question.correctIndex}>
          {question.en.answers[origIdx]}
        </li>
      {/each}
    </ol>
  {/if}
</aside>

<style>
  .panel {
    background: var(--panel); border: 1px solid var(--border); padding: 1.25rem;
    border-radius: 4px; min-height: 200px;
  }
  .placeholder { color: #888; font-style: italic; }
  .answers { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
  li { padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 3px; }
  li.correct { border-color: var(--correct); background: #e7f3e8; }
</style>
