import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export const GOAL_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_GOAL = 10;

export function useDailyGoal(): number {
  const row = useLiveQuery(() => db.settings.get("dailyGoalMinutes"), []);
  return typeof row?.value === "number" ? row.value : DEFAULT_GOAL;
}

export const setDailyGoal = (minutes: number) => db.settings.put({ key: "dailyGoalMinutes", value: minutes });
