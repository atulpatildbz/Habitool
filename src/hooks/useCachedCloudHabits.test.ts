// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Habit, HabitLog } from './types';
import { storage } from '../lib/storage';

const CLOUD_CACHE_KEY = 'habitool:cloudCache:v1';

// Mutable mock state, hoisted so the vi.mock factories can read it lazily per render.
const mock = vi.hoisted(() => ({
  auth: { isAuthenticated: false, isLoading: true } as { isAuthenticated: boolean; isLoading: boolean },
  cloud: { habits: [] as Habit[], logs: {} as HabitLog, loaded: false },
  mutations: {
    addHabit: vi.fn(),
    updateHabit: vi.fn(),
    deleteHabit: vi.fn(),
    toggleHabitDate: vi.fn(),
    updateHabitDate: vi.fn(),
  },
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => mock.auth,
}));

vi.mock('./useConvexHabits', () => ({
  useConvexHabits: () => ({ ...mock.cloud, ...mock.mutations }),
}));

import { useCachedCloudHabits } from './useCachedCloudHabits';

const DATE = new Date('2026-05-30T00:00:00');
const DATE_STR = '2026-05-30';

function habit(id: string, name = id): Habit {
  return { id, name, color: '#000', icon: 'star', target: 1, createdAt: '2026-01-01T00:00:00.000Z' };
}

// Seed/read through the same `storage` singleton the hook uses (this jsdom build's
// window.localStorage is non-functional, so storage falls back to an in-memory driver).
function seedCache(snapshot: { habits: Habit[]; logs: HabitLog }) {
  storage.setItem(CLOUD_CACHE_KEY, JSON.stringify(snapshot));
}

beforeEach(() => {
  storage.removeItem(CLOUD_CACHE_KEY);
  mock.auth = { isAuthenticated: false, isLoading: true };
  mock.cloud = { habits: [], logs: {}, loaded: false };
  vi.clearAllMocks();
});

describe('useCachedCloudHabits — display while re-authenticating', () => {
  it('renders the cached snapshot immediately, before auth resolves', () => {
    seedCache({ habits: [habit('h1', 'Run')], logs: { h1: { [DATE_STR]: 1 } } });

    const { result } = renderHook(() => useCachedCloudHabits());

    expect(result.current.habits.map((h) => h.name)).toEqual(['Run']);
    expect(result.current.logs.h1[DATE_STR]).toBe(1);
  });
});

describe('useCachedCloudHabits — buffering taps before login', () => {
  it('reflects a toggle optimistically without calling Convex', () => {
    seedCache({ habits: [habit('h1')], logs: {} });
    const { result } = renderHook(() => useCachedCloudHabits());

    act(() => result.current.toggleHabitDate('h1', DATE, 1));

    expect(result.current.logs.h1[DATE_STR]).toBe(1);
    // Nothing reached the server — it would have thrown "Not authenticated".
    expect(mock.mutations.toggleHabitDate).not.toHaveBeenCalled();
    expect(mock.mutations.updateHabitDate).not.toHaveBeenCalled();
  });

  it('reflects an added habit optimistically without calling Convex', () => {
    seedCache({ habits: [], logs: {} });
    const { result } = renderHook(() => useCachedCloudHabits());

    act(() => result.current.addHabit('Read', '#0f0', 'book', 1));

    expect(result.current.habits.map((h) => h.name)).toEqual(['Read']);
    expect(mock.mutations.addHabit).not.toHaveBeenCalled();
  });

  it('nets a double-tap back to zero (no stuck-on)', () => {
    seedCache({ habits: [habit('h1')], logs: {} });
    const { result } = renderHook(() => useCachedCloudHabits());

    act(() => result.current.toggleHabitDate('h1', DATE, 1));
    act(() => result.current.toggleHabitDate('h1', DATE, 1));

    expect(result.current.logs.h1?.[DATE_STR]).toBeUndefined();
  });
});

describe('useCachedCloudHabits — flush on authentication', () => {
  it('replays buffered taps through real mutations once authenticated', () => {
    seedCache({ habits: [habit('h1')], logs: {} });
    const { result, rerender } = renderHook(() => useCachedCloudHabits());

    act(() => result.current.toggleHabitDate('h1', DATE, 1));
    expect(mock.mutations.updateHabitDate).not.toHaveBeenCalled();

    // Session comes alive with live data.
    act(() => {
      mock.auth = { isAuthenticated: true, isLoading: false };
      mock.cloud = { habits: [habit('h1')], logs: {}, loaded: true };
      rerender();
    });

    // Toggle replayed as an absolute set-log (value 1), not a relative toggle.
    expect(mock.mutations.updateHabitDate).toHaveBeenCalledTimes(1);
    const [habitId, , value] = mock.mutations.updateHabitDate.mock.calls[0];
    expect(habitId).toBe('h1');
    expect(value).toBe(1);
  });

  it('delegates straight to Convex once authenticated (no buffering)', () => {
    mock.auth = { isAuthenticated: true, isLoading: false };
    mock.cloud = { habits: [habit('h1')], logs: {}, loaded: true };
    const { result } = renderHook(() => useCachedCloudHabits());

    act(() => result.current.toggleHabitDate('h1', DATE, 1));

    expect(mock.mutations.toggleHabitDate).toHaveBeenCalledTimes(1);
  });
});

describe('useCachedCloudHabits — live takeover & caching', () => {
  it('keeps showing the cached snapshot through the post-auth empty-result window', () => {
    seedCache({ habits: [habit('h1', 'Run')], logs: {} });
    const { result, rerender } = renderHook(() => useCachedCloudHabits());

    // Authenticated, query "loaded" but still echoing the stale empty result.
    act(() => {
      mock.auth = { isAuthenticated: true, isLoading: false };
      mock.cloud = { habits: [], logs: {}, loaded: true };
      rerender();
    });

    // Must not flash empty — the cached habit stays visible.
    expect(result.current.habits.map((h) => h.name)).toEqual(['Run']);
  });

  it('swaps to live data and re-caches it once real data arrives', () => {
    seedCache({ habits: [habit('h1', 'Run')], logs: {} });
    const { result, rerender } = renderHook(() => useCachedCloudHabits());

    act(() => {
      mock.auth = { isAuthenticated: true, isLoading: false };
      mock.cloud = { habits: [habit('h2', 'Meditate')], logs: { h2: { [DATE_STR]: 1 } }, loaded: true };
      rerender();
    });

    expect(result.current.habits.map((h) => h.name)).toEqual(['Meditate']);
    const cached = JSON.parse(storage.getItem(CLOUD_CACHE_KEY)!);
    expect(cached.habits.map((h: Habit) => h.name)).toEqual(['Meditate']);
  });
});
