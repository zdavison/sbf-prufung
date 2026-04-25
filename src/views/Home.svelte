<script lang="ts">
  import type { Exam, Mode, Question } from '../lib/types';
  import { byExam, allCategories, getQuestion, hasExam } from '../lib/data';
  import { shuffle } from '../lib/shuffle';
  import { buildSimulation } from '../lib/simulation';
  import { getLastWrong, resetLastWrong, lastWrongKey } from '../lib/progress';

  let { onStart, onWeak } = $props<{
    onStart: (exam: Exam, mode: Mode, queue: Question[], category?: string) => void;
    onWeak: () => void;
  }>();

  // Hide exams the dataset doesn't include yet (SBF-See is wired in the type system
  // but absent from data/questions.json). If only one exam is present the picker
  // collapses to a static label.
  const EXAM_LABELS: Record<Exam, string> = { binnen: 'SBF-Binnen', see: 'SBF-See' };
  const availableExams: Exam[] = (['binnen', 'see'] as const).filter(hasExam);

  let exam = $state<Exam>(availableExams[0] ?? 'binnen');
  let category = $state<string>('');
  let readTick = $state(0);

  $effect(() => {
    exam;
    category = '';
  });

  const categories = $derived(allCategories(exam));
  const wrongIdsForCategory = $derived.by(() => {
    readTick;
    return category ? getLastWrong(lastWrongKey(exam, category)) : [];
  });
  const totalForExam = $derived(byExam(exam).length);

  function startSequential() {
    const queue = category
      ? byExam(exam).filter(q => q.category === category)
      : byExam(exam);
    if (category) {
      resetLastWrong(lastWrongKey(exam, category));
      readTick++;
    }
    onStart(exam, 'sequential', queue, category || undefined);
  }
  function startRedoWrong() {
    if (!category || wrongIdsForCategory.length === 0) return;
    const queue = wrongIdsForCategory
      .map(id => getQuestion(id))
      .filter((q): q is Question => !!q);
    resetLastWrong(lastWrongKey(exam, category));
    readTick++;
    onStart(exam, 'sequential', queue, category);
  }
  function startShuffle() { onStart(exam, 'shuffle', shuffle(byExam(exam))); }
  function startSimulation() { onStart(exam, 'simulation', buildSimulation(exam)); }
</script>

<div class="card hatch-shadow">
  <h2 class="card-title">Prüfung</h2>
  <div class="row between">
    {#if availableExams.length > 1}
      <label class="inline">
        <span>Exam</span>
        <select bind:value={exam}>
          {#each availableExams as e}
            <option value={e}>{EXAM_LABELS[e]}</option>
          {/each}
        </select>
      </label>
    {:else}
      <span class="badge">{EXAM_LABELS[exam]}</span>
    {/if}
    <span class="muted small mono">{totalForExam} Fragen</span>
  </div>
</div>

<div class="card hatch-shadow">
  <h2 class="card-title">Nach Kategorie</h2>
  <label>
    <span>Kategorie</span>
    <select bind:value={category}>
      <option value="">— alle Kategorien —</option>
      {#each categories as c}
        <option value={c}>{c}</option>
      {/each}
    </select>
  </label>
  <div class="row" style="margin-top: 0.9rem;">
    <button onclick={startSequential}>Start</button>
    {#if category && wrongIdsForCategory.length > 0}
      <button class="secondary" onclick={startRedoWrong}>
        Redo {wrongIdsForCategory.length} Falsch
      </button>
    {/if}
  </div>
</div>

<div class="card hatch-shadow">
  <h2 class="card-title">Gemischt</h2>
  <p class="muted small" style="margin: 0 0 0.9rem;">Alle {totalForExam} Fragen in zufälliger Reihenfolge.</p>
  <button onclick={startShuffle}>Start</button>
</div>

<div class="card hatch-shadow">
  <h2 class="card-title">Prüfungssimulation</h2>
  <p class="muted small" style="margin: 0 0 0.9rem;">30 zufällige Fragen · 7 Basis + 23 spezifisch · Bestehensgrenze 24/30.</p>
  <button onclick={startSimulation}>Start</button>
</div>

<div class="card hatch-shadow">
  <h2 class="card-title">Schwache Fragen</h2>
  <p class="muted small" style="margin: 0 0 0.9rem;">Alle Fragen, bei denen ∣falsch∣ &gt; ∣richtig∣ über deine gesamte Übung.</p>
  <button class="secondary" onclick={onWeak}>Öffnen</button>
</div>

<style>
  label.inline { display: inline-flex; flex-direction: column; gap: 0.3rem; margin: 0; }
  label.inline > span:first-child { margin-bottom: 0; }
  label > span:first-child { display: block; margin-bottom: 0.35rem; }
</style>
