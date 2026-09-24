import { db, type SessionRow } from "./db";
import { addDays, dayKey } from "./dates";
import { addCards } from "./srs";
import type { Lesson } from "@/content/types";

/** Одна сессия не может «весить» больше получаса: вкладку могли забыть открытой. */
const MAX_SESSION_MIN = 30;

export const sessionMinutes = (startedAt: number, now = Date.now()) =>
  Math.min(MAX_SESSION_MIN, Math.max(0.5, (now - startedAt) / 60000));

/** Засчитывает урок: прогресс, новые карточки и запись о занятии в одной транзакции. */
export async function completeLesson(lesson: Lesson, accuracy: number, startedAt: number, exercises: number) {
  const now = Date.now();
  return db.transaction("rw", db.progress, db.cards, db.sessions, async () => {
    const prev = await db.progress.get(lesson.id);
    await db.progress.put({
      lessonId: lesson.id,
      status: "done",
      accuracy: Math.max(accuracy, prev?.accuracy ?? 0),
      completedAt: now,
      attempts: (prev?.attempts ?? 0) + 1,
    });
    const added = await addCards([
      ...lesson.letters.map((ref) => ({ kind: "letter" as const, ref })),
      ...lesson.words.map((ref) => ({ kind: "word" as const, ref })),
    ]);
    await db.sessions.add({
      day: dayKey(now),
      startedAt,
      minutes: sessionMinutes(startedAt, now),
      exercises,
      kind: "lesson",
      ref: lesson.id,
    });
    return { added };
  });
}

/** Создаёт или обновляет запись о сессии повторения. */
export async function logReview(sessionId: number | undefined, startedAt: number, reviewed: number) {
  const row: SessionRow = {
    day: dayKey(startedAt),
    startedAt,
    minutes: sessionMinutes(startedAt),
    exercises: reviewed,
    kind: "review",
  };
  if (sessionId) {
    await db.sessions.update(sessionId, row);
    return sessionId;
  }
  return db.sessions.add(row);
}

/** Стрик: сколько дней подряд были занятия, считая от сегодня (или от вчера, если сегодня ещё не занимались). */
export function streakFrom(days: Set<string>, today = new Date()): { streak: number; doneToday: boolean } {
  const doneToday = days.has(dayKey(today));
  let cursor = doneToday ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return { streak, doneToday };
}
