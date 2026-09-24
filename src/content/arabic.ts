import type { MarkName } from "./schema";

/** Огласовочные знаки → имя знака в course.yaml. */
export const MARKS: Record<string, MarkName> = {
  "َ": "fatha",
  "ِ": "kasra",
  "ُ": "damma",
  "ْ": "sukun",
  "ّ": "shadda",
  "ً": "tanwin",
  "ٌ": "tanwin",
  "ٍ": "tanwin",
  "ٓ": "madda",
  "ٰ": "dagger-alif",
};

export const MARK_RU: Record<MarkName, string> = {
  fatha: "фатха",
  kasra: "касра",
  damma: "дамма",
  sukun: "сукун",
  shadda: "шадда (удвоение)",
  tanwin: "танвин",
  madda: "мадда",
  "dagger-alif": "малый алиф",
};

/** Составные написания → из каких изучаемых букв они состоят. */
const COMPOSITE: Record<string, string[]> = {
  "أ": ["ا", "ء"],
  "إ": ["ا", "ء"],
  "آ": ["ا", "ء"],
  "ؤ": ["و", "ء"],
  "ئ": ["ي", "ء"],
  "ة": ["ت", "ه"],
  "ى": ["ي"],
};

/** Не буквы: пробелы, татвиль (кашида), пунктирный кружок, пунктуация. */
const NEUTRAL = /[\sـ◌،؛؟.,!?«»()\-:]/u;
const COMBINING = /[ً-ٰٟ]/u;
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿◌]/u;

export const isArabic = (s: string) => ARABIC_SCRIPT.test(s);

/** Арабские вставки внутри русского текста. */
export const arabicRuns = (s: string): string[] =>
  s.match(/[\u0600-\u06FF\u25CC][\u0600-\u06FF\u25CC\s]*/gu)?.map((r) => r.trim()) ?? [];

export type Analysis = { letters: string[]; marks: MarkName[]; unknown: string[] };

/** Разбирает строку на буквы (с раскрытием составных) и огласовочные знаки. */
export function analyze(text: string, knownLetters: ReadonlySet<string>): Analysis {
  const letters = new Set<string>();
  const marks = new Set<MarkName>();
  const unknown = new Set<string>();
  for (const ch of text.normalize("NFC")) {
    if (NEUTRAL.test(ch)) continue;
    const mark = MARKS[ch];
    if (mark) {
      marks.add(mark);
      continue;
    }
    if (COMBINING.test(ch)) {
      unknown.add(ch);
      continue;
    }
    const parts = COMPOSITE[ch] ?? [ch];
    for (const p of parts) (knownLetters.has(p) ? letters : unknown).add(p);
  }
  return { letters: [...letters], marks: [...marks], unknown: [...unknown] };
}

/** Делит арабскую строку на графемы: буква + её огласовки. Пробелы отбрасываются. */
export function graphemes(text: string): string[] {
  const out: string[] = [];
  for (const ch of text.normalize("NFC")) {
    if (/\s/u.test(ch)) continue;
    if (COMBINING.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

export type Position = "isolated" | "initial" | "medial" | "final";
export type Joining = "dual" | "right" | "none";

export const POSITION_RU: Record<Position, string> = {
  isolated: "отдельную",
  initial: "начальную",
  medial: "срединную",
  final: "конечную",
};

const TATWEEL = "ـ";

/** Форма буквы в позиции, показанная через татвиль (соединительную черту). */
export function letterForm(char: string, joining: Joining, position: Position): string {
  if (joining === "none") return char;
  const joinsNext = joining === "dual";
  switch (position) {
    case "isolated":
      return char;
    case "initial":
      return joinsNext ? char + TATWEEL : char;
    case "medial":
      return joinsNext ? TATWEEL + char + TATWEEL : TATWEEL + char;
    case "final":
      return TATWEEL + char;
  }
}

/** Порядок букв в алфавите (хиджаи); хамза отдельно, в конце. */
export const ALPHABET_ORDER = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";

export const JOINING_RU: Record<Joining, string> = {
  dual: "Соединяется с обеих сторон, поэтому у неё четыре формы.",
  right: "Соединяется только с предыдущей буквой: две формы, в начале слова пишется как отдельная.",
  none: "Не соединяется ни с чем. Обычно сидит на подставке: أ ؤ ئ.",
};

/** Все реально различающиеся формы буквы (для правосоединяемых их две). */
export function distinctForms(char: string, joining: Joining): { position: Position; form: string }[] {
  const all = (["isolated", "initial", "medial", "final"] as const).map((position) => ({ position, form: letterForm(char, joining, position) }));
  return all.filter((f, i) => all.findIndex((g) => g.form === f.form) === i);
}
