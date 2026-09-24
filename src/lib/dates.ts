/** Локальный ключ дня YYYY-MM-DD (не UTC: стрик считается по часам пользователя). */
export function dayKey(d: Date | number = new Date()): string {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const rel = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

/** «через 10 минут», «завтра», «через 4 дня». */
export function fromNow(due: number, now = Date.now()): string {
  const min = Math.round((due - now) / 60000);
  if (min < 1) return "сейчас";
  if (min < 60) return rel.format(min, "minute");
  const h = Math.round(min / 60);
  if (h < 24) return rel.format(h, "hour");
  const d = Math.round(h / 24);
  if (d < 31) return rel.format(d, "day");
  return rel.format(Math.round(d / 30), "month");
}

/** Коротко для кнопок оценки: «1 мин», «10 мин», «3 д». */
export function shortInterval(due: number, now = Date.now()): string {
  const min = Math.max(1, Math.round((due - now) / 60000));
  if (min < 60) return `${min} мин`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} д`;
  return `${Math.round(d / 30)} мес`;
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
