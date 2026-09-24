"use client";

import { BookOpen, House, Layers, PenLine, Settings, Type } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { ThemeToggle } from "./theme-toggle";
import { Ar } from "./ar";

const LINKS = [
  { href: "/", label: "Сегодня", Icon: House },
  { href: "/course/", label: "Курс", Icon: BookOpen },
  { href: "/review/", label: "Повторение", Icon: Layers },
  { href: "/alphabet/", label: "Алфавит", Icon: Type },
  { href: "/copybook/", label: "Прописи", Icon: PenLine },
] as const;

function useDueCount() {
  return useLiveQuery(() => db.cards.where("due").belowOrEqual(Date.now()).count(), []) ?? 0;
}

function isActive(pathname: string, href: string) {
  const p = pathname.replace(/\/$/, "") || "/";
  const h = href.replace(/\/$/, "") || "/";
  return h === "/" ? p === "/" : p.startsWith(h);
}

export function SiteHeader() {
  const pathname = usePathname();
  const due = useDueCount();
  return (
    <header className="sticky top-0 z-20 border-b border-rule/70 bg-paper/90 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-5">
        <Link href="/" className="flex items-baseline gap-2.5" aria-label="Мифтах, на главную">
          <Ar size="inherit" className="text-[26px] leading-none text-rubric">مِفْتَاح</Ar>
          <span className="font-serif text-lg font-semibold tracking-tight">Мифтах</span>
        </Link>
        <nav aria-label="Разделы" className="ml-4 hidden gap-0.5 lg:flex">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className="relative rounded-full px-3.5 py-2 text-[15px] text-ink-soft transition-colors hover:text-ink aria-[current=page]:bg-sheet-sunk aria-[current=page]:text-ink"
            >
              {label}
              {href === "/review/" && due > 0 && <Badge n={due} />}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
          <Link
            href="/settings/"
            aria-label="Настройки"
            aria-current={isActive(pathname, "/settings/") ? "page" : undefined}
            className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sheet-sunk hover:text-ink aria-[current=page]:bg-sheet-sunk aria-[current=page]:text-ink"
          >
            <Settings size={19} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const due = useDueCount();
  return (
    <nav
      aria-label="Разделы"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden"
    >
      <ul className="grid grid-cols-5">
        {LINKS.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className="relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-ink-faint aria-[current=page]:text-action"
            >
              <Icon size={22} strokeWidth={1.75} aria-hidden />
              {label}
              {href === "/review/" && due > 0 && (
                <span className="absolute top-1.5 left-[calc(50%+4px)]">
                  <Badge n={due} />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="ml-1.5 inline-grid min-w-5 place-items-center rounded-full bg-rubric px-1.5 text-[11px] leading-5 font-semibold text-sheet tabular-nums">
      {n > 99 ? "99+" : n}
    </span>
  );
}
