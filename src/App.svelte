<script lang="ts">
  import Home from './views/Home.svelte';
  import QuestionView from './views/QuestionView.svelte';
  import ExamResults from './views/ExamResults.svelte';
  import WeakQuestions from './views/WeakQuestions.svelte';
  import type { Exam, Mode, Question } from './lib/types';

  type View =
    | { name: 'home' }
    | { name: 'question'; queue: Question[]; mode: Mode; exam: Exam }
    | { name: 'results'; queue: Question[]; answers: Record<string, boolean>; exam: Exam }
    | { name: 'weak' };

  let view = $state<View>({ name: 'home' });

  function start(exam: Exam, mode: Mode, queue: Question[]) {
    view = { name: 'question', queue, mode, exam };
  }
  function goHome() { view = { name: 'home' }; }
  function goResults(queue: Question[], answers: Record<string, boolean>, exam: Exam) {
    view = { name: 'results', queue, answers, exam };
  }
  function goWeak() { view = { name: 'weak' }; }
</script>

<main>
  {#if view.name === 'home'}
    <Home onStart={start} onWeak={goWeak} />
  {:else if view.name === 'question'}
    {@const q = view}
    <QuestionView
      queue={q.queue}
      mode={q.mode}
      exam={q.exam}
      onFinish={(answers) =>
        q.mode === 'simulation'
          ? goResults(q.queue, answers, q.exam)
          : goHome()}
      onCancel={goHome} />
  {:else if view.name === 'results'}
    <ExamResults queue={view.queue} answers={view.answers} exam={view.exam} onHome={goHome} />
  {:else if view.name === 'weak'}
    <WeakQuestions onStart={start} onBack={goHome} />
  {/if}
</main>

<style>
  main { max-width: 1100px; margin: 0 auto; padding: 2rem; }
</style>
