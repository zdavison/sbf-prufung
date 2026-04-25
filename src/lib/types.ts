// User-pickable exam in the Home view.
export type Exam = 'binnen' | 'see';
// Tag stored on each question. 'segeln' (sailing variant of SBF-Binnen, Q254-300)
// is intentionally NOT in Exam — sailing is out of scope for the motor-license
// user who picks Exam='binnen', so byExam('binnen') filters it out.
export type QuestionExam = Exam | 'basis' | 'segeln';

export type Question = {
  id: string;
  exam: QuestionExam;
  category: string;
  officialNumber: number;
  image?: string;
  isNavigationTask?: boolean;
  correctIndex: number;
  de: { question: string; answers: string[] };
  en: { question: string; answers: string[] };
};

export type Mode = 'sequential' | 'shuffle' | 'simulation' | 'weak';

export type Progress = Record<string, {
  correct: number;
  wrong: number;
  lastSeen: number;
}>;
