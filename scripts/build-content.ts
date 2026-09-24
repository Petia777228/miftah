/**
 * Сборка контента: content/*.yaml → src/generated/content.json.
 * Проверяет схему (zod) и методику: слово урока не может содержать непройденную букву
 * или знак, который по Кузьмину вводится позже. Любая ошибка → код выхода 1.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { MARK_RU, POSITION_RU, analyze, arabicRuns, graphemes, isArabic, letterForm } from "../src/content/arabic";
import {
  courseSchema,
  letterSchema,
  unitFileSchema,
  type Letter,
  type MarkName,
  type StepSource,
  type UnitFile,
} from "../src/content/schema";
import type { BuiltWord, Content, Example, Lesson, Step, Unit } from "../src/content/types";

z.config(z.locales.ru());

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const OUT = path.join(ROOT, "src/generated/content.json");
const AUDIO = path.join(ROOT, "public/audio");

const errors: string[] = [];
const rel = (p: string) => path.relative(ROOT, p);

function load<T>(file: string, schema: z.ZodType<T>): T | null {
  let raw: unknown;
  try {
    raw = parse(readFileSync(file, "utf8"));
  } catch (e) {
    errors.push(`${rel(file)}\n  YAML не читается: ${(e as Error).message}`);
    return null;
  }
  const res = schema.safeParse(raw);
  if (res.success) return res.data;
  for (const issue of res.error.issues) {
    errors.push(`${rel(file)}\n  поле ${issue.path.join(".") || "(корень)"}: ${issue.message}`);
  }
  return null;
}

const letters = load(path.join(CONTENT, "letters.yaml"), z.array(letterSchema)) ?? [];
const course = load(path.join(CONTENT, "course.yaml"), courseSchema);
const unitFiles = readdirSync(path.join(CONTENT, "units"))
  .filter((f) => f.endsWith(".yaml"))
  .sort()
  .map((f) => ({ file: path.join(CONTENT, "units", f), data: load(path.join(CONTENT, "units", f), unitFileSchema) }))
  .filter((u): u is { file: string; data: UnitFile } => u.data !== null);

if (!course || errors.length) finish();

const letterByChar = new Map<string, Letter>(letters.map((l) => [l.char, l]));
const knownChars = new Set(letterByChar.keys());
const courseUnits = course!.units;
const courseByNumber = new Map(courseUnits.map((u) => [u.number, u]));

/** Знаки, разрешённые к юниту N: объединение marks всех юнитов ≤ N. */
const marksUpTo = (unit: number) =>
  new Set<MarkName>(courseUnits.filter((u) => u.number <= unit).flatMap((u) => u.marks ?? []));

const letterName = (c: string) => {
  const l = letterByChar.get(c);
  return l ? `${c} (${l.name})` : `«${c}» (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`;
};

const words: Record<string, BuiltWord> = {};
const lessons: Record<string, Lesson> = {};
const units: Unit[] = [];
/** Где вводится буква: id урока. */
const letterLesson = new Map<string, string>();

