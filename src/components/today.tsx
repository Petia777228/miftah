"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Flame, Layers } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { content, lessonNumber, lessonOrder } from "@/content";
import type { Lesson } from "@/content/types";
import { db } from "@/lib/db";
import { addDays, dayKey, plural } from "@/lib/dates";
import { streakFrom } from "@/lib/progress";
import { useDailyGoal } from "@/lib/settings";
import { Ar, Tr } from "./ar";
import { buttonClass, Kbd } from "./button";
import { GoalPicker } from "./goal-picker";
import { InlineText } from "./rich-text";

/** Сколько карточек должно накопиться, чтобы «Продолжить» вело в повторение, а не в новый урок. */
const REVIEW_FIRST_AT = 10;

const noop = () => () => {};
/** Сегодняшняя дата только на клиенте: статическая сборка не знает, какой сегодня день. */
function useToday(): string | null {
  return useSyncExternalStore(noop, () => dayKey(), () => null);
}

/** Что показать крупно на карточке урока: буквы урока или первые примеры теории. */
function lessonGlyphs(lesson: Lesson): string {
  if (lesson.letters.length) return lesson.letters.join(" ");
  for (const s of lesson.steps) if (s.type === "theory" && s.examples.length) return s.examples.slice(0, 3).map((e) => e.ar).join(" ");
  return "مِفْتَاح";
}

