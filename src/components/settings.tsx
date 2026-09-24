"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Download, RotateCcw, Upload, Wifi, WifiOff } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { exportBackup, readBackup, resetProgress, restoreBackup, type Backup } from "@/lib/backup";
import { plural } from "@/lib/dates";
import { useOfflineStatus } from "@/lib/offline";
import { setTheme, storedChoice, type ThemeChoice } from "@/lib/theme";
import { Button } from "./button";
import { GoalPicker } from "./goal-picker";
import { Confirm } from "./modal";

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "светлая" },
  { value: "dark", label: "тёмная" },
  { value: "system", label: "системная" },
];

const noop = () => () => {};

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-rule py-7 md:grid-cols-[16rem_1fr] md:gap-8">
      <div>
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function Settings() {
  const initialTheme = useSyncExternalStore(noop, storedChoice, () => "system" as ThemeChoice);
  const [theme, setThemeState] = useState<ThemeChoice | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const offline = useOfflineStatus();

  const chooseTheme = (t: ThemeChoice) => {
    setThemeState(t);
    setTheme(t);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending(await readBackup(f));
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    }
    if (file.current) file.current.value = "";
  };

  return (
    <div className="animate-rise">
      <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">Настройки</h1>
      <p className="mt-3 max-w-xl text-ink-soft">Всё хранится в этом браузере. Аккаунта нет, поэтому перенос на другое устройство идёт файлом.</p>

      <div className="mt-6 border-t border-rule">
        <Section title="Цель в день" hint="Минуты занятий, по ним заполняется кольцо на главной.">
          <GoalPicker className="max-w-sm" />
        </Section>

        <Section title="Тема">
          <ToggleGroup
            value={[theme ?? initialTheme]}
            onValueChange={(v) => v[0] && chooseTheme(v[0] as ThemeChoice)}
            aria-label="Тема оформления"
            className="flex max-w-sm gap-1 rounded-full bg-sheet-sunk p-1"
          >
            {THEMES.map((t) => (
              <Toggle
                key={t.value}
                value={t.value}
                className="h-9 flex-1 rounded-full px-2 text-sm text-ink-soft transition-colors data-pressed:bg-sheet data-pressed:text-ink data-pressed:shadow-sm"
              >
                {t.label}
              </Toggle>
            ))}
          </ToggleGroup>
        </Section>

        <Section title="Офлайн" hint="После первого захода сайт целиком сохраняется в браузере.">
          <OfflineLine status={offline} />
        </Section>

        <Section title="Прогресс" hint="Уроки, карточки повторения, стрик и настройки в одном JSON-файле.">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={async () => {
                const d = await exportBackup();
                setMessage({ ok: true, text: `Сохранено: ${d.progress.length} ${plural(d.progress.length, "урок", "урока", "уроков")}, ${d.cards.length} ${plural(d.cards.length, "карточка", "карточки", "карточек")}.` });
              }}
            >
              <Download size={17} aria-hidden /> Скачать файл
            </Button>
            <Button variant="secondary" onClick={() => file.current?.click()}>
              <Upload size={17} aria-hidden /> Загрузить из файла
            </Button>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Файл резервной копии"
              onChange={(e) => onFile(e.target.files?.[0])}
              data-testid="import-file"
            />
          </div>
          <p aria-live="polite" className={`mt-3 min-h-6 text-sm ${message?.ok ? "text-success" : "text-danger"}`}>
            {message?.text}
          </p>
        </Section>

        <Section title="Сброс" hint="Удаляет пройденные уроки, карточки и стрик. Цель и тема остаются.">
          <Button variant="secondary" onClick={() => setResetOpen(true)} className="text-danger">
            <RotateCcw size={17} aria-hidden /> Сбросить прогресс
          </Button>
        </Section>
      </div>

      <Confirm
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title="Заменить прогресс?"
        description={
          pending
            ? `В файле ${pending.progress.length} ${plural(pending.progress.length, "урок", "урока", "уроков")} и ${pending.cards.length} ${plural(pending.cards.length, "карточка", "карточки", "карточек")} от ${new Date(pending.exportedAt).toLocaleDateString("ru")}. Текущий прогресс в этом браузере пропадёт.`
            : ""
        }
        confirmLabel="Заменить"
        onConfirm={async () => {
          if (!pending) return;
          await restoreBackup(pending);
          setMessage({ ok: true, text: "Прогресс загружен из файла." });
          setPending(null);
        }}
      />
      <Confirm
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Сбросить прогресс?"
        description="Пройденные уроки, карточки и стрик удалятся без возможности вернуть. Если нужна копия, сначала скачай файл."
        confirmLabel="Сбросить"
        onConfirm={async () => {
          await resetProgress();
          setResetOpen(false);
          setMessage({ ok: true, text: "Прогресс сброшен." });
        }}
      />
    </div>
  );
}

function OfflineLine({ status }: { status: ReturnType<typeof useOfflineStatus> }) {
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1).replace(".", ",");
  switch (status.state) {
    case "ready":
      return (
        <p className="flex items-center gap-2 text-success" data-testid="offline-status">
          <Wifi size={18} aria-hidden /> Доступно офлайн · {status.meta.files} {plural(status.meta.files, "файл", "файла", "файлов")}, {mb(status.meta.bytes)} МБ
        </p>
      );
    case "installing":
      return (
        <p className="flex items-center gap-2 text-ink-soft" data-testid="offline-status">
          <Download size={18} aria-hidden /> Скачивается: {status.cached} из {status.meta.files} ({mb(status.meta.bytes)} МБ)
        </p>
      );
    case "dev":
      return <p className="text-ink-soft" data-testid="offline-status">В режиме разработки офлайн-кеш выключен.</p>;
    case "unsupported":
      return (
        <p className="flex items-center gap-2 text-ink-soft" data-testid="offline-status">
          <WifiOff size={18} aria-hidden /> Этот браузер не умеет работать офлайн.
        </p>
      );
    default:
      return <p className="text-ink-faint">Проверяю…</p>;
  }
}
