import raw from "@/generated/content.json";
import type { Content, Lesson, LessonSummary } from "./types";

export const content = raw as unknown as Content;

/** Все уроки курса в порядке прохождения. */
export const lessonOrder: (LessonSummary & { unit: number })[] = content.units.flatMap((u) =>
  u.lessons.map((l) => ({ ...l, unit: u.number })),
);

export const getLesson = (id: string): Lesson | undefined => content.lessons[id];

export const lessonNumber = (id: string) => Number(id.split("-l")[1]);

export function nextLessonAfter(id: string) {
  const i = lessonOrder.findIndex((l) => l.id === id);
  return i >= 0 ? lessonOrder[i + 1] : undefined;
}
