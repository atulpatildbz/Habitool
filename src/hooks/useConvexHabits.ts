import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { Habit, HabitLog } from "./types";

export function useConvexHabits() {
  const habitsRaw = useQuery(api.habits.get) || [];
  const logsRaw = useQuery(api.logs.get) || [];

  const habits: Habit[] = habitsRaw.map((h: any) => ({
    id: h._id,
    name: h.name,
    color: h.color,
    icon: h.icon,
    target: h.target,
    streakGoal: h.streakGoal,
    createdAt: new Date(h._creationTime).toISOString(),
  }));

  const logs: HabitLog = logsRaw.reduce((acc: any, log: any) => {
    if (!acc[log.habitId]) acc[log.habitId] = {};
    acc[log.habitId][log.date] = log.value;
    return acc;
  }, {});

  const createHabit = useMutation(api.habits.create);
  const updateHabitMut = useMutation(api.habits.update);
  const deleteHabitMut = useMutation(api.habits.remove);
  const toggleLog = useMutation(api.logs.toggle);
  const updateLog = useMutation(api.logs.update);

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
    toggleLog({ habitId, date: format(date, 'yyyy-MM-dd'), target });
  };

  const updateHabitDate = (habitId: string, date: Date, value: number) => {
    updateLog({ habitId, date: format(date, 'yyyy-MM-dd'), value });
  };

  return { habits, logs, addHabit, deleteHabit, updateHabit, toggleHabitDate, updateHabitDate };
}
