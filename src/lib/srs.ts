import { createEmptyCard, fsrs, generatorParameters, Rating, type CardInput, type Grade } from "ts-fsrs";
import { db, type CardKind, type CardRow } from "./db";

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

export const GRADES = [
  { grade: Rating.Again as Grade, label: "Снова", key: "1" },
  { grade: Rating.Hard as Grade, label: "Трудно", key: "2" },
  { grade: Rating.Good as Grade, label: "Хорошо", key: "3" },
  { grade: Rating.Easy as Grade, label: "Легко", key: "4" },
] as const;

export const cardId = (kind: CardKind, ref: string) => `${kind}:${ref}`;

function toInput(row: CardRow): CardInput {
  return { ...row, due: row.due, last_review: row.last_review };
}

/** Добавляет новые карточки; уже существующие не трогает. Возвращает число добавленных. */
export async function addCards(items: { kind: CardKind; ref: string }[], now = new Date()): Promise<number> {
  const ids = items.map((i) => cardId(i.kind, i.ref));
  const existing = new Set((await db.cards.bulkGet(ids)).filter(Boolean).map((c) => c!.id));
  const fresh: CardRow[] = items
    .filter((i) => !existing.has(cardId(i.kind, i.ref)))
    .map((i) => {
      const c = createEmptyCard(now);
      return {
        ...c,
        id: cardId(i.kind, i.ref),
        kind: i.kind,
        ref: i.ref,
        addedAt: now.getTime(),
        due: c.due.getTime(),
        last_review: null,
      };
    });
  if (fresh.length) await db.cards.bulkAdd(fresh);
  return fresh.length;
}

/** Когда карточка вернётся при каждой из четырёх оценок. */
export function previewDue(row: CardRow, now = new Date()): Record<number, number> {
  const p = scheduler.repeat(toInput(row), now);
  return Object.fromEntries(GRADES.map(({ grade }) => [grade, p[grade].card.due.getTime()]));
}

export async function gradeCard(row: CardRow, grade: Grade, now = new Date()): Promise<CardRow> {
  const { card } = scheduler.next(toInput(row), now, grade);
  const next: CardRow = {
    ...row,
    ...card,
    due: card.due.getTime(),
    last_review: card.last_review ? card.last_review.getTime() : now.getTime(),
  };
  await db.cards.put(next);
  return next;
}
