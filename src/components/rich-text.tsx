import { Fragment, type ReactNode } from "react";
import { Ar } from "./ar";

/**
 * Мини-разметка теории: абзацы через пустую строку, **жирный**, *курсив*.
 * Арабские вставки внутри русского текста оборачиваются в <Ar> автоматически.
 */
const ARABIC_RUN = /([؀-ۿ◌][؀-ۿ◌\s]*)/u;

function inline(text: string, key: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    const k = `${key}-${i}`;
    if (part.startsWith("**")) return <strong key={k} className="font-semibold text-ink">{arabic(part.slice(2, -2), k)}</strong>;
    if (part.startsWith("*")) return <em key={k}>{arabic(part.slice(1, -1), k)}</em>;
    return <Fragment key={k}>{arabic(part, k)}</Fragment>;
  });
}

function arabic(text: string, key: string, compact = false): ReactNode[] {
  return text.split(ARABIC_RUN).map((part, i) =>
    ARABIC_RUN.test(part) ? (
      <Ar key={`${key}-a${i}`} size={compact ? "inherit" : "sm"} className={compact ? "text-[1.3em] leading-none" : "text-rubric"}>
        {part.trim()}
      </Ar>
    ) : (
      part
    ),
  );
}

/** Строка с возможными арабскими вставками (названия тем, заголовки). */
export function InlineText({ text }: { text: string }) {
  return <>{arabic(text, "i", true)}</>;
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\s*\n/);
  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((p, i) => (
        <p key={i}>{inline(p.replace(/\n/g, " "), `p${i}`)}</p>
      ))}
    </div>
  );
}
