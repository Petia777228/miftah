"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, PenLine, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { content } from "@/content";
import { ALPHABET_ORDER, JOINING_RU, distinctForms, letterForm } from "@/content/arabic";
import type { BuiltLetter, BuiltWord } from "@/content/types";
import { learnedLetters, lessonForLetter, useDoneLessons } from "@/lib/learned";
import { Ar, Tr } from "./ar";
import { buttonClass } from "./button";
import { BACKDROP, POPUP } from "./modal";

const POSITIONS = [
  { key: "isolated", label: "отдельная" },
  { key: "initial", label: "начальная" },
  { key: "medial", label: "срединная" },
  { key: "final", label: "конечная" },
] as const;

const ROWS: BuiltLetter[] = [...ALPHABET_ORDER, "ء"].map((c) => content.letters[c]);
/** Слова в порядке курса: пример берём самый ранний. */
const WORDS: BuiltWord[] = Object.values(content.words).sort((a, b) => a.unit - b.unit);

/** Пример слова с буквой: только если все буквы слова уже пройдены. */
function exampleFor(char: string, learned: Set<string>): BuiltWord | undefined {
  return WORDS.find((w) => w.letters.includes(char) && w.letters.every((c) => learned.has(c)));
}

export function Alphabet() {
  const done = useDoneLessons();
  const learned = learnedLetters(done);
  const [open, setOpen] = useState<BuiltLetter | null>(null);

  return (
    <div className="animate-rise">
      <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">Алфавит</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        28 букв и хамза. Пройдено: <span className="font-semibold text-ink tabular-nums">{learned.size}</span> из 29.
        Нажми на букву, чтобы открыть карточку.
      </p>

      <div className="mt-8 overflow-hidden rounded-card border border-rule bg-sheet" role="table" aria-label="Буквы в четырёх позициях">
        <div role="row" className="grid grid-cols-[minmax(5.5rem,1.3fr)_repeat(4,1fr)] border-b border-rule text-xs text-ink-faint">
          <span role="columnheader" className="px-3 py-2.5 sm:px-5">буква</span>
          {POSITIONS.map((p) => (
            <span role="columnheader" key={p.key} className="py-2.5 text-center">
              <span className="hidden sm:inline">{p.label}</span>
              <span className="sm:hidden">{p.label.slice(0, 4)}.</span>
            </span>
          ))}
        </div>
        {ROWS.map((l) => {
          const isLearned = learned.has(l.char);
          return (
            <button
              key={l.char}
              type="button"
              role="row"
              onClick={() => setOpen(l)}
              aria-label={`${l.name}${isLearned ? ", пройдена" : ""}`}
              className="grid w-full grid-cols-[minmax(5.5rem,1.3fr)_repeat(4,1fr)] items-center border-b border-rule/70 text-left transition-colors last:border-b-0 hover:bg-sheet-sunk"
            >
              <span role="cell" className="flex items-center gap-2 px-3 py-1 sm:px-5">
                <span className={`text-[15px] ${isLearned ? "text-ink" : "text-ink-soft"}`}>{l.name}</span>
                {isLearned && <Check size={15} strokeWidth={2.5} className="text-success" aria-hidden />}
              </span>
              {POSITIONS.map((p) => (
                <span role="cell" key={p.key} className="text-center">
                  {l.joining === "none" && p.key !== "isolated" ? (
                    <span className="text-ink-faint">·</span>
                  ) : (
                    <Ar size="md" className={isLearned ? "text-rubric" : "text-ink"}>
                      {letterForm(l.char, l.joining, p.key)}
                    </Ar>
                  )}
                </span>
              ))}
            </button>
          );
        })}
      </div>

      <Dialog.Root open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className={BACKDROP} />
          <Dialog.Popup className={POPUP}>
            {open && <LetterCard letter={open} learned={learned} />}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function LetterCard({ letter, learned }: { letter: BuiltLetter; learned: Set<string> }) {
  const example = exampleFor(letter.char, learned);
  const lesson = lessonForLetter(letter.char);
  const isLearned = learned.has(letter.char);
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <Dialog.Title className="font-serif text-2xl font-semibold">{letter.name}</Dialog.Title>
          <p className="mt-0.5 text-ink-soft">
            звук <Tr className="text-lg text-ink">{letter.tr}</Tr> · юнит {letter.unit}
            {isLearned && <span className="text-success"> · пройдена</span>}
          </p>
        </div>
        <Dialog.Close aria-label="Закрыть" className="-mt-2 -mr-2 grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-sheet-sunk">
          <X size={20} aria-hidden />
        </Dialog.Close>
      </div>

      <div className="mt-4 flex justify-around rounded-tile bg-sheet-sunk py-2 text-center">
        {distinctForms(letter.char, letter.joining).map(({ position, form }) => (
          <div key={position}>
            <Ar size="lg" className="text-rubric">
              {form}
            </Ar>
            <p className="text-[11px] text-ink-faint">{POSITIONS.find((p) => p.key === position)!.label}</p>
          </div>
        ))}
      </div>

      <Dialog.Description className="mt-4 text-[15px] text-ink-soft">
        {letter.sound[0].toUpperCase() + letter.sound.slice(1)}. {JOINING_RU[letter.joining]}
      </Dialog.Description>

      {example && (
        <div className="mt-4 flex items-center gap-4 rounded-tile border border-rule px-4 py-2">
          <Ar size="lg">{example.ar}</Ar>
          <div>
            <Tr className="block text-lg">{example.tr}</Tr>
            <p className="text-sm text-ink-soft">{example.ru}</p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/copybook/?letters=${encodeURIComponent(letter.char)}`} className={buttonClass("primary")}>
          <PenLine size={17} aria-hidden /> Прописи для этой буквы
        </Link>
        {lesson && (
          <Link href={`/learn/${lesson.id}/`} className={buttonClass("secondary")}>
            Урок
          </Link>
        )}
      </div>
    </>
  );
}
