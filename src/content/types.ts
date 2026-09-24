import type { Letter, Word } from "./schema";

/** Формат собранного контента (src/generated/content.json), который читает приложение. */

export type Example = { ar: string; tr?: string; ru?: string };

export type TheoryStep = { id: string; type: "theory"; text: string; examples: Example[] };

/** Упражнения с одним верным вариантом: выбор, чтение, буква в позиции. */
export type OptionsStep = {
  id: string;
  type: "choice" | "read" | "position";
  prompt: string;
  show?: string;
  options: string[];
  answer: string;
  note?: string;
};

export type BuildStep = {
  id: string;
  type: "build";
  prompt: string;
  hint: string;
  bank: string[];
  answer: string[];
};

export type TilesStep = {
  id: string;
  type: "tiles";
  direction: "ar-ru" | "ru-ar";
  prompt: string;
  source: string;
  bank: string[];
  answer: string[];
};

export type InputStep = {
  id: string;
  type: "input";
  prompt: string;
  show: string;
  answer: string;
  accept: string[];
};

export type ExerciseStep = OptionsStep | BuildStep | TilesStep | InputStep;
export type Step = TheoryStep | ExerciseStep;

export type Lesson = {
  id: string;
  unit: number;
  kind: "letters" | "reading" | "grammar" | "review";
  title: string;
  letters: string[];
  words: string[];
  steps: Step[];
};

export type LessonSummary = Pick<Lesson, "id" | "kind" | "title" | "letters"> & { exercises: number };

export type Unit = {
  number: number;
  free: boolean;
  title: string;
  topics: string[];
  letters: string[];
  lessons: LessonSummary[];
};

/** letters: изучаемые буквы слова (составные вроде ة и أ раскрыты), для примеров в алфавите и прописях. */
export type BuiltWord = Word & { unit: number; lesson: string; letters: string[]; audio?: string };
export type BuiltLetter = Letter & { audio?: string };

export type Content = {
  units: Unit[];
  lessons: Record<string, Lesson>;
  words: Record<string, BuiltWord>;
  letters: Record<string, BuiltLetter>;
};
