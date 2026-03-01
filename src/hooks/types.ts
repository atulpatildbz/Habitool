export type Habit = {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
  target: number;
  streakGoal?: number;
};

export type HabitLog = {
  [habitId: string]: {
    [dateString: string]: number;
  };
};

export interface HabitContextType {
  habits: Habit[];
  logs: HabitLog;
  addHabit: (name: string, color: string, icon: string, target?: number, streakGoal?: number) => void;
  deleteHabit: (id: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  toggleHabitDate: (habitId: string, date: Date, target?: number) => void;
  updateHabitDate: (habitId: string, date: Date, value: number) => void;
}
