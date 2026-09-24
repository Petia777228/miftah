import { z } from "zod";

/** Исходный формат content/*.yaml. Производные поля (формы, плитки, аудио) добавляет scripts/build-content.ts. */

const nonEmpty = z.string().trim().min(1);

export const markName = z.enum([
  "fatha",
  "kasra",
  "damma",
  "sukun",
  "shadda",
  "tanwin",
  "madda",
  "dagger-alif",
]);
export type MarkName = z.infer<typeof markName>;

export const letterSchema = z.object({
  char: z.string().length(1),
  name: nonEmpty,
  tr: nonEmpty,
  joining: z.enum(["dual", "right", "none"]),
  unit: z.number().int().min(1),
  sound: nonEmpty,
});
export type Letter = z.infer<typeof letterSchema>;

export const courseUnitSchema = z.object({
  number: z.number().int().min(0),
  free: z.boolean(),
  title: nonEmpty,
  topics: z.array(nonEmpty).min(1),
  marks: z.array(markName).optional(),
});

export const courseSchema = z.object({ units: z.array(courseUnitSchema).min(1) });

export const wordSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, "id слова: латиница, цифры, дефис"),
  ar: nonEmpty,
  tr: nonEmpty,
  ru: nonEmpty,
  root: z.string().optional(),
  pos: z.enum(["noun", "verb", "adj", "particle", "phrase"]),
  gender: z.enum(["m", "f"]).optional(),
});
export type Word = z.infer<typeof wordSchema>;

const example = z.object({ ar: nonEmpty, tr: z.string().optional(), ru: z.string().optional() });

const theory = z.object({
  type: z.literal("theory"),
  text: nonEmpty,
  examples: z.array(example).optional(),
  /** Примеры только для показа: буквы из будущих юнитов допустимы. */
  showcase: z.boolean().optional(),
});

const optionSet = { correct: nonEmpty, wrong: z.array(nonEmpty).min(1).max(3) };

/** 1. Выбор: увидь (или услышь) и выбери вариант. */
const choice = z.object({
  type: z.literal("choice"),
  prompt: nonEmpty,
  show: z.string().optional(),
  ...optionSet,
  note: z.string().optional(),
});

/** 2. Буква в позиции: найди нужную форму буквы. Варианты генерирует сборка. */
const position = z.object({
  type: z.literal("position"),
  letter: z.string().length(1),
  position: z.enum(["isolated", "initial", "medial", "final"]),
});

/** 3. Сборка слова из букв-плиток. */
const build = z.object({
  type: z.literal("build"),
  word: nonEmpty,
  extra: z.array(nonEmpty).optional(),
});

/** 4. Чтение слога или слова: выбери транскрипцию. */
const read = z.object({
  type: z.literal("read"),
  show: nonEmpty,
  ...optionSet,
  note: z.string().optional(),
});

/** 5. Перевод фразы плитками. */
const tiles = z.object({
  type: z.literal("tiles"),
  direction: z.enum(["ar-ru", "ru-ar"]),
  source: nonEmpty,
  answer: z.array(nonEmpty).min(1),
  extra: z.array(nonEmpty).optional(),
});

/** 6. Ввод транскрипцией, сравнение мягкое. */
const input = z.object({
  type: z.literal("input"),
  show: nonEmpty,
  prompt: nonEmpty,
  answer: nonEmpty,
  also: z.array(nonEmpty).optional(),
});

export const stepSchema = z.discriminatedUnion("type", [theory, choice, position, build, read, tiles, input]);
export type StepSource = z.infer<typeof stepSchema>;

export const lessonSchema = z.object({
  id: z.string().regex(/^u\d+-l\d+$/, "id урока вида u1-l2"),
  kind: z.enum(["letters", "reading", "grammar", "review"]),
  title: nonEmpty,
  letters: z.array(z.string().length(1)).optional(),
  words: z.array(nonEmpty).optional(),
  steps: z.array(stepSchema).min(1),
});

export const unitFileSchema = z.object({
  unit: z.number().int().min(0),
  words: z.array(wordSchema),
  lessons: z.array(lessonSchema).min(1),
});
export type UnitFile = z.infer<typeof unitFileSchema>;
