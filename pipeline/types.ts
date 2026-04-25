// Note: 'segeln' is the SBF-Binnen sailing variant (officialNumber 254-300). It's
// a question tag, not a separately-pickable exam — Sailing is a sub-license of
// SBF-Binnen on ELWIS but the user-facing app surfaces only the motor variant.
export type Exam = 'binnen' | 'see' | 'basis' | 'segeln';

export type RawQuestion = {
  exam: Exam;
  officialNumber: number;
  category: string;
  question: string;
  answers: string[];      // raw order as shown in ELWIS; first entry is the correct one.
  correctIndex: number;   // always 0 in ELWIS output — kept explicit in case that changes.
  imageRef?: string;      // URL of image on elwis.de, if any.
  isNavigationTask: boolean;
};

export type Translation = {
  sourceHash: string;     // sha1(de text)
  de: string;
  en: string;
};

export type BuiltQuestion = {
  id: string;
  exam: Exam;
  category: string;
  officialNumber: number;
  image?: string;
  isNavigationTask?: boolean;
  correctIndex: number;
  de: { question: string; answers: string[] };
  en: { question: string; answers: string[] };
};
