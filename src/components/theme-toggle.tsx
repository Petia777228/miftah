"use client";

import { Toggle } from "@base-ui/react/toggle";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { currentTheme, setTheme } from "@/lib/theme";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, () => currentTheme() === "dark", () => false);
  return (
    <Toggle
      pressed={dark}
      onPressedChange={(p) => setTheme(p ? "dark" : "light")}
      aria-label={dark ? "Светлая тема" : "Тёмная тема"}
      className="grid h-11 w-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sheet-sunk hover:text-ink"
    >
      {dark ? <Sun size={19} strokeWidth={1.75} /> : <Moon size={19} strokeWidth={1.75} />}
    </Toggle>
  );
}
