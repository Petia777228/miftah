import Dexie, { type EntityTable } from "dexie";

/**
 * Локальное хранилище (IndexedDB). Все записи идут через функции в lib/*,
 * чтобы позже добавить синхронизацию с сервером без переписывания экранов.
 */

export type ProgressRow = {
  lessonId: string;
  status: "done";
  /** Доля упражнений, решённых с первой попытки, 0..1. */
  accuracy: number;
  completedAt: number;
  attempts: number;
};

export type CardKind = "letter" | "word";

/** Карточка FSRS. Даты хранятся числами (мс), чтобы индекс по due работал. */
export type CardRow = {
  id: string;
  kind: CardKind;
  ref: string;
  addedAt: number;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: number | null;
};

export type SessionRow = {
  id?: number;
  /** Локальная дата YYYY-MM-DD. */
  day: string;
  startedAt: number;
  minutes: number;
  exercises: number;
  kind: "lesson" | "review";
  ref?: string;
};

export type SettingRow = { key: string; value: unknown };

class MiftahDB extends Dexie {
  progress!: EntityTable<ProgressRow, "lessonId">;
  cards!: EntityTable<CardRow, "id">;
  sessions!: EntityTable<SessionRow, "id">;
  settings!: EntityTable<SettingRow, "key">;

  constructor() {
    super("miftah");
    this.version(1).stores({
      progress: "lessonId, completedAt",
      cards: "id, due, kind",
      sessions: "++id, day",
      settings: "key",
    });
  }
}

export const db = new MiftahDB();