for (const { file, data } of unitFiles) {
  const where = rel(file);
  const unitMeta = courseByNumber.get(data.unit);
  if (!unitMeta) {
    errors.push(`${where}\n  юнита ${data.unit} нет в content/course.yaml`);
    continue;
  }
  const unitLetters = letters.filter((l) => l.unit === data.unit).map((l) => l.char);
  const earlier = new Set(letters.filter((l) => l.unit < data.unit).map((l) => l.char));
  const allowedMarks = marksUpTo(data.unit);
  const wordById = new Map(data.words.map((w) => [w.id, w]));
  const wordLesson = new Map<string, string>();

  for (const w of data.words) {
    if (words[w.id]) errors.push(`${where}\n  слово ${w.id}: такой id уже есть в юните ${words[w.id].unit}`);
  }

  // Где по плану вводится каждая буква юнита: для понятной ошибки «вводится в уроке u1-l2».
  const plannedLesson = new Map(data.lessons.flatMap((l) => (l.letters ?? []).map((c) => [c, l.id] as const)));

  // Буквы, пройденные к началу каждого урока.
  const available = new Set(earlier);
  const lessonSummaries: Unit["lessons"] = [];

  for (const lesson of data.lessons) {
    if (lessons[lesson.id]) errors.push(`${where}\n  урок ${lesson.id}: id повторяется`);
    if (!lesson.id.startsWith(`u${data.unit}-`)) {
      errors.push(`${where}\n  урок ${lesson.id}: id должен начинаться с u${data.unit}-`);
    }
    for (const c of lesson.letters ?? []) {
      const l = letterByChar.get(c);
      if (!l) errors.push(`${where}\n  урок ${lesson.id}: буквы ${letterName(c)} нет в letters.yaml`);
      else if (l.unit !== data.unit)
        errors.push(`${where}\n  урок ${lesson.id}: буква ${letterName(c)} по методике вводится в юните ${l.unit}, а не ${data.unit}`);
      else if (letterLesson.has(c)) errors.push(`${where}\n  урок ${lesson.id}: буква ${letterName(c)} уже введена в ${letterLesson.get(c)}`);
      else {
        letterLesson.set(c, lesson.id);
        available.add(c);
      }
    }

    /** Проверка одной арабской строки на пройденные буквы и знаки. */
    const check = (text: string, place: string) => {
      const a = analyze(text, knownChars);
      const problems: string[] = [];
      for (const c of a.unknown) problems.push(`символ ${letterName(c)} не описан в letters.yaml и arabic.ts`);
      for (const c of a.letters) {
        if (available.has(c)) continue;
        const l = letterByChar.get(c)!;
        const intro = plannedLesson.get(c);
        problems.push(
          l.unit === data.unit
            ? `буква ${letterName(c)} ещё не пройдена: она вводится ${intro ? `в уроке ${intro}` : "в более позднем уроке"} этого юнита`
            : `буква ${letterName(c)} ещё не пройдена: по методике она вводится в юните ${l.unit}`,
        );
      }
      for (const m of a.marks) {
        if (allowedMarks.has(m)) continue;
        const from = courseUnits.find((u) => u.marks?.includes(m))?.number;
        problems.push(`знак ${MARK_RU[m]} ещё не пройден: он вводится в юните ${from ?? "?"}`);
      }
      if (problems.length) {
        errors.push(
          `${where}\n  урок ${lesson.id}, ${place} · «${text}»\n    ` +
            problems.join("\n    ") +
            `\n    К этому месту пройдены буквы: ${[...available].join(" ") || "нет"}`,
        );
      }
    };
    const checkIfArabic = (text: string, place: string) => isArabic(text) && check(text, place);

    for (const id of lesson.words ?? []) {
      const w = wordById.get(id);
      if (!w) {
        errors.push(`${where}\n  урок ${lesson.id}: слова ${id} нет в words этого юнита`);
        continue;
      }
      if (wordLesson.has(id)) errors.push(`${where}\n  слово ${id} вводится дважды: ${wordLesson.get(id)} и ${lesson.id}`);
      wordLesson.set(id, lesson.id);
      check(w.ar, `слово ${id}`);
    }

    const steps: Step[] = lesson.steps.map((s, i) => {
      const id = `${lesson.id}-s${i + 1}`;
      const place = `шаг ${i + 1} (${s.type})`;
      return buildStep(s, id, place, { check, checkIfArabic, wordById, available, where, lessonId: lesson.id });
    });

    const exercises = steps.filter((s) => s.type !== "theory").length;
    if (exercises === 0) errors.push(`${where}\n  урок ${lesson.id}: нет ни одного упражнения`);

    lessons[lesson.id] = {
      id: lesson.id,
      unit: data.unit,
      kind: lesson.kind,
      title: lesson.title,
      letters: lesson.letters ?? [],
      words: lesson.words ?? [],
      steps,
    };
    lessonSummaries.push({ id: lesson.id, kind: lesson.kind, title: lesson.title, letters: lesson.letters ?? [], exercises });
  }

  for (const w of data.words) {
    const lessonId = wordLesson.get(w.id);
    if (!lessonId) {
      errors.push(`${where}\n  слово ${w.id} не привязано ни к одному уроку (добавь его в words урока)`);
      continue;
    }
    const audio = path.join("words", `${w.id}.mp3`);
    words[w.id] = { ...w, unit: data.unit, lesson: lessonId, ...(existsSync(path.join(AUDIO, audio)) ? { audio } : {}) };
  }
  for (const c of unitLetters) {
    if (!letterLesson.has(c)) errors.push(`${where}\n  буква ${letterName(c)} юнита ${data.unit} не введена ни в одном уроке`);
  }

  units.push({ ...unitMeta, topics: unitMeta.topics, letters: unitLetters, lessons: lessonSummaries });
}

// Юниты без контента: показываются на карте курса замками.
for (const u of courseUnits) {
  if (!units.some((x) => x.number === u.number)) {
    units.push({ ...u, letters: letters.filter((l) => l.unit === u.number).map((l) => l.char), lessons: [] });
  }
}
units.sort((a, b) => a.number - b.number);

type Ctx = {
  check: (text: string, place: string) => void;
  checkIfArabic: (text: string, place: string) => void;
  wordById: Map<string, UnitFile["words"][number]>;
  available: Set<string>;
  where: string;
  lessonId: string;
};

function assertOptions(correct: string, wrong: string[], ctx: Ctx, place: string) {
  if (wrong.includes(correct)) errors.push(`${ctx.where}\n  урок ${ctx.lessonId}, ${place}: верный ответ повторяется среди неверных`);
  if (new Set(wrong).size !== wrong.length) errors.push(`${ctx.where}\n  урок ${ctx.lessonId}, ${place}: неверные варианты повторяются`);
}

