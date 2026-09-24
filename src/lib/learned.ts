import { useLiveQuery } from "dexie-react-hooks";
import { content } from "@/content";
import { db } from "./db";

/** Id пройденных уроков; undefined, пока IndexedDB не ответила. */
export function useDoneLessons(): Set<string> | undefined {
  const rows = useLiveQuery(() => db.progress.toArray(), []);
  return rows ? new Set(rows.map((r) => r.lessonId)) : undefined;
}

/** Буквы, введённые в пройденных уроках. */
export function learnedLetters(done: Set<string> | undefined): Set<string> {
  const out = new Set<string>();
  for (const id of done ?? []) for (const c of content.lessons[id]?.letters ?? []) out.add(c);
  return out;
}

/** Урок, в котором вводится буква. */
export function lessonForLetter(char: string) {
  return Object.values(content.lessons).find((l) => l.letters.includes(char));
}