export function Today() {
  const router = useRouter();
  const today = useToday();
  const goal = useDailyGoal();
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const due = useLiveQuery(() => db.cards.where("due").belowOrEqual(Date.now()).count(), []);

  const done = new Set(progress?.map((p) => p.lessonId));
  const next = lessonOrder.find((l) => !done.has(l.id));
  const nextLesson = next ? content.lessons[next.id] : undefined;
  const reviewFirst = (due ?? 0) >= REVIEW_FIRST_AT || (!next && (due ?? 0) > 0);
  const href = reviewFirst ? "/review/" : next ? `/learn/${next.id}/` : "/course/";

  const days = new Set(sessions?.map((s) => s.day));
  const now = today ? new Date(`${today}T12:00:00`) : null;
  const { streak, doneToday } = now ? streakFrom(days, now) : { streak: 0, doneToday: false };
  const minutesToday = sessions?.filter((s) => s.day === today).reduce((sum, s) => sum + s.minutes, 0) ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && document.activeElement === document.body) router.push(href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [href, router]);

  const unit = next ? content.units.find((u) => u.number === next.unit) : undefined;

  // Пока IndexedDB не ответила, ничего не показываем: иначе вернувшийся ученик увидит экран гостя.
  if (!progress || !sessions) return <div className="min-h-[60dvh]" aria-busy="true" />;
  if (progress.length === 0 && sessions.length === 0) return <Welcome />;

  return (
    <div className="animate-rise">
      <p className="font-serif text-[15px] text-ink-faint first-letter:uppercase" aria-live="polite">
        {now ? now.toLocaleDateString("ru", { weekday: "long", day: "numeric", month: "long" }) : " "}
      </p>
      <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
        {doneToday ? "Сегодня уже занимались" : streak > 0 ? "Не прерывай серию" : "Начнём с первой буквы"}
      </h1>

      <div className="mt-8 grid gap-5 md:grid-cols-[1.55fr_1fr]">
        <article className="relative overflow-hidden rounded-card border border-rule bg-sheet p-6 md:p-8">
          {reviewFirst ? (
            <>
              <p className="text-xs font-semibold tracking-[0.14em] text-rubric uppercase">Повторение</p>
              <div className="mt-6 flex items-center gap-4 text-ink-soft">
                <Layers size={40} strokeWidth={1.25} aria-hidden />
                <p className="font-serif text-5xl font-semibold text-ink tabular-nums">{due}</p>
              </div>
              <h2 className="mt-4 font-serif text-2xl font-semibold">
                {plural(due ?? 0, "карточка ждёт", "карточки ждут", "карточек ждут")} повторения
              </h2>
              <p className="mt-2 text-ink-soft">Сначала повторим, потом новый урок: так буквы не забываются.</p>
            </>
          ) : nextLesson && unit ? (
            <>
              <p className="text-xs font-semibold tracking-[0.14em] text-rubric uppercase">
                {unit.number === 0 ? "Вводный юнит" : `Юнит ${unit.number}`} · урок {lessonNumber(nextLesson.id)} из {unit.lessons.length}
              </p>
              <Ar size="xl" className="mt-4 block text-right text-rubric md:mt-2">
                {lessonGlyphs(nextLesson)}
              </Ar>
              <h2 className="mt-2 font-serif text-2xl font-semibold">
                <InlineText text={nextLesson.title} />
              </h2>
              <p className="mt-1 text-ink-soft">
                {next!.exercises} {plural(next!.exercises, "упражнение", "упражнения", "упражнений")} · около{" "}
                {Math.max(2, Math.round(next!.exercises * 0.4))} мин
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-[0.14em] text-rubric uppercase">Курс</p>
              <h2 className="mt-4 font-serif text-2xl font-semibold">Все готовые уроки пройдены</h2>
              <p className="mt-2 text-ink-soft">Юнит 2 с буквами ب ت ث ن م ي появится в следующем обновлении.</p>
            </>
          )}
          <Link href={href} className={buttonClass("primary", "lg", "mt-7 w-full sm:w-auto")}>
            {reviewFirst ? "Повторить" : next ? (done.size ? "Продолжить" : "Начать") : "Открыть карту курса"}
            <ArrowRight size={18} aria-hidden />
            <Kbd>Enter</Kbd>
          </Link>
        </article>

        <aside className="grid gap-5 sm:grid-cols-2 md:grid-cols-1">
          <section className="rounded-card border border-rule bg-sheet p-6" aria-label="Серия занятий">
            <div className="flex items-center gap-3">
              <Flame
                size={28}
                strokeWidth={1.75}
                className={doneToday ? "text-rubric" : "text-ink-faint"}
                aria-hidden
              />
              <p className="font-serif text-4xl font-semibold tabular-nums" data-testid="streak">
                {streak}
              </p>
              <p className="leading-tight text-ink-soft">
                {plural(streak, "день", "дня", "дней")}
                <br />
                подряд
              </p>
            </div>
            <WeekStrip days={days} now={now} />
          </section>

          <section className="rounded-card border border-rule bg-sheet p-6" aria-label="Цель на день">
            <div className="flex items-center gap-5">
              <GoalRing value={minutesToday} goal={goal} />
              <div>
                <p className="font-medium">
                  {Math.round(minutesToday)} из {goal} мин
                </p>
                <p className="text-sm text-ink-soft">{minutesToday >= goal ? "Цель на сегодня выполнена" : "цель на сегодня"}</p>
              </div>
            </div>
            <GoalPicker className="mt-5" />
          </section>

          {!reviewFirst && (due ?? 0) > 0 && (
            <Link
              href="/review/"
              className="flex items-center justify-between rounded-card border border-rule bg-sheet px-6 py-4 transition-colors hover:bg-sheet-sunk sm:col-span-2 md:col-span-1"
            >
              <span className="flex items-center gap-3">
                <Layers size={20} strokeWidth={1.75} className="text-ink-soft" aria-hidden />К повторению
              </span>
              <span className="font-semibold tabular-nums">{due}</span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Первый заход: что это и одна кнопка. */
function Welcome() {
  const first = lessonOrder[0];
  return (
    <section className="grid animate-rise items-center gap-10 pt-2 md:grid-cols-[1.2fr_1fr] md:pt-8" aria-labelledby="welcome-title">
      <div>
        <h1 id="welcome-title" className="font-serif text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
          Арабский с нуля: классический язык, фусха
        </h1>
        <p className="mt-5 max-w-lg text-lg text-ink-soft">
          Курс идёт по порядку вузовского учебника С. А. Кузьмина: буквы приходят вместе с грамматикой, к четвёртому юниту
          читаешь первые фразы.
        </p>
        <p className="mt-3 max-w-lg text-lg text-ink-soft">
          Бесплатно и без регистрации. После первого захода работает без интернета, прописи печатаются на A4.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href={`/learn/${first.id}/`} className={buttonClass("primary", "lg")}>
            Начать первый урок <ArrowRight size={18} aria-hidden />
            <Kbd>Enter</Kbd>
          </Link>
          <Link href="/course/" className={buttonClass("ghost", "lg")}>
            Карта курса
          </Link>
        </div>
      </div>
      <div className="order-first text-center md:order-none md:text-right" aria-hidden>
        <Ar size="inherit" className="block text-[5.5rem] leading-[1.6] text-rubric md:text-[10rem]">
          مِفْتَاح
        </Ar>
        <p className="font-serif text-ink-soft">
          <Tr>мифта̄х̣</Tr> · ключ
        </p>
      </div>
    </section>
  );
}

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function WeekStrip({ days, now }: { days: Set<string>; now: Date | null }) {
  const cells = now ? Array.from({ length: 7 }, (_, i) => addDays(now, i - 6)) : [];
  return (
    <ol className="mt-5 flex justify-between" aria-label="Последние 7 дней">
      {cells.map((d) => {
        const on = days.has(dayKey(d));
        return (
          <li key={dayKey(d)} className="flex flex-col items-center gap-1.5 text-[11px] text-ink-faint">
            <span
              className={`h-3 w-3 rounded-full ${on ? "bg-rubric" : "border border-rule bg-sheet-sunk"}`}
              aria-label={`${d.toLocaleDateString("ru", { day: "numeric", month: "long" })}: ${on ? "занимались" : "нет занятий"}`}
            />
            {WEEKDAYS[d.getDay()]}
          </li>
        );
      })}
    </ol>
  );
}

function GoalRing({ value, goal }: { value: number; goal: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const part = Math.min(1, value / goal);
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`Выполнено ${Math.round(part * 100)}% цели`}>
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-sheet-sunk" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        className="stroke-action transition-[stroke-dashoffset] duration-500 ease-out-soft"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - part)}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}
