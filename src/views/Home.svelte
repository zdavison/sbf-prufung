<script lang="ts">
  import type { Exam, Mode, Question } from '../lib/types';
  import { byExam, allCategories } from '../lib/data';
  import { shuffle } from '../lib/shuffle';
  import { buildSimulation } from '../lib/simulation';

  let { onStart, onWeak } = $props<{
    onStart: (exam: Exam, mode: Mode, queue: Question[]) => void;
    onWeak: () => void;
  }>();

  let exam = $state<Exam>('binnen');
  let category = $state<string>('');

  $effect(() => {
    exam; // track exam changes
    category = '';
  });

  const categories = $derived(allCategories(exam));

  function startSequential() {
    const queue = category
      ? byExam(exam).filter(q => q.category === category)
      : byExam(exam);
    onStart(exam, 'sequential', queue);
  }
  function startShuffle() { onStart(exam, 'shuffle', shuffle(byExam(exam))); }
  function startSimulation() { onStart(exam, 'simulation', buildSimulation(exam)); }
</script>

<h1>SBF Prüfung Trainer</h1>

<section class="panel">
  <label>
    Exam:
    <select bind:value={exam}>
      <option value="binnen">SBF-Binnen</option>
      <option value="see">SBF-See</option>
    </select>
  </label>
</section>

<section class="panel">
  <h2>Sequential by category</h2>
  <label>
    Category:
    <select bind:value={category}>
      <option value="">— all categories —</option>
      {#each categories as c}
        <option value={c}>{c}</option>
      {/each}
    </select>
  </label>
  <button onclick={startSequential}>Start</button>
</section>

<section class="panel">
  <h2>Shuffle whole exam</h2>
  <button onclick={startShuffle}>Start</button>
</section>

<section class="panel">
  <h2>Exam simulation (30 random)</h2>
  <button onclick={startSimulation}>Start</button>
</section>

<section class="panel">
  <h2>Review weak questions</h2>
  <button onclick={onWeak}>Open</button>
</section>

<style>
  .panel {
    background: var(--panel);
    border: 1px solid var(--border);
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
    border-radius: 4px;
  }
  button {
    background: var(--accent);
    color: white;
    border: 0;
    padding: 0.5rem 1rem;
    border-radius: 3px;
    cursor: pointer;
    margin-top: 0.75rem;
  }
  label { display: block; margin-bottom: 0.5rem; }
</style>
