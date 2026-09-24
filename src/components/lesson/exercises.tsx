"use client";

import { Delete } from "lucide-react";
import { useEffect, useRef } from "react";
import { isArabic } from "@/content/arabic";
import type { BuildStep, InputStep, OptionsStep, TheoryStep, TilesStep } from "@/content/types";
import { Ar, Mixed, Tr } from "../ar";
import { InlineText, RichText } from "../rich-text";
import type { Answer, Status } from "./exercise-types";

type Props<S> = {
  step: S;
  answer: Answer;
  status: Status;
  onAnswer: (a: Answer) => void;
};

/** Обёртка экрана упражнения: вопрос сверху, дальше содержимое. */
function Frame({ prompt, children }: { prompt: string; children: React.ReactNode }) {
  return (
    <div className="animate-rise">
      <h2 className="font-serif text-xl font-semibold md:text-2xl">
        <InlineText text={prompt} />
      </h2>
      {children}
    </div>
  );
}

/** Карточка с арабским «экспонатом» или русской фразой. */
function Exhibit({ text }: { text: string }) {
  return (
    <div className="mt-6 grid min-h-36 place-items-center rounded-card border border-rule bg-sheet px-4 py-4">
      {isArabic(text) ? (
        <Ar size="xl" className="text-ink">
          {text}
        </Ar>
      ) : (
        <p className="font-serif text-2xl">{text}</p>
      )}
    </div>
  );
}

/* ---------- Теория ---------- */

