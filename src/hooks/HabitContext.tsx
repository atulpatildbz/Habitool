import { createContext, useContext, ReactNode } from 'react';
import { HabitContextType } from './types';
import { useLocalHabits } from './useLocalHabits';
import { useConvexHabits } from './useConvexHabits';
import { useConvexAuth } from 'convex/react';

export const HabitContext = createContext<HabitContextType | null>(null);

export function HybridHabitProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const local = useLocalHabits();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-zinc-500 dark:text-zinc-400">
        Checking session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <HabitContext.Provider value={local}>{children}</HabitContext.Provider>;
  }

  return <AuthenticatedHabitProvider>{children}</AuthenticatedHabitProvider>;
}

export function LocalOnlyProvider({ children }: { children: ReactNode }) {
  const local = useLocalHabits();
  return <HabitContext.Provider value={local}>{children}</HabitContext.Provider>;
}

function AuthenticatedHabitProvider({ children }: { children: ReactNode }) {
  const convex = useConvexHabits();
  return <HabitContext.Provider value={convex}>{children}</HabitContext.Provider>;
}
