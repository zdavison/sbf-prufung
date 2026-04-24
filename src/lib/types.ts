export type Exam = 'binnen' | 'see';
export type QuestionExam = Exam | 'basis';

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
