"use client";

import { Volume2 } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Кнопка звука. Рендерится только если сборка нашла файл (поле audio в контенте). */
export function AudioButton({ src, label = "Послушать" }: { src: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => new Audio(`${BASE}/audio/${src}`).play()}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sheet-sunk hover:text-ink"
    >
      <Volume2 size={20} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
