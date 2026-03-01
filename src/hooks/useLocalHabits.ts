import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Habit, HabitLog } from './types';
import { storage } from '../lib/storage';

const HABITS_STORAGE_KEY = 'habits';
const LOGS_STORAGE_KEY = 'habitLogs';

function readStorageValue<T>(key: string, fallback: T): T {
  const saved = storage.getItem(key);
  if (!saved) return fallback;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export function useLocalHabits() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    return readStorageValue(HABITS_STORAGE_KEY, []);
  });

  const [logs, setLogs] = useState<HabitLog>(() => {
    return readStorageValue(LOGS_STORAGE_KEY, {});
  });

  useEffect(() => {
    storage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    storage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const addHabit = (name: string, color: string, icon: string, target: number = 1, streakGoal?: number) => {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      color,
      icon,
      target,
      streakGoal,
      createdAt: new Date().toISOString(),
    };
    setHabits((prev) => [...prev, newHabit]);
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setLogs((prev) => {
      const newLogs = { ...prev };
      delete newLogs[id];
      return newLogs;
    });
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  };

  const toggleHabitDate = (habitId: string, date: Date, target: number = 1) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setLogs(prev => {
      const habitLogs = prev[habitId] || {};
      const currentVal = habitLogs[dateString] || 0;
      const newVal = currentVal >= target ? 0 : target;

      const newHabitLogs = { ...habitLogs };
      if (newVal === 0) {
        delete newHabitLogs[dateString];
      } else {
        newHabitLogs[dateString] = newVal;
      }

      return {
        ...prev,
        [habitId]: newHabitLogs
      };
    });
  };

  const updateHabitDate = (habitId: string, date: Date, value: number) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setLogs(prev => {
      const habitLogs = prev[habitId] || {};
      const newHabitLogs = { ...habitLogs };

      if (value <= 0) {
        delete newHabitLogs[dateString];
      } else {
        newHabitLogs[dateString] = value;
      }

      return {
        ...prev,
        [habitId]: newHabitLogs
      };
    });
  };

  return { habits, logs, addHabit, deleteHabit, updateHabit, toggleHabitDate, updateHabitDate };
}
