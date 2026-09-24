import type { ExerciseStep, Step } from "@/content/types";
import { compareTranslit, type TranslitVerdict } from "@/lib/translit";

/** Ответ ученика: выбранный вариант, индексы плиток из банка или введённый текст. */
export type Answer = { kind: "option"; value: string } | { kind: "tiles"; picked: number[] } | { kind: "text"; value: string };

export type Status = "answering" | "correct" | "wrong";

export type Verdict = { ok: boolean; translit?: TranslitVerdict };

export const isExercise = (s: Step): s is ExerciseStep => s.type !== "theory";

export function emptyAnswer(step: ExerciseStep): Answer {
  if (step.type === "build" || step.type === "tiles") return { kind: "tiles", picked: [] };
  if (step.type === "input") return { kind: "text", value: "" };
  return { kind: "option", value: "" };
}

export function isReady(a: Answer): boolean {
  if (a.kind === "tiles") return a.picked.length > 0;
  return a.value.trim().length > 0;
}

export function judge(step: ExerciseStep, a: Answer, bank: string[]): Verdict {
  switch (step.type) {
    case "choice":
    case "read":
    case "position":
      return { ok: a.kind === "option" && a.value === step.answer };
    case "build":
    case "tiles": {
      if (a.kind !== "tiles") return { ok: false };
      const got = a.picked.map((i) => bank[i]);
      const sep = step.type === "build" ? "" : " ";
      return { ok: got.join(sep) === step.answer.join(sep) };
    }
    case "input": {
      if (a.kind !== "text") return { ok: false };
      const translit = compareTranslit(a.value, [step.answer, ...step.accept]);
      return { ok: translit !== "wrong", translit };
    }
  }
}

/** Верный ответ строкой, для подсказки после ошибки. */
export function correctText(step: ExerciseStep): string {
  switch (step.type) {
    case "build":
      return step.answer.join("");
    case "tiles":
      return step.answer.join(" ");
    default:
      return step.answer;
  }
}

export function shuffled<T>(xs: readonly T[], differentFrom?: readonly T[]): T[] {
  for (let attempt = 0; attempt < 6; attempt++) {
    const out = [...xs];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    const same = differentFrom && out.slice(0, differentFrom.length).every((x, i) => x === differentFrom[i]);
    if (!same || xs.length < 2) return out;
  }
  return [...xs].reverse();
}
