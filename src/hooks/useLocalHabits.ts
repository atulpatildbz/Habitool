import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Habit, HabitLog } from './types';

export function useLocalHabits() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('habits');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<HabitLog>(() => {
    const saved = localStorage.getItem('habitLogs');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('habitLogs', JSON.stringify(logs));
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
    setHabits([...habits, newHabit]);
  };

  const deleteHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
    const newLogs = { ...logs };
    delete newLogs[id];
    setLogs(newLogs);
  };

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    setHabits(habits.map(h => h.id === id ? { ...h, ...updates } : h));
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
