"use client";

import { Switch } from "@base-ui/react/switch";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { content } from "@/content";
import { ALPHABET_ORDER, distinctForms, graphemes } from "@/content/arabic";
import { learnedLetters, useDoneLessons } from "@/lib/learned";
import { Ar } from "./ar";
import { Button } from "./button";

type SheetType = "forms" | "syllables" | "words";
type Size = "S" | "M" | "L";

/** Высота строки прописи в мм. Шрифт образца = 0.8 высоты, базовая линия на 62%: алиф и хвосты ра/джим помещаются в строку. */
const ROW_MM: Record<Size, number> = { S: 13, M: 17, L: 23 };
const SIZE_LABEL: Record<Size, string> = { S: "мелко", M: "средне", L: "крупно" };
const TYPE_LABEL: Record<SheetType, string> = { forms: "4 позиции", syllables: "слоги", words: "слова" };
/** Лист A4: поля 12 мм; шапка 8 + отступ под огласовки 5 + подвал 6 мм. */
const PAGE = { width: 210, height: 297, margin: 12, chrome: 19 };
const CONTENT_W = PAGE.width - 2 * PAGE.margin;
const ROWS_H = PAGE.height - 2 * PAGE.margin - PAGE.chrome;

const ALL_LETTERS = [...ALPHABET_ORDER, "ء"];
const UNITS = content.units.filter((u) => u.letters.length > 0);
const FATHA = "َ";
const KASRA = "ِ";
const DAMMA = "ُ";

type Row = { sample?: string };

function syllables(c: string): string[] {
  if (c === "ا") return [];
  if (c === "ء") return ["أَ", "إِ", "أُ"];
  return [c + FATHA, c + KASRA, c + DAMMA, c + FATHA + "ا", c + KASRA + "ي", c + DAMMA + "و"];
}

function samplesFor(type: SheetType, letters: string[]): string[] {
  if (type === "forms") return letters.flatMap((c) => distinctForms(c, content.letters[c].joining).map((f) => f.form));
  if (type === "syllables") return letters.flatMap(syllables);
  // Слова юнитов выбранных букв, где встречается хотя бы одна выбранная буква.
  const units = new Set(letters.map((c) => content.letters[c].unit));
  return Object.values(content.words)
    .filter((w) => units.has(w.unit) && w.letters.some((c) => letters.includes(c)))
    .slice(0, 40)
    .map((w) => w.ar);
}

function paginate(rows: Row[], rowMm: number): Row[][] {
  const perPage = Math.floor(ROWS_H / rowMm);
  const pages: Row[][] = [];
  for (let i = 0; i < rows.length; i += perPage) pages.push(rows.slice(i, i + perPage));
  return pages;
}

/** Сколько серых образцов влезает в строку (грубая оценка ширины графемы в Amiri). */
function fitRepeats(sample: string, fontMm: number, wanted: number) {
  const width = graphemes(sample).length * fontMm * 0.55 + fontMm * 0.7;
  return Math.max(0, Math.min(wanted, Math.floor(CONTENT_W / width) - 1));
}

