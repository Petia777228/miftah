"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Progress } from "@base-ui/react/progress";
import { ArrowRight, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { content, lessonNumber, nextLessonAfter } from "@/content";
import type { ExerciseStep, Lesson } from "@/content/types";
import { db } from "@/lib/db";
import { plural } from "@/lib/dates";
import { completeLesson, streakFrom } from "@/lib/progress";
import { Ar, Tr } from "../ar";
import { Button, buttonClass, Kbd } from "../button";
import {
  correctText,
  emptyAnswer,
  isExercise,
  isReady,
  judge,
  shuffled,
  type Answer,
  type Status,
  type Verdict,
} from "./exercise-types";
import { InputExercise, OptionsExercise, TheoryView, TilesExercise } from "./exercises";

const noop = () => () => {};
const PRAISE = ["Верно", "Точно", "Так и есть", "Правильно"];

/** Урок рендерится только на клиенте: порядок вариантов случайный, а прогресс живёт в IndexedDB. */
export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) {
    return (
      <div className="grid min-h-dvh place-items-center text-ink-faint" aria-busy="true">
        {lesson.title}
      </div>
    );
  }
  return <Session lesson={lesson} />;
}

type Result = { accuracy: number; added: number; streak: number };

function Session({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const steps = lesson.steps;
  const exerciseCount = steps.filter(isExercise).length;

  // Случайный порядок вариантов и плиток: один раз на урок.
  const [order] = useState(() =>
    Object.fromEntries(
      steps.filter(isExercise).map((s) => {
        if (s.type === "build" || s.type === "tiles") return [s.id, shuffled(s.bank, s.answer)];
        if (s.type === "input") return [s.id, []];
        return [s.id, shuffled(s.options)];
      }),
    ),
  );
  const [startedAt] = useState(() => Date.now());

  const [queue, setQueue] = useState<number[]>(() => steps.map((_, i) => i));
  const [cursor, setCursor] = useState(0);
  const [status, setStatus] = useState<Status>("answering");
  const [answer, setAnswer] = useState<Answer>(() => (isExercise(steps[0]) ? emptyAnswer(steps[0]) : { kind: "option", value: "" }));
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [praise, setPraise] = useState(PRAISE[0]);
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({});
  const [passed, setPassed] = useState<Set<number>>(new Set());
  const [exitOpen, setExitOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const saving = useRef(false);

  const index = queue[cursor];
  const step = steps[index];
  const progress = Math.round((passed.size / steps.length) * 100);

  const finish = useCallback(
    async (first: Record<string, boolean>) => {
      if (saving.current) return;
      saving.current = true;
      const values = Object.values(first);
      const accuracy = values.length ? values.filter(Boolean).length / values.length : 1;
      const { added } = await completeLesson(lesson, accuracy, startedAt, exerciseCount);
      const days = new Set((await db.sessions.toArray()).map((s) => s.day));
      setResult({ accuracy, added, streak: streakFrom(days, new Date()).streak });
    },
    [lesson, startedAt, exerciseCount],
  );

  const advance = useCallback(
    (nextQueue: number[], first: Record<string, boolean>) => {
      const nextCursor = cursor + 1;
      if (nextCursor >= nextQueue.length) {
        finish(first);
        return;
      }
      const s = steps[nextQueue[nextCursor]];
      setCursor(nextCursor);
      setStatus("answering");
      setVerdict(null);
      if (isExercise(s)) setAnswer(emptyAnswer(s));
    },
    [cursor, steps, finish],
  );

  const primary = useCallback(() => {
    if (result) {
      const next = nextLessonAfter(lesson.id);
      router.push(next ? `/learn/${next.id}/` : "/");
      return;
    }
    if (!isExercise(step)) {
      const p = new Set(passed).add(index);
      setPassed(p);
      advance(queue, firstTry);
      return;
    }
    if (status === "answering") {
      if (!isReady(answer)) return;
      const v = judge(step, answer, order[step.id] as string[]);
      setVerdict(v);
      setStatus(v.ok ? "correct" : "wrong");
      setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
      const first = step.id in firstTry ? firstTry : { ...firstTry, [step.id]: v.ok };
      setFirstTry(first);
      if (v.ok) setPassed(new Set(passed).add(index));
      // Ошибка: упражнение вернётся в конце урока.
      else setQueue((q) => [...q, index]);
      return;
    }
    advance(queue, firstTry);
  }, [result, step, status, answer, order, firstTry, passed, index, queue, advance, lesson.id, router]);

  const exit = useCallback(() => router.push("/course/"), [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || exitOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (result || cursor === 0) exit();
        else setExitOpen(true);
        return;
      }
      if (e.key === "Enter") {
        const t = e.target as HTMLElement;
        // Кнопки вариантов и плиток не перехватывают Enter: выбрал мышью, проверил клавишей.
        if (t.closest("a") || (t.tagName === "BUTTON" && !t.closest("[data-step]"))) return;
        e.preventDefault();
        primary();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary, exit, exitOpen, result, cursor]);

  const unit = content.units.find((u) => u.number === lesson.unit)!;

  if (result) return <FinishScreen lesson={lesson} result={result} onNext={primary} />;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-4 md:px-6 md:pt-6">
        <button
          type="button"
          onClick={() => (cursor === 0 ? exit() : setExitOpen(true))}
          aria-label="Выйти из урока (Esc)"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sheet-sunk hover:text-ink"
        >
          <X size={22} strokeWidth={1.75} aria-hidden />
        </button>
        <Progress.Root value={progress} aria-label="Прогресс урока" className="flex-1">
          <Progress.Track className="h-2.5 overflow-hidden rounded-full bg-sheet-sunk">
            <Progress.Indicator className="rounded-full bg-action transition-[width] duration-300 ease-out-soft" />
          </Progress.Track>
        </Progress.Root>
        <span className="w-12 text-right text-sm text-ink-faint tabular-nums">
          {passed.size}/{steps.length}
        </span>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 pb-60 sm:pb-40 md:pt-12">
        <p className="mb-4 text-xs font-semibold tracking-[0.14em] text-rubric uppercase">
          {unit.number === 0 ? "Вводный юнит" : `Юнит ${unit.number}`} · урок {lessonNumber(lesson.id)} · {lesson.title}
        </p>
        <div key={`${index}-${cursor}`} data-step={step.id}>
          {!isExercise(step) ? (
            <TheoryView step={step} />
          ) : step.type === "build" || step.type === "tiles" ? (
            <TilesExercise step={step} answer={answer} status={status} onAnswer={setAnswer} bank={order[step.id] as string[]} />
          ) : step.type === "input" ? (
            <InputExercise step={step} answer={answer} status={status} onAnswer={setAnswer} />
          ) : (
            <OptionsExercise step={step} answer={answer} status={status} onAnswer={setAnswer} options={order[step.id] as string[]} />
          )}
        </div>
      </main>

      <Footer
        step={step}
        status={status}
        verdict={verdict}
        praise={praise}
        ready={!isExercise(step) || isReady(answer)}
        onPrimary={primary}
      />

      <AlertDialog.Root open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-ink/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Popup className="fixed top-1/2 left-1/2 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-card border border-rule bg-sheet p-6 shadow-xl transition-[scale,opacity] duration-150 ease-out-soft data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0">
            <AlertDialog.Title className="font-serif text-xl font-semibold">Выйти из урока?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-ink-soft">
              Урок засчитывается целиком. Если выйти сейчас, начнёшь его заново.
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Close className={buttonClass("secondary")}>Остаться</AlertDialog.Close>
              <button type="button" onClick={exit} className={buttonClass("danger")}>
                Выйти
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

function Footer({
  step,
  status,
  verdict,
  praise,
  ready,
  onPrimary,
}: {
  step: Lesson["steps"][number];
  status: Status;
  verdict: Verdict | null;
  praise: string;
  ready: boolean;
  onPrimary: () => void;
}) {
  const exercise = isExercise(step);
  const tone = status === "correct" ? "bg-success-wash" : status === "wrong" ? "bg-danger-wash" : "bg-paper";
  const label = !exercise ? "Дальше" : status === "answering" ? "Проверить" : "Дальше";
  const note = exercise && "note" in step ? step.note : undefined;

  return (
    <footer className={`fixed inset-x-0 bottom-0 z-10 border-t border-rule pb-[env(safe-area-inset-bottom)] transition-colors duration-200 ${tone}`}>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
        <div className="min-h-12 flex-1" aria-live="polite">
          {status === "correct" && (
            <div className="animate-rise text-success">
              <p className="flex items-center gap-2 font-serif text-xl font-semibold">
                <Check size={22} strokeWidth={2.5} aria-hidden /> {praise}
              </p>
              {verdict?.translit && verdict.translit !== "exact" && exercise && (
                <p className="mt-1 text-ink-soft">
                  {verdict.translit === "typo" ? "Опечатка, но засчитано. " : ""}Точная запись: <Tr className="text-ink">{correctText(step)}</Tr>
                </p>
              )}
              {note && <p className="mt-1 text-[15px] text-ink-soft">{note}</p>}
            </div>
          )}
          {status === "wrong" && exercise && (
            <div className="animate-rise">
              <p className="font-serif text-xl font-semibold text-danger">Правильно так:</p>
              <p className="mt-1 text-ink">
                <CorrectAnswer step={step} />
              </p>
              {note && <p className="mt-1 text-[15px] text-ink-soft">{note}</p>}
              <p className="mt-1 text-sm text-ink-soft">Это упражнение вернётся в конце урока.</p>
            </div>
          )}
          {status === "answering" && exercise && (
            <p className="hidden pt-3 text-sm text-ink-faint [@media(hover:hover)_and_(min-width:640px)]:block">
              {step.type === "input" ? "Напиши и нажми Enter" : "Клавиши 1–9 выбирают, Enter проверяет, Esc выходит"}
            </p>
          )}
        </div>
        <Button
          size="lg"
          variant={status === "wrong" ? "danger" : status === "correct" ? "success" : "primary"}
          onClick={onPrimary}
          disabled={!ready}
          className="w-full sm:w-auto sm:min-w-44"
        >
          {label}
          <Kbd>Enter</Kbd>
        </Button>
      </div>
    </footer>
  );
}

function CorrectAnswer({ step }: { step: ExerciseStep }) {
  const text = correctText(step);
  if (step.type === "build" || (step.type === "tiles" && step.direction === "ru-ar")) return <Ar size="md">{text}</Ar>;
  if (step.type === "input" || step.type === "read") return <Tr className="text-xl">{text}</Tr>;
  if (/[؀-ۿ]/.test(text)) return <Ar size="md">{text}</Ar>;
  return <span className="text-lg">{text}</span>;
}

function FinishScreen({ lesson, result, onNext }: { lesson: Lesson; result: Result; onNext: () => void }) {
  const next = nextLessonAfter(lesson.id);
  const pct = Math.round(result.accuracy * 100);
  const newItems = useMemo(
    () => [...lesson.letters, ...lesson.words.map((w) => content.words[w]?.ar ?? w)],
    [lesson],
  );
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-12 text-center">
      <div className="animate-rise">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-wash text-success">
          <Check size={32} strokeWidth={2.25} aria-hidden />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold md:text-4xl" data-testid="lesson-done">
          Урок пройден
        </h1>
        <p className="mt-2 text-ink-soft">{lesson.title}</p>

        <dl className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3">
          <div className="rounded-card border border-rule bg-sheet p-4">
            <dt className="text-sm text-ink-soft">с первой попытки</dt>
            <dd className="font-serif text-3xl font-semibold tabular-nums">{pct}%</dd>
          </div>
          <div className="rounded-card border border-rule bg-sheet p-4">
            <dt className="text-sm text-ink-soft">серия</dt>
            <dd className="font-serif text-3xl font-semibold tabular-nums">
              {result.streak} <span className="text-base font-normal">{plural(result.streak, "день", "дня", "дней")}</span>
            </dd>
          </div>
        </dl>

        {newItems.length > 0 && (
          <div className="mt-8">
            <p className="text-sm text-ink-soft">
              {result.added > 0
                ? `В повторение добавлено ${result.added} ${plural(result.added, "карточка", "карточки", "карточек")}:`
                : "Эти карточки уже есть в повторении:"}
            </p>
            <Ar size="lg" className="mt-1 block text-rubric">
              {newItems.join("  ")}
            </Ar>
          </div>
        )}

        <div className="mt-10 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Link href="/" className={buttonClass("secondary", "lg")}>
            На главную
          </Link>
          <Button size="lg" onClick={onNext}>
            {next ? "Следующий урок" : "К началу"} <ArrowRight size={18} aria-hidden /> <Kbd>Enter</Kbd>
          </Button>
        </div>
        <p className="mt-6 text-xs text-ink-faint">Прогресс сохранён в этом браузере</p>
      </div>
    </div>
  );
}