export function TheoryView({ step }: { step: TheoryStep }) {
  return (
    <div className="animate-rise">
      <RichText text={step.text} className="text-lg leading-relaxed md:text-xl" />
      {step.examples.length > 0 && (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {step.examples.map((e, i) => (
            <li key={i} className="flex items-center gap-4 rounded-card border border-rule bg-sheet px-5 py-3">
              <Ar size="lg" className="min-w-16 text-center text-rubric">
                {e.ar}
              </Ar>
              <div className="min-w-0">
                {e.tr && <Tr className="block text-xl">{e.tr}</Tr>}
                {e.ru && <p className="text-[15px] text-ink-soft">{e.ru}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- 1, 2, 4: выбор варианта ---------- */

function optionTone(opt: string, answer: Answer, status: Status, correct: string) {
  const picked = answer.kind === "option" && answer.value === opt;
  if (status !== "answering") {
    if (opt === correct) return "border-success bg-success-wash";
    if (picked) return "border-danger bg-danger-wash animate-shake";
    return "border-rule bg-sheet opacity-60";
  }
  return picked ? "border-action bg-sheet ring-2 ring-action/30" : "border-rule bg-sheet hover:border-ink-faint";
}

export function OptionsExercise({ step, answer, status, onAnswer, options }: Props<OptionsStep> & { options: string[] }) {
  useDigitKeys(status === "answering", options.length, (i) => onAnswer({ kind: "option", value: options[i] }));
  const long = options.some((o) => !isArabic(o) && o.length > 14);
  return (
    <Frame prompt={step.prompt}>
      {step.show && <Exhibit text={step.show} />}
      <div
        role="radiogroup"
        aria-label="Варианты ответа"
        className={`mt-6 grid gap-3 ${long ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {options.map((opt, i) => {
          const picked = answer.kind === "option" && answer.value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={picked}
              data-option={opt}
              disabled={status !== "answering"}
              onClick={() => onAnswer({ kind: "option", value: opt })}
              className={`relative flex min-h-16 items-center justify-center rounded-tile border-2 px-10 py-4 text-lg transition-[transform,border-color,background-color] duration-(--duration-fast) active:scale-[0.99] disabled:cursor-default ${optionTone(opt, answer, status, step.answer)}`}
            >
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-ink-faint tabular-nums">{i + 1}</span>
              {isArabic(opt) ? (
                <Ar size="lg">{opt}</Ar>
              ) : step.type === "read" ? (
                <Tr className="text-xl">{opt}</Tr>
              ) : (
                <span>{opt}</span>
              )}
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

/* ---------- 3 и 5: сборка из плиток ---------- */

export function TilesExercise({
  step,
  answer,
  status,
  onAnswer,
  bank,
}: Props<BuildStep | TilesStep> & { bank: string[] }) {
  const picked = answer.kind === "tiles" ? answer.picked : [];
  const free = bank.map((_, i) => i).filter((i) => !picked.includes(i));
  const arabicAnswer = step.type === "build" || step.direction === "ru-ar";
  const locked = status !== "answering";

  const pick = (i: number) => !locked && !picked.includes(i) && onAnswer({ kind: "tiles", picked: [...picked, i] });
  const unpick = (i: number) => !locked && onAnswer({ kind: "tiles", picked: picked.filter((x) => x !== i) });

  useDigitKeys(!locked, bank.length, (n) => pick(n));
  useEffect(() => {
    if (locked || answer.kind !== "tiles") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && answer.picked.length) onAnswer({ kind: "tiles", picked: answer.picked.slice(0, -1) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, answer, onAnswer]);

  const tone =
    status === "correct" ? "border-success bg-success-wash" : status === "wrong" ? "border-danger bg-danger-wash" : "border-rule bg-sheet";

  return (
    <Frame prompt={step.prompt}>
      {step.type === "build" ? (
        <p className="mt-2 text-ink-soft">
          <Tr className="text-lg text-ink">{step.hint.split(" · ")[0]}</Tr> · {step.hint.split(" · ")[1]}
        </p>
      ) : (
        <Exhibit text={step.source} />
      )}

      {/* Строка ответа: как линейка прописи. */}
      <div
        dir={arabicAnswer ? "rtl" : "ltr"}
        aria-label="Собранный ответ"
        className="mt-6 flex min-h-20 flex-wrap items-end gap-2 border-b-2 border-rule pb-2"
      >
        {picked.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => unpick(i)}
            disabled={locked}
            aria-label={`Убрать ${bank[i]}`}
            className={`animate-rise rounded-tile border-2 px-3.5 py-1 ${tone}`}
          >
            <Mixed text={bank[i]} size={step.type === "build" ? "lg" : "md"} className={arabicAnswer ? "" : "text-lg"} />
          </button>
        ))}
        {picked.length > 0 && !locked && (
          <button
            type="button"
            onClick={() => onAnswer({ kind: "tiles", picked: picked.slice(0, -1) })}
            aria-label="Убрать последнюю плитку"
            className="ms-auto self-center rounded-full p-2 text-ink-faint hover:text-ink"
          >
            <Delete size={20} strokeWidth={1.75} aria-hidden className={arabicAnswer ? "-scale-x-100" : ""} />
          </button>
        )}
      </div>
      {step.type === "build" && picked.length > 0 && (
        <p className="mt-3 text-center text-ink-soft">
          вместе: <Ar size="md" className="text-ink">{picked.map((i) => bank[i]).join("")}</Ar>
        </p>
      )}

      <div dir={arabicAnswer ? "rtl" : "ltr"} className="mt-6 flex flex-wrap justify-center gap-2.5" aria-label="Плитки">
        {bank.map((t, i) => {
          const used = !free.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              data-tile={t}
              disabled={used || locked}
              aria-hidden={used}
              tabIndex={used ? -1 : 0}
              className={`relative rounded-tile border-2 border-rule bg-sheet px-4 py-1.5 transition-[transform,opacity] duration-(--duration-fast) active:scale-95 ${
                used ? "opacity-0" : "hover:border-ink-faint"
              }`}
            >
              <span className="absolute -top-2 -left-1.5 rounded-full bg-paper px-1 text-[11px] text-ink-faint tabular-nums" dir="ltr">
                {i + 1}
              </span>
              <Mixed text={t} size={step.type === "build" ? "lg" : "md"} className={isArabic(t) ? "" : "text-lg"} />
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

/* ---------- 6: ввод транскрипцией ---------- */

export function InputExercise({ step, answer, status, onAnswer }: Props<InputStep>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (status === "answering") ref.current?.focus();
  }, [status]);
  const value = answer.kind === "text" ? answer.value : "";
  const tone =
    status === "correct" ? "border-success" : status === "wrong" ? "border-danger animate-shake" : "border-rule focus:border-action";
  return (
    <Frame prompt={step.prompt}>
      <Exhibit text={step.show} />
      <label className="mt-6 block">
        <span className="sr-only">Транскрипция</span>
        <input
          ref={ref}
          value={value}
          onChange={(e) => onAnswer({ kind: "text", value: e.target.value })}
          readOnly={status !== "answering"}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          placeholder="русскими буквами"
          className={`tr h-16 w-full rounded-tile border-2 bg-sheet px-5 text-2xl outline-none transition-colors placeholder:font-sans placeholder:text-lg placeholder:text-ink-faint ${tone}`}
        />
      </label>
      <p className="mt-2 text-sm text-ink-faint">Долготу и точки под буквами можно не ставить. Латиница тоже подойдёт.</p>
    </Frame>
  );
}

/* ---------- клавиши 1–9 ---------- */

function useDigitKeys(enabled: boolean, count: number, onDigit: (index: number) => void) {
  const cb = useRef(onDigit);
  useEffect(() => {
    cb.current = onDigit;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, count)) {
        e.preventDefault();
        cb.current(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, count]);
}

