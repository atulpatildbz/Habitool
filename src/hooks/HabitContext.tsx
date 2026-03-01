import { createContext, useContext, ReactNode } from 'react';
import { HabitContextType } from './types';
import { useLocalHabits } from './useLocalHabits';
import { useConvexHabits } from './useConvexHabits';
import { useConvexAuth } from 'convex/react';

export const HabitContext = createContext<HabitContextType | null>(null);

export function HybridHabitProvider({ children }: { children: ReactNode }) {
  const local = useLocalHabits();
  const convex = useConvexHabits();
  const { isAuthenticated } = useConvexAuth();

  return (
    <HabitContext.Provider value={isAuthenticated ? convex : local}>
      {children}
    </HabitContext.Provider>
  );
}

export function LocalOnlyProvider({ children }: { children: ReactNode }) {
  const local = useLocalHabits();
  return <HabitContext.Provider value={local}>{children}</HabitContext.Provider>;
}
