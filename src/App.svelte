<script lang="ts">
  import Home from './views/Home.svelte';
  import QuestionView from './views/QuestionView.svelte';
  import ExamResults from './views/ExamResults.svelte';
  import WeakQuestions from './views/WeakQuestions.svelte';
  import type { Exam, Mode, Question } from './lib/types';
  import { getQuestion } from './lib/data';
  import { loadSession, clearSession } from './lib/session';

  type View =
    | { name: 'home' }
    | {
        name: 'question';
        queue: Question[];
        mode: Mode;
        exam: Exam;
        category?: string;
        initialIndex?: number;
        initialAnswers?: Record<string, boolean>;
      }
    | { name: 'results'; queue: Question[]; answers: Record<string, boolean>; exam: Exam }
    | { name: 'weak' };

  // Rehydrate an in-progress run from localStorage so a page refresh resumes where
  // the user left off. Falls back to home if the session is stale (questions no
  // longer exist, index out of range, etc.).
  function initialView(): View {
    const s = loadSession();
    if (!s) return { name: 'home' };
    const queue = s.queueIds
      .map(id => getQuestion(id))
      .filter((q): q is Question => !!q);
    if (queue.length === 0 || s.index >= queue.length) {
      clearSession();
      return { name: 'home' };
    }
    return {
      name: 'question',
      queue,
      mode: s.mode,
      exam: s.exam,
      category: s.category,
      initialIndex: Math.max(0, s.index),
      initialAnswers: s.answers ?? {},
    };
  }

  let view = $state<View>(initialView());

  function start(exam: Exam, mode: Mode, queue: Question[], category?: string) {
    view = { name: 'question', queue, mode, exam, category };
  }
  function goHome() {
    clearSession();
    view = { name: 'home' };
  }
  function goResults(queue: Question[], answers: Record<string, boolean>, exam: Exam) {
    clearSession();
    view = { name: 'results', queue, answers, exam };
  }
  function goWeak() { view = { name: 'weak' }; }
</script>

<main class="shell">
  <header class="shell-header">
    <h1>SBF Prüfung</h1>
    <span class="subtitle">Binnen · Fragenkatalog 2023</span>
  </header>

  {#if view.name === 'home'}
    <Home onStart={start} onWeak={goWeak} />
  {:else if view.name === 'question'}
    {@const q = view}
    <QuestionView
      queue={q.queue}
      mode={q.mode}
      exam={q.exam}
      category={q.category}
      initialIndex={q.initialIndex}
      initialAnswers={q.initialAnswers}
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