export function Copybook() {
  const params = useSearchParams();
  const done = useDoneLessons();
  const [letters, setLetters] = useState<string[]>(() => {
    const fromUrl = (params.get("letters") ?? "").split(",").filter((c) => ALL_LETTERS.includes(c));
    return fromUrl.length ? fromUrl : ["ب", "ت", "ث"];
  });
  const [type, setType] = useState<SheetType>(() => (params.get("type") as SheetType) || "forms");
  const [size, setSize] = useState<Size>("M");
  const [repeats, setRepeats] = useState(5);
  const [practice, setPractice] = useState(1);
  const [guide, setGuide] = useState(true);

  // Состояние листа в адресе: ссылку можно отправить ученикам.
  useEffect(() => {
    const q = new URLSearchParams({ letters: letters.join(","), type });
    window.history.replaceState(null, "", `?${q}`);
  }, [letters, type]);

  const ordered = useMemo(() => ALL_LETTERS.filter((c) => letters.includes(c)), [letters]);
  const rowMm = ROW_MM[size];
  const pages = useMemo(() => {
    const rows: Row[] = samplesFor(type, ordered).flatMap((sample) => [
      { sample },
      ...Array.from({ length: practice }, () => ({})),
    ]);
    return paginate(rows, rowMm);
  }, [type, ordered, practice, rowMm]);

  const learned = learnedLetters(done);

  return (
    <div>
      <div className="print:hidden">
        <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">Прописи</h1>
        <p className="mt-3 max-w-xl text-ink-soft">
          Лист A4 с линовкой: первый образец чёрный, дальше серые для обводки и пустое место. Печать прямо из браузера.
        </p>

        <section className="mt-8 grid gap-6 rounded-card border border-rule bg-sheet p-5 md:p-6" aria-label="Настройки листа">
          <div>
            <p className="text-sm font-medium">Буквы</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {UNITS.map((u) => (
                <button
                  key={u.number}
                  type="button"
                  onClick={() => setLetters(u.letters)}
                  className="rounded-full border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
                >
                  юнит {u.number}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setLetters([...learned])}
                disabled={learned.size === 0}
                className="rounded-full border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink-faint hover:text-ink disabled:opacity-40"
              >
                пройденные
              </button>
            </div>
            <ToggleGroup
              multiple
              value={letters}
              onValueChange={(v) => v.length && setLetters(v)}
              aria-label="Выбор букв"
              className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]"
              dir="rtl"
            >
              {ALL_LETTERS.map((c) => (
                <Toggle
                  key={c}
                  value={c}
                  aria-label={content.letters[c].name}
                  className="grid h-12 place-items-center rounded-tile border border-rule bg-sheet text-ink-soft transition-colors data-pressed:border-action data-pressed:bg-action data-pressed:text-action-ink"
                >
                  <Ar size="sm">{c}</Ar>
                </Toggle>
              ))}
            </ToggleGroup>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Choice label="Что писать" value={type} options={Object.keys(TYPE_LABEL) as SheetType[]} render={(t) => TYPE_LABEL[t]} onChange={setType} />
            <Choice label="Размер строки" value={size} options={["S", "M", "L"] as Size[]} render={(s) => SIZE_LABEL[s]} onChange={setSize} />
            <Choice label="Серых образцов в строке" value={repeats} options={[3, 5, 8]} render={String} onChange={setRepeats} />
            <Choice label="Пустых строк после образца" value={practice} options={[0, 1, 2]} render={String} onChange={setPractice} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-[15px]">
              <Switch.Root
                checked={guide}
                onCheckedChange={setGuide}
                className="relative flex h-7 w-12 rounded-full bg-sheet-sunk p-0.5 transition-colors data-checked:bg-action"
              >
                <Switch.Thumb className="h-6 w-6 rounded-full bg-sheet shadow transition-transform duration-150 data-checked:translate-x-5" />
              </Switch.Root>
              Серый образец для обводки
            </label>
            <Button size="lg" onClick={() => window.print()}>
              <Printer size={18} aria-hidden /> Печать · {pages.length} {pages.length === 1 ? "лист" : pages.length < 5 ? "листа" : "листов"}
            </Button>
          </div>
          <p className="-mt-2 text-sm text-ink-faint">
            PDF: в окне печати выбери «Сохранить как PDF», масштаб 100%, поля «нет».
          </p>
        </section>
      </div>

      <Sheets pages={pages} rowMm={rowMm} repeats={guide ? repeats : 0} letters={ordered} />
    </div>
  );
}

function Choice<T extends string | number>({
  label,
  value,
  options,
  render,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  render: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <ToggleGroup
        value={[String(value)]}
        onValueChange={(v) => {
          const next = options.find((o) => String(o) === v[0]);
          if (next !== undefined) onChange(next);
        }}
        aria-label={label}
        className="mt-2 flex gap-1 rounded-full bg-sheet-sunk p-1"
      >
        {options.map((o) => (
          <Toggle
            key={String(o)}
            value={String(o)}
            className="h-9 flex-1 rounded-full px-2 text-sm text-ink-soft transition-colors data-pressed:bg-sheet data-pressed:text-ink data-pressed:shadow-sm"
          >
            {render(o)}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}

/**
 * Где у Amiri базовая линия при line-height 1 (доля кегля от верха строки).
 * Меряем в браузере после загрузки шрифта: пустой inline-block стоит низом на базовой линии.
 */
function useAmiriBaseline(): number {
  const [em, setEm] = useState(0.75);
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;font-family:var(--font-arabic);font-size:100px;line-height:1;white-space:nowrap";
      probe.innerHTML = 'ب<span style="display:inline-block;width:0;height:0"></span>';
      document.body.appendChild(probe);
      const mark = probe.lastElementChild as HTMLElement;
      const value = (mark.getBoundingClientRect().top - probe.getBoundingClientRect().top) / 100;
      probe.remove();
      if (alive) setEm(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return em;
}

/** Листы A4. На экране уменьшаются под ширину, при печати идут 1:1. */
function Sheets({ pages, rowMm, repeats, letters }: { pages: Row[][]; rowMm: number; repeats: number; letters: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mmToPx = 96 / 25.4;
    const ro = new ResizeObserver(([e]) => setZoom(Math.min(1, e.contentRect.width / (PAGE.width * mmToPx))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fontMm = rowMm * 0.8;
  const baseMm = rowMm * 0.62;
  const baselineEm = useAmiriBaseline();

  return (
    <div ref={ref} className="mt-8 print:mt-0" style={{ ["--sheet-zoom" as string]: zoom }} data-testid="sheets">
      {pages.map((rows, p) => (
        <article
          key={p}
          className="sheet relative mx-auto mb-6 box-border flex flex-col overflow-hidden bg-sheet text-ink shadow-md [zoom:var(--sheet-zoom)] print:mb-0 print:shadow-none print:[zoom:1] print:break-after-page print:last:break-after-auto"
          style={{ width: `${PAGE.width}mm`, height: `${PAGE.height}mm`, padding: `${PAGE.margin}mm` }}
          aria-label={`Лист ${p + 1}`}
        >
          <header className="flex items-baseline justify-between text-[9pt] text-ink-soft" style={{ height: "8mm" }}>
            <span>
              Мифтах · прописи · <Ar size="inherit" className="text-[12pt]">{letters.join(" ")}</Ar>
            </span>
            <span className="tabular-nums">
              {p + 1} / {pages.length}
            </span>
          </header>
          <div className="flex-1" style={{ paddingTop: "5mm" }}>
            {rows.map((row, i) => (
              <CopyRow key={i} sample={row.sample} rowMm={rowMm} fontMm={fontMm} baseMm={baseMm} baselineEm={baselineEm} repeats={row.sample ? fitRepeats(row.sample, fontMm, repeats) : 0} />
            ))}
          </div>
          <footer className="text-[8pt] text-ink-faint" style={{ height: "6mm" }}>
            petia777228.github.io/miftah · шрифт Amiri (OFL)
          </footer>
        </article>
      ))}
    </div>
  );
}

function CopyRow({
  sample,
  rowMm,
  fontMm,
  baseMm,
  baselineEm,
  repeats,
}: {
  sample?: string;
  rowMm: number;
  fontMm: number;
  baseMm: number;
  baselineEm: number;
  repeats: number;
}) {
  return (
    <div className="cb-row relative" style={{ height: `${rowMm}mm` }}>
      {/* Линовка: пунктир на высоте «зубцов», сплошная базовая линия. */}
      <div className="absolute inset-x-0 border-t border-dashed border-ink/20" style={{ top: `${baseMm - fontMm * 0.3}mm` }} />
      <div className="absolute inset-x-0 border-t border-ink/60" style={{ top: `${baseMm}mm` }} />
      {sample && (
        <div
          lang="ar"
          dir="rtl"
          className="absolute inset-x-0 flex overflow-visible font-arabic whitespace-nowrap"
          // Верх строки текста сдвинут так, чтобы базовая линия шрифта легла ровно на линовку.
          style={{ top: `${baseMm - baselineEm * fontMm}mm`, fontSize: `${fontMm}mm`, lineHeight: 1, columnGap: `${fontMm * 0.7}mm` }}
        >
          <span className="text-ink">{sample}</span>
          {Array.from({ length: repeats }, (_, i) => (
            <span key={i} className="text-trace" aria-hidden>
              {sample}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
