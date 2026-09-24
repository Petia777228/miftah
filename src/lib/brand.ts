import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Цвета для мест, где CSS-переменные не работают (манифест PWA, картинки).
 * Берутся из src/styles/tokens.css во время сборки: единственный источник цветов остаётся один.
 */
function token(name: string, theme: "light" | "dark" = "light"): string {
  const css = readFileSync(path.join(process.cwd(), "src/styles/tokens.css"), "utf8");
  const block = theme === "light" ? css.slice(css.indexOf(":root"), css.indexOf('[data-theme="dark"]')) : css.slice(css.indexOf('[data-theme="dark"] {'));
  const m = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!m) throw new Error(`Токен --${name} не найден в tokens.css`);
  return m[1];
}

export const brand = {
  paper: token("paper"),
  paperDark: token("paper", "dark"),
  rubric: token("rubric"),
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://petia777228.github.io";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
