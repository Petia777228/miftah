"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { GOAL_OPTIONS, setDailyGoal, useDailyGoal } from "@/lib/settings";

/** Переключатель дневной цели в минутах (главная и настройки). */
export function GoalPicker({ className = "" }: { className?: string }) {
  const goal = useDailyGoal();
  return (
    <ToggleGroup
      value={[String(goal)]}
      onValueChange={(v) => v[0] && setDailyGoal(Number(v[0]))}
      aria-label="Цель в минутах"
      className={`flex gap-1 rounded-full bg-sheet-sunk p-1 ${className}`}
    >
      {GOAL_OPTIONS.map((m) => (
        <Toggle
          key={m}
          value={String(m)}
          className="h-9 flex-1 rounded-full text-sm text-ink-soft transition-colors data-pressed:bg-sheet data-pressed:text-ink data-pressed:shadow-sm"
        >
          {m}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
