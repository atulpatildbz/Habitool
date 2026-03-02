import { useQuery, useMutation } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
// @ts-ignore
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { Habit, HabitLog } from "./types";

const LOG_UPDATE_DEBOUNCE_MS = 350;

function logKey(habitId: string, date: string) {
  return `${habitId}|${date}`;
}

export function useConvexHabits() {
  const habitsRaw = useQuery(api.habits.get) || [];
  const logsRaw = useQuery(api.logs.get) || [];
  const [pendingLogValues, setPendingLogValues] = useState<Record<string, number>>({});
  const pendingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const habits: Habit[] = habitsRaw.map((h: any) => ({
    id: h._id,
    name: h.name,
    color: h.color,
    icon: h.icon,
    target: h.target,
    streakGoal: h.streakGoal,
    createdAt: new Date(h._creationTime).toISOString(),
  }));

  const serverLogs: HabitLog = useMemo(
    () =>
      logsRaw.reduce((acc: any, log: any) => {
        if (!acc[log.habitId]) acc[log.habitId] = {};
        acc[log.habitId][log.date] = log.value;
        return acc;
      }, {}),
    [logsRaw],
  );

  const serverValuesByKey = useMemo(() => {
    const values: Record<string, number> = {};
    for (const [habitId, habitLogs] of Object.entries(serverLogs)) {
      for (const [date, value] of Object.entries(habitLogs)) {
        values[logKey(habitId, date)] = value as number;
      }
    }
    return values;
  }, [serverLogs]);

  const logs: HabitLog = useMemo(() => {
    const merged: HabitLog = {};

    for (const [habitId, habitLogs] of Object.entries(serverLogs)) {
      merged[habitId] = { ...habitLogs };
    }

    for (const key in pendingLogValues) {
      const value = pendingLogValues[key];
      const [habitId, date] = key.split("|");
      if (!habitId || !date) continue;
      if (!merged[habitId]) merged[habitId] = {};

      if (value <= 0) {
        delete merged[habitId][date];
        if (Object.keys(merged[habitId]).length === 0) {
          delete merged[habitId];
        }
      } else {
        merged[habitId][date] = value;
      }
    }

    return merged;
  }, [pendingLogValues, serverLogs]);

  const createHabit = useMutation(api.habits.create);
  const updateHabitMut = useMutation(api.habits.update);
  const deleteHabitMut = useMutation(api.habits.remove);
  const toggleLog = useMutation(api.logs.toggle);
  const updateLog = useMutation(api.logs.update);

  useEffect(() => {
    return () => {
      for (const key in pendingTimersRef.current) {
        clearTimeout(pendingTimersRef.current[key]);
      }
    };
  }, []);

  useEffect(() => {
    setPendingLogValues((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const key in prev) {
        const pendingValue = prev[key];
        const serverValue = serverValuesByKey[key] ?? 0;
        const normalizedPending = pendingValue <= 0 ? 0 : pendingValue;
        if (serverValue === normalizedPending) {
          delete next[key];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [serverValuesByKey]);

  const addHabit = (name: string, color: string, icon: string, target: number = 1, streakGoal?: number) => {
    createHabit({ name, color, icon, target, streakGoal });
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    updateHabitMut({ id, ...updates });
  };

  const deleteHabit = (id: string) => {
    deleteHabitMut({ id });
  };

  const toggleHabitDate = (habitId: string, date: Date, target: number = 1) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const key = logKey(habitId, dateString);
    const existingTimer = pendingTimersRef.current[key];
    if (existingTimer) {
      clearTimeout(existingTimer);
      delete pendingTimersRef.current[key];
    }
    setPendingLogValues((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    toggleLog({ habitId, date: dateString, target });
  };

  const updateHabitDate = (habitId: string, date: Date, value: number) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const key = logKey(habitId, dateString);
    const normalizedValue = Number.isFinite(value) ? value : 0;

    setPendingLogValues((prev) => ({ ...prev, [key]: normalizedValue }));

    const existingTimer = pendingTimersRef.current[key];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    pendingTimersRef.current[key] = setTimeout(() => {
      void updateLog({ habitId, date: dateString, value: normalizedValue });
      delete pendingTimersRef.current[key];
    }, LOG_UPDATE_DEBOUNCE_MS);
  };

  return { habits, logs, addHabit, deleteHabit, updateHabit, toggleHabitDate, updateHabitDate };
}