function buildStep(s: StepSource, id: string, place: string, ctx: Ctx): Step {
  switch (s.type) {
    case "theory": {
      const examples: Example[] = s.examples ?? [];
      if (!s.showcase) {
        arabicRuns(s.text).forEach((r) => ctx.check(r, `${place}, текст`));
        examples.forEach((e, i) => ctx.check(e.ar, `${place}, пример ${i + 1}`));
      }
      return { id, type: "theory", text: s.text.trim(), examples };
    }
    case "choice":
    case "read": {
      assertOptions(s.correct, s.wrong, ctx, place);
      if (s.show) ctx.checkIfArabic(s.show, place);
      [s.correct, ...s.wrong].forEach((o) => ctx.checkIfArabic(o, `${place}, вариант`));
      return {
        id,
        type: s.type,
        prompt: s.type === "read" ? "Как это читается?" : s.prompt,
        show: s.show,
        options: [s.correct, ...s.wrong],
        answer: s.correct,
        note: s.note,
      };
    }
    case "position": {
      const l = letterByChar.get(s.letter);
      if (!l) {
        errors.push(`${ctx.where}\n  урок ${ctx.lessonId}, ${place}: буквы ${letterName(s.letter)} нет в letters.yaml`);
        return { id, type: "position", prompt: "", options: [], answer: "" };
      }
      ctx.check(s.letter, place);
      const answer = letterForm(l.char, l.joining, s.position);
      const pool = new Set<string>([answer]);
      // Остальные реальные формы этой буквы, затем «несуществующая» связка слева, затем та же позиция у других букв.
      for (const p of ["isolated", "initial", "medial", "final"] as const) pool.add(letterForm(l.char, l.joining, p));
      pool.add(l.char + "ـ");
      pool.add("ـ" + l.char + "ـ");
      for (const c of ctx.available) {
        if (pool.size >= 4) break;
        const other = letterByChar.get(c)!;
        pool.add(letterForm(other.char, other.joining, s.position));
      }
      const options = [...pool].slice(0, 4);
      const note =
        l.joining === "right"
          ? `${l.name[0].toUpperCase() + l.name.slice(1)} не соединяется с буквой слева: в начале слова пишется как отдельная, в середине как конечная.`
          : undefined;
      return { id, type: "position", prompt: `Найди ${POSITION_RU[s.position]} форму буквы ${l.char}`, options, answer, note };
    }
    case "build": {
      const w = ctx.wordById.get(s.word);
      if (!w) {
        errors.push(`${ctx.where}\n  урок ${ctx.lessonId}, ${place}: слова ${s.word} нет в words юнита`);
        return { id, type: "build", prompt: "", hint: "", bank: [], answer: [] };
      }
      ctx.check(w.ar, place);
      (s.extra ?? []).forEach((e) => ctx.check(e, `${place}, лишняя плитка`));
      const answer = graphemes(w.ar);
      return { id, type: "build", prompt: "Собери слово", hint: `${w.tr} · ${w.ru}`, bank: [...answer, ...(s.extra ?? [])], answer };
    }
    case "tiles": {
      const arSide = s.direction === "ar-ru" ? [s.source] : [...s.answer, ...(s.extra ?? [])];
      arSide.forEach((t) => ctx.check(t, place));
      return {
        id,
        type: "tiles",
        direction: s.direction,
        prompt: s.direction === "ar-ru" ? "Переведи на русский" : "Переведи на арабский",
        source: s.source,
        bank: [...s.answer, ...(s.extra ?? [])],
        answer: s.answer,
      };
    }
    case "input": {
      ctx.checkIfArabic(s.show, place);
      return { id, type: "input", prompt: s.prompt, show: s.show, answer: s.answer, accept: s.also ?? [] };
    }
  }
}

finish();

function finish(): never {
  if (errors.length) {
    console.error(`\n✖ Контент не собран: ${errors.length} ${plural(errors.length)}\n`);
    for (const e of errors) console.error(e + "\n");
    process.exit(1);
  }
  const lettersOut: Content["letters"] = Object.fromEntries(
    letters.map((l) => {
      const audio = path.join("letters", `${l.name}-${l.char.codePointAt(0)!.toString(16)}.mp3`);
      return [l.char, { ...l, ...(existsSync(path.join(AUDIO, audio)) ? { audio } : {}) }];
    }),
  );
  const content: Content = { units, lessons, words, letters: lettersOut };
  mkdirSync(path.dirname(OUT), { recursive: true });
  const json = JSON.stringify(content, null, 1);
  if (!existsSync(OUT) || readFileSync(OUT, "utf8") !== json) writeFileSync(OUT, json);
  const lessonCount = Object.keys(lessons).length;
  console.log(
    `✓ Контент собран: ${units.filter((u) => u.lessons.length).length} юнита с уроками, ${lessonCount} уроков, ${Object.keys(words).length} слов → ${rel(OUT)}`,
  );
  process.exit(0);
}

function plural(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "ошибка";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "ошибки";
  return "ошибок";
}
