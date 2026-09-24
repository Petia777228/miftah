import { db } from "./db";

export type Theme = "light" | "dark";
export type ThemeChoice = Theme | "system";
export const THEME_KEY = "miftah-theme";

/**
 * Выполняется до отрисовки (inline в <head>), чтобы не мигала светлая тема.
 * localStorage — быстрое зеркало; основная копия настройки лежит в Dexie (settings.theme).
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function storedChoice(): ThemeChoice {
  const t = localStorage.getItem(THEME_KEY);
  return t === "light" || t === "dark" ? t : "system";
}

export async function setTheme(choice: ThemeChoice) {
  const resolved: Theme =
    choice === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : choice;
  document.documentElement.dataset.theme = resolved;
  if (choice === "system") localStorage.removeItem(THEME_KEY);
  else localStorage.setItem(THEME_KEY, choice);
  await db.settings.put({ key: "theme", value: choice });
}
