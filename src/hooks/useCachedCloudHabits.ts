import { useEffect, useMemo, useRef, useState } from 'react';
import { useConvexAuth } from 'convex/react';
import { format } from 'date-fns';
import { HabitContextType } from './types';
import { useConvexHabits } from './useConvexHabits';
import { storage } from '../lib/storage';
import { BufferedOp, Snapshot, applyOps, replayOps, resolveToggleValue } from './cloudHabitBuffer';

const CLOUD_CACHE_KEY = 'habitool:cloudCache:v1';
// If the authenticated query keeps reporting empty while we still hold a non-empty
// cached snapshot, trust the live (empty) result after this grace period rather than
// showing stale habits forever (e.g. they were cleared on another device).
const EMPTY_LIVE_GRACE_MS = 1500;

function readSnapshot(): Snapshot {
  try {
    const raw = storage.getItem(CLOUD_CACHE_KEY);
    if (!raw) return { habits: [], logs: {} };
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    return { habits: parsed.habits ?? [], logs: parsed.logs ?? {} };
  } catch {
    return { habits: [], logs: {} };
  }
}

/**
 * Cache-aware Convex habit provider for returning (logged-in) users.
 *
 * On launch the session JWT is expired, so Convex needs a network round-trip to
 * re-authenticate. Instead of blocking on "Checking session...", we render the last
 * cached cloud snapshot immediately and let the user interact: taps update the UI
 * optimistically and are buffered, then replayed through real mutations once the
 * session is live. The live cloud data takes over (and is re-cached) on reconnect.
 *
 * Known limitation: adding a brand-new habit *and* logging it within the same
 * pre-auth window can't replay the log (the temp id has no server counterpart yet).
 * That combination is vanishingly rare for a ~1-3s window and fails silently.
 */
export function useCachedCloudHabits(): HabitContextType {
  const { isAuthenticated } = useConvexAuth();
  const cloud = useConvexHabits();

  // Reads happen once the query resolves; writes need an authenticated identity.
  const canWrite = isAuthenticated;
  const cloudReady = isAuthenticated && cloud.loaded;

  const [snapshot] = useState<Snapshot>(readSnapshot);
  const [ops, setOps] = useState<BufferedOp[]>([]);

  // Stable refs so effects can flush without re-subscribing to changing closures.
  const opsRef = useRef(ops);
  opsRef.current = ops;
  const cloudRef = useRef(cloud);
  cloudRef.current = cloud;

  const snapshotEmpty = snapshot.habits.length === 0;
  const liveHasData = cloud.habits.length > 0;

  // Avoid the stale-empty flash: Convex briefly retains the unauthenticated `[]`
  // result right after auth flips. Keep showing the snapshot until live data arrives,
  // unless the snapshot is empty anyway or the grace period lapses.
  const [graceElapsed, setGraceElapsed] = useState(false);
  useEffect(() => {
    if (!cloudReady || liveHasData || snapshotEmpty) {
      setGraceElapsed(false);
      return;
    }
    const timer = setTimeout(() => setGraceElapsed(true), EMPTY_LIVE_GRACE_MS);
    return () => clearTimeout(timer);
  }, [cloudReady, liveHasData, snapshotEmpty]);

  const useLive = cloudReady && (liveHasData || snapshotEmpty || graceElapsed);

  // Replay buffered ops the moment we can write, on each fresh transition into an
  // authenticated state (so a reconnect after a dropout flushes too).
  const prevCanWriteRef = useRef(false);
  useEffect(() => {
    const was = prevCanWriteRef.current;
    prevCanWriteRef.current = canWrite;
    if (!canWrite || was) return;

    const pending = opsRef.current;
    if (pending.length === 0) return;
    replayOps(pending, cloudRef.current);
    setOps([]);
  }, [canWrite]);

  // Re-cache live cloud data so the next launch has a fresh snapshot to show.
  const lastWrittenRef = useRef('');
  useEffect(() => {
    if (!useLive) return;
    const serialized = JSON.stringify({ habits: cloud.habits, logs: cloud.logs });
    if (serialized === lastWrittenRef.current) return;
    lastWrittenRef.current = serialized;
    storage.setItem(CLOUD_CACHE_KEY, serialized);
  }, [useLive, cloud.habits, cloud.logs]);

  const projected = useMemo(() => applyOps(snapshot, ops), [snapshot, ops]);
  const view = useLive ? { habits: cloud.habits, logs: cloud.logs } : projected;

  // While authenticated, delegate straight to Convex (its own optimistic layer applies).
  // Otherwise record the intent so it shows immediately and replays later.
  const addHabit: HabitContextType['addHabit'] = (name, color, icon, target = 1, streakGoal) => {
    if (canWrite) return cloud.addHabit(name, color, icon, target, streakGoal);
    setOps((prev) => [...prev, { kind: 'add', tempId: crypto.randomUUID(), name, color, icon, target, streakGoal }]);
  };

  const updateHabit: HabitContextType['updateHabit'] = (id, updates) => {
    if (canWrite) return cloud.updateHabit(id, updates);
    setOps((prev) => [...prev, { kind: 'update', id, updates }]);
  };

  const deleteHabit: HabitContextType['deleteHabit'] = (id) => {
    if (canWrite) return cloud.deleteHabit(id);
    setOps((prev) => [...prev, { kind: 'delete', id }]);
  };

  const toggleHabitDate: HabitContextType['toggleHabitDate'] = (habitId, date, target = 1) => {
    if (canWrite) return cloud.toggleHabitDate(habitId, date, target);
    const dateStr = format(date, 'yyyy-MM-dd');
    // Resolve the toggle against the latest projected state to stay correct across
    // rapid taps, and record it as an absolute set so replay can't double-apply.
    setOps((prev) => {
      const value = resolveToggleValue(applyOps(snapshot, prev), habitId, dateStr, target);
      return [...prev, { kind: 'setLog', habitId, date, dateStr, value }];
    });
  };

  const updateHabitDate: HabitContextType['updateHabitDate'] = (habitId, date, value) => {
    if (canWrite) return cloud.updateHabitDate(habitId, date, value);
    const dateStr = format(date, 'yyyy-MM-dd');
    const normalized = Number.isFinite(value) ? value : 0;
    setOps((prev) => [...prev, { kind: 'setLog', habitId, date, dateStr, value: normalized }]);
  };

  return {
    habits: view.habits,
    logs: view.logs,
    addHabit,
    deleteHabit,
    updateHabit,
    toggleHabitDate,
    updateHabitDate,
  };
}
