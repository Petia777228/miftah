import { db } from "./db";

export type Theme = "light" | "dark";
export const THEME_KEY = "miftah-theme";

/**
 * Выполняется до отрисовки (inline в <head>), чтобы не мигала светлая тема.
 * localStorage — быстрое зеркало; основная копия настройки лежит в Dexie (settings.theme).
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export async function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  await db.settings.put({ key: "theme", value: theme });
}
