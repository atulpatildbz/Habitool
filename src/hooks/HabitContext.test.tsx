// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { useContext } from 'react';

// Distinguishable data sources so we can assert which provider the router mounted.
const mock = vi.hoisted(() => ({
  auth: { isAuthenticated: false, isLoading: true } as { isAuthenticated: boolean; isLoading: boolean },
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => mock.auth,
}));
vi.mock('./useCachedCloudHabits', () => ({
  useCachedCloudHabits: () => ({ habits: [{ name: 'CLOUD' }], logs: {} }),
}));
vi.mock('./useLocalHabits', () => ({
  useLocalHabits: () => ({ habits: [{ name: 'LOCAL' }], logs: {} }),
}));

import { HybridHabitProvider, HabitContext } from './HabitContext';

const REFRESH_TOKEN_KEY = '__convexAuthRefreshToken_somedeployment';

// hasStoredConvexSession reads the global localStorage directly; jsdom's is inert here,
// so install a minimal working stub backed by a Map.
function installLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, 'localStorage', { value: ls, configurable: true });
}

function Source() {
  const ctx = useContext(HabitContext);
  return <div>{ctx?.habits[0]?.name ?? 'EMPTY'}</div>;
}

function renderRouter() {
  return render(
    <HybridHabitProvider>
      <Source />
    </HybridHabitProvider>,
  );
}

beforeEach(() => {
  cleanup();
  installLocalStorage();
  mock.auth = { isAuthenticated: false, isLoading: true };
});

describe('HybridHabitProvider — routing', () => {
  it('never-logged-in device goes straight to local, even while auth is still loading', () => {
    // No stored refresh token, auth still resolving.
    renderRouter();
    expect(screen.getByText('LOCAL')).toBeTruthy();
  });

  it('returning user (stored session) shows the cache-aware cloud provider while refreshing', () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'token');
    mock.auth = { isAuthenticated: false, isLoading: true };
    renderRouter();
    // Not a "Checking session" spinner — cached cloud data is shown.
    expect(screen.getByText('CLOUD')).toBeTruthy();
  });

  it('authenticated user shows the cloud provider', () => {
    mock.auth = { isAuthenticated: true, isLoading: false };
    renderRouter();
    expect(screen.getByText('CLOUD')).toBeTruthy();
  });

  it('dead session (stored token but auth resolved unauthenticated) falls back to local', () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'expired');
    mock.auth = { isAuthenticated: false, isLoading: false };
    renderRouter();
    expect(screen.getByText('LOCAL')).toBeTruthy();
  });
});
