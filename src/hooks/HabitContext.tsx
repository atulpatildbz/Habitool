import { createContext, useContext, ReactNode, useState } from 'react';
import { HabitContextType } from './types';
import { useLocalHabits } from './useLocalHabits';
import { useCachedCloudHabits } from './useCachedCloudHabits';
import { useConvexAuth } from 'convex/react';

export const HabitContext = createContext<HabitContextType | null>(null);

// Convex Auth persists the refresh token under `__convexAuthRefreshToken_<namespace>`
// (see @convex-dev/auth client.js). A user who has never signed in has no such key,
// so there is no session to refresh — we can skip the network round-trip entirely and
// drop straight into local-only mode instead of blocking on "Checking session...".
function hasStoredConvexSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('__convexAuthRefreshToken_')) {
        return !!localStorage.getItem(key);
      }
    }
  } catch {
    // localStorage can throw (private mode, disabled storage) — treat as no session.
  }
  return false;
}

export function HybridHabitProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  // Captured once on mount: did this device have a stored session to begin with?
  const [hadStoredSession] = useState(hasStoredConvexSession);

  // The session is dead (not just refreshing) once auth has resolved to unauthenticated.
  const sessionDead = !isLoading && !isAuthenticated;

  // Returning users (or anyone now authenticated) get the cache-aware Convex provider,
  // kept mounted across the auth handshake so we show cached data and buffer taps
  // instead of blocking on "Checking session...". A device that never signed in — or
  // whose stored session turned out to be expired — falls through to local-only.
  if ((hadStoredSession || isAuthenticated) && !sessionDead) {
    return <CloudHabitProvider>{children}</CloudHabitProvider>;
  }

  return <LocalOnlyProvider>{children}</LocalOnlyProvider>;
}

export function LocalOnlyProvider({ children }: { children: ReactNode }) {
  const local = useLocalHabits();
  return <HabitContext.Provider value={local}>{children}</HabitContext.Provider>;
}

function CloudHabitProvider({ children }: { children: ReactNode }) {
  const cloud = useCachedCloudHabits();
  return <HabitContext.Provider value={cloud}>{children}</HabitContext.Provider>;
}
