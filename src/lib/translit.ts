/**
 * Мягкое сравнение транскрипции: долготы и точки под буквами можно не ставить,
 * латиница переводится в кириллицу, одна опечатка в длинном слове прощается.
 */

const LATIN: [RegExp, string][] = [
  [/dh|th/g, "з"],
  [/sh/g, "ш"],
  [/kh/g, "х"],
  [/j/g, "дж"],
  [/a/g, "а"], [/b/g, "б"], [/d/g, "д"], [/e/g, "е"], [/f/g, "ф"], [/g/g, "г"], [/h/g, "х"],
  [/i/g, "и"], [/k/g, "к"], [/l/g, "л"], [/m/g, "м"], [/n/g, "н"], [/o/g, "о"], [/q/g, "к"],
  [/r/g, "р"], [/s/g, "с"], [/t/g, "т"], [/u/g, "у"], [/w/g, "в"], [/v/g, "в"], [/y/g, "й"], [/z/g, "з"],
];

export function normalizeTranslit(s: string): string {
  let x = s.toLowerCase().trim();
  for (const [re, to] of LATIN) x = x.replace(re, to);
  return x
    .replace(/й/g, "\u0001")
    .replace(/ё/g, "е")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0001/g, "й")
    .replace(/[ʼʻ'`’‘\-\s.,!?]/g, "")
    .replace(/([аеиоуыэюя])\1+/g, "$1");
}

function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export type TranslitVerdict = "exact" | "loose" | "typo" | "wrong";

/**
 * exact: совпало посимвольно; loose: совпало без долгот/диакритики;
 * typo: одна ошибка в слове от 4 букв; wrong: не совпало.
 */
export function compareTranslit(input: string, answers: string[]): TranslitVerdict {
  const raw = input.trim().toLowerCase().normalize("NFC");
  if (!raw) return "wrong";
  if (answers.some((a) => a.toLowerCase().normalize("NFC") === raw)) return "exact";
  const n = normalizeTranslit(input);
  const norm = answers.map(normalizeTranslit);
  if (norm.includes(n)) return "loose";
  if (norm.some((a) => a.length >= 4 && distance(a, n) <= 1)) return "typo";
  return "wrong";
}
