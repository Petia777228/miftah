import type { ReactNode } from "react";
import { isArabic } from "@/content/arabic";

const SIZE = {
  sm: "text-ar-sm",
  md: "text-ar-md",
  lg: "text-ar-lg",
  xl: "text-ar-xl",
  inherit: "",
} as const;

type Size = keyof typeof SIZE;

/** Арабский текст: всегда lang="ar", dir="rtl" и высокая строка под огласовки. */
export function Ar({ children, size = "md", className = "" }: { children: ReactNode; size?: Size; className?: string }) {
  return (
    <span lang="ar" dir="rtl" className={`${SIZE[size]} ${className}`}>
      {children}
    </span>
  );
}

/** Транскрипция: шрифт с точками и чертами под буквами. */
export function Tr({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`tr ${className}`}>{children}</span>;
}

/** Строка, которая может быть и арабской, и русской (варианты ответов, плитки). */
export function Mixed({ text, size = "md", className = "" }: { text: string; size?: Size; className?: string }) {
  return isArabic(text) ? (
    <Ar size={size} className={className}>
      {text}
    </Ar>
  ) : (
    <span className={className}>{text}</span>
  );
}
