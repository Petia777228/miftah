import { z } from "zod";
import { db } from "./db";
import { dayKey } from "./dates";

/** Файл резервной копии: все таблицы как есть. Версия формата — для будущих миграций. */
const backupSchema = z.object({
  app: z.literal("miftah"),
  format: z.literal(1),
  exportedAt: z.string(),
  progress: z.array(z.object({ lessonId: z.string() }).loose()),
  cards: z.array(z.object({ id: z.string(), due: z.number() }).loose()),
  sessions: z.array(z.object({ day: z.string() }).loose()),
  settings: z.array(z.object({ key: z.string() }).loose()),
});
export type Backup = z.infer<typeof backupSchema>;

export async function exportBackup() {
  const data = {
    app: "miftah",
    format: 1,
    exportedAt: new Date().toISOString(),
    progress: await db.progress.toArray(),
    cards: await db.cards.toArray(),
    sessions: await db.sessions.toArray(),
    settings: await db.settings.toArray(),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `miftah-progress-${dayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return data;
}

/** Разбирает файл; бросает понятную ошибку, если это не резервная копия Мифтаха. */
export async function readBackup(file: File): Promise<Backup> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error("Файл не читается как JSON.");
  }
  const res = backupSchema.safeParse(raw);
  if (!res.success) throw new Error("Это не резервная копия Мифтаха или файл повреждён.");
  return res.data;
}

export async function restoreBackup(b: Backup) {
  await db.transaction("rw", db.progress, db.cards, db.sessions, db.settings, async () => {
    await Promise.all([db.progress.clear(), db.cards.clear(), db.sessions.clear(), db.settings.clear()]);
    await db.progress.bulkAdd(b.progress as never[]);
    await db.cards.bulkAdd(b.cards as never[]);
    await db.sessions.bulkAdd(b.sessions as never[]);
    await db.settings.bulkAdd(b.settings as never[]);
  });
}

/** Сброс учебного прогресса. Настройки (цель, тема) остаются. */
export async function resetProgress() {
  await db.transaction("rw", db.progress, db.cards, db.sessions, async () => {
    await Promise.all([db.progress.clear(), db.cards.clear(), db.sessions.clear()]);
  });
}
