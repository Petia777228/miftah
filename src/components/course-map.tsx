"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { content, lessonNumber, lessonOrder } from "@/content";
import type { Unit } from "@/content/types";
import { db } from "@/lib/db";
import { Ar } from "./ar";
import { InlineText } from "./rich-text";

/** Номер юнита арабско-индийскими цифрами: маленькая деталь «как в книге». */
const arabicNumber = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

export function CourseMap() {
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  const done = new Set(progress?.map((p) => p.lessonId));
  const nextId = lessonOrder.find((l) => !done.has(l.id))?.id;

  return (
    <div className="animate-rise">
      <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">Карта курса</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        24 юнита по порядку учебника С. А. Кузьмина: буквы приходят группами вместе с грамматикой. Юниты 0–9
        бесплатные навсегда.
      </p>

      <ol className="mt-10 border-t border-rule">
        {content.units.map((u) => (
          <UnitRow key={u.number} unit={u} done={done} nextId={nextId} />
        ))}
      </ol>
    </div>
  );
}

function UnitRow({ unit, done, nextId }: { unit: Unit; done: Set<string>; nextId?: string }) {
  const locked = unit.lessons.length === 0;
  const finished = !locked && unit.lessons.every((l) => done.has(l.id));
  return (
    <li
      className={`grid grid-cols-[3rem_1fr] gap-x-4 border-b border-rule py-6 md:grid-cols-[4.5rem_1fr_auto] md:gap-x-8 ${locked ? "text-ink-faint" : ""}`}
      aria-label={`Юнит ${unit.number}: ${unit.title}${locked ? ", скоро" : ""}`}
    >
      <div className="row-span-2 flex flex-col items-start leading-none">
        <span className={`font-serif text-3xl font-semibold tabular-nums md:text-4xl ${locked ? "" : "text-rubric"}`}>
          {unit.number}
        </span>
        <Ar size="inherit" className="mt-1 text-lg opacity-70">
          {arabicNumber(unit.number)}
        </Ar>
      </div>

      <div className="min-w-0">
        <h2 className={`flex items-center gap-2 font-serif text-xl font-semibold ${locked ? "text-ink-soft" : "text-ink"}`}>
          {unit.number === 0 ? "Вводный: " : ""}
          <InlineText text={unit.title} />
          {locked && <Lock size={15} strokeWidth={2} aria-hidden className="shrink-0" />}
          {finished && <Check size={18} strokeWidth={2.25} aria-label="пройден" className="shrink-0 text-success" />}
        </h2>
        <p className="mt-1 text-[15px]">
          <InlineText text={unit.topics.join(" · ")} />
        </p>
      </div>

      {unit.letters.length > 0 && (
        <Ar
          size="md"
          className={`col-start-2 mt-1 text-right md:col-start-3 md:row-start-1 md:mt-0 ${locked ? "opacity-60" : "text-ink"}`}
        >
          {unit.letters.join(" ")}
        </Ar>
      )}

      {!locked && (
        <ol className="col-start-2 mt-4 flex flex-wrap gap-2 md:col-span-2">
          {unit.lessons.map((l) => {
            const isDone = done.has(l.id);
            const isNext = l.id === nextId;
            return (
              <li key={l.id}>
                <Link
                  href={`/learn/${l.id}/`}
                  className={`group flex items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 text-[15px] transition-colors ${
                    isNext
                      ? "border-action bg-sheet text-ink"
                      : "border-rule bg-sheet text-ink-soft hover:border-ink-faint hover:text-ink"
                  }`}
                  aria-label={`Урок ${lessonNumber(l.id)}: ${l.title}${isDone ? ", пройден" : isNext ? ", следующий" : ""}`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums ${
                      isDone ? "bg-action text-action-ink" : isNext ? "border-2 border-action text-action" : "bg-sheet-sunk"
                    }`}
                  >
                    {isDone ? <Check size={16} strokeWidth={2.5} aria-hidden /> : lessonNumber(l.id)}
                  </span>
                  <InlineText text={l.title} />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}
