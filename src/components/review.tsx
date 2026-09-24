"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Grade } from "ts-fsrs";
import { content, lessonOrder } from "@/content";
import { db, type CardRow } from "@/lib/db";
import { fromNow, plural, shortInterval } from "@/lib/dates";
import { logReview } from "@/lib/progress";
import { GRADES, gradeCard, previewDue } from "@/lib/srs";
import { Ar, Tr } from "./ar";
import { AudioButton } from "./audio-button";
import { Button, buttonClass, Kbd } from "./button";

/** Если карточка вернётся раньше, чем через 10 минут, показываем её ещё раз в этой же сессии. */
const RELEARN_WINDOW_MS = 10 * 60 * 1000;

function describe(card: CardRow) {
  if (card.kind === "letter") {
    const l = content.letters[card.ref];
    return { ar: l?.char ?? card.ref, tr: l?.tr ?? "", ru: l ? `буква ${l.name}` : "", extra: l?.sound, audio: l?.audio };
  }
  const w = content.words[card.ref];
  return {
    ar: w?.ar ?? card.ref,
    tr: w?.tr ?? "",
    ru: w?.ru ?? "",
    extra: w?.root ? `корень ${w.root}` : undefined,
    audio: w?.audio,
  };
}

export function Review() {
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const startedAt = useRef(0);
  const sessionId = useRef<number | undefined>(undefined);
  const upcoming = useLiveQuery(() => db.cards.orderBy("due").limit(50).toArray(), []);

  useEffect(() => {
    startedAt.current = Date.now();
    db.cards
      .where("due")
      .belowOrEqual(Date.now())
      .sortBy("due")
      .then(setQueue);
  }, []);

  const card = queue?.[0];

  const grade = useCallback(
    async (g: Grade) => {
      if (!card || !revealed) return;
      const next = await gradeCard(card, g);
      const count = reviewed + 1;
      setReviewed(count);
      sessionId.current = await logReview(sessionId.current, startedAt.current, count);
      setRevealed(false);
      setQueue((q) => {
        const rest = (q ?? []).slice(1);
        return next.due - Date.now() < RELEARN_WINDOW_MS ? [...rest, next] : rest;
      });
    },
    [card, revealed, reviewed],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const onControl = (e.target as HTMLElement).closest("button, a, input");
      if (onControl && (e.key === " " || e.key === "Enter")) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      const g = GRADES.find((x) => x.key === e.key);
      if (revealed && g) grade(g.grade);
      if (revealed && e.key === "Enter") grade(GRADES[2].grade);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, grade]);

  if (queue === null) return <div className="h-96" aria-busy="true" />;

  if (!card) {
    const later = upcoming ?? [];
    const nextLesson = lessonOrder[0];
    return (
      <div className="mx-auto max-w-xl animate-rise pt-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-wash text-success">
          <Check size={30} strokeWidth={2} aria-hidden />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold">
          {reviewed ? `Повторено: ${reviewed}` : "Сейчас повторять нечего"}
        </h1>
        <p className="mt-3 text-ink-soft">
          {later.length
            ? `Следующие карточки ${fromNow(later[0].due)}. Всего в колоде: ${later.length}.`
            : "Карточки появятся после первого урока: каждая новая буква и слово попадают сюда."}
        </p>
        <Link href={later.length ? "/" : `/learn/${nextLesson.id}/`} className={buttonClass("primary", "lg", "mt-8")}>
          {later.length ? "На главную" : "К первому уроку"}
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    );
  }

  const d = describe(card);
  const preview = revealed ? previewDue(card) : null;
  const total = reviewed + queue.length;

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-2xl font-semibold">Повторение</h1>
        <p className="text-sm text-ink-soft tabular-nums" aria-live="polite">
          {reviewed} из {total}
        </p>
      </div>

      <article
        key={card.id + reviewed}
        className="mt-6 flex min-h-80 animate-rise flex-col items-center justify-center rounded-card border border-rule bg-sheet px-6 py-10 text-center"
        aria-label={card.kind === "letter" ? "Карточка буквы" : "Карточка слова"}
      >
        <p className="text-xs font-semibold tracking-[0.14em] text-ink-faint uppercase">
          {card.kind === "letter" ? "буква" : "слово"}
        </p>
        <Ar size="xl" className="mt-2 text-ink">
          {d.ar}
        </Ar>
        {d.audio && <AudioButton src={d.audio} />}
        {revealed ? (
          <div className="animate-rise">
            <Tr className="text-2xl text-rubric">{d.tr}</Tr>
            <p className="mt-1 text-lg">{d.ru}</p>
            {d.extra && <p className="mt-2 text-sm text-ink-soft">{d.extra}</p>}
          </div>
        ) : (
          <p className="mt-2 text-ink-faint">Вспомни чтение и значение</p>
        )}
      </article>

      <div className="mt-6">
        {revealed && preview ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Насколько легко вспомнилось">
            {GRADES.map(({ grade: g, label, key }) => (
              <button
                key={g}
                type="button"
                onClick={() => grade(g)}
                className={`flex flex-col items-center rounded-tile border px-3 py-3 transition-[transform,background-color] duration-(--duration-fast) active:scale-[0.98] ${
                  g === GRADES[0].grade
                    ? "border-danger/40 bg-danger-wash text-danger"
                    : "border-rule bg-sheet hover:bg-sheet-sunk"
                }`}
              >
                <span className="font-medium">{label}</span>
                <span className="text-xs text-ink-soft tabular-nums">
                  {shortInterval(preview[g])} <Kbd>{key}</Kbd>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
            Показать ответ <Kbd>Пробел</Kbd>
          </Button>
        )}
      </div>
      <p className="mt-4 text-center text-sm text-ink-faint">
        Осталось {queue.length} {plural(queue.length, "карточка", "карточки", "карточек")}
      </p>
    </div>
  );
}
