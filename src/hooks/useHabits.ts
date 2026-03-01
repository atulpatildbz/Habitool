import { useContext } from 'react';
import { HabitContext } from './HabitContext';
import { Habit, HabitLog } from './types';

export type { Habit, HabitLog };

export function useHabits() {
  const context = useContext(HabitContext);
  if (!context) {
    throw new Error('useHabits must be used within a HabitProvider');
  }
  return context;
}
