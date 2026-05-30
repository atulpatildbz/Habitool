import { Habit, HabitLog } from './types';

/**
 * Pure buffer/replay core for the cache-aware cloud habit provider.
 *
 * Kept free of React/Convex so it can be unit-tested directly. The hook
 * (`useCachedCloudHabits`) owns the wiring; this module owns the semantics of how
 * taps made before re-authentication are projected onto the UI and replayed to the
 * server afterwards.
 */

export type Snapshot = { habits: Habit[]; logs: HabitLog };

// Buffered intent recorded while the session is still re-authenticating.
export type BufferedOp =
  | { kind: 'add'; tempId: string; name: string; color: string; icon: string; target: number; streakGoal?: number }
  | { kind: 'update'; id: string; updates: Partial<Habit> }
  | { kind: 'delete'; id: string }
  | { kind: 'setLog'; habitId: string; date: Date; dateStr: string; value: number };

// The subset of mutation actions replay needs (matches useConvexHabits' shape).
export interface CloudMutations {
  addHabit: (name: string, color: string, icon: string, target?: number, streakGoal?: number) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  updateHabitDate: (habitId: string, date: Date, value: number) => void;
}

/**
 * Project the cached snapshot forward through buffered ops so the UI reflects the
 * user's taps immediately, before those taps reach the server.
 */
export function applyOps(base: Snapshot, ops: BufferedOp[]): Snapshot {
  let habits = base.habits.slice();
  const logs: HabitLog = {};
  for (const habitId in base.logs) logs[habitId] = { ...base.logs[habitId] };

  for (const op of ops) {
    if (op.kind === 'add') {
      habits.push({
        id: op.tempId,
        name: op.name,
        color: op.color,
        icon: op.icon,
        target: op.target,
        streakGoal: op.streakGoal,
        createdAt: new Date().toISOString(),
      });
    } else if (op.kind === 'update') {
      habits = habits.map((h) => (h.id === op.id ? { ...h, ...op.updates } : h));
    } else if (op.kind === 'delete') {
      habits = habits.filter((h) => h.id !== op.id);
      delete logs[op.id];
    } else if (op.kind === 'setLog') {
      if (!logs[op.habitId]) logs[op.habitId] = {};
      if (op.value <= 0) {
        delete logs[op.habitId][op.dateStr];
      } else {
        logs[op.habitId][op.dateStr] = op.value;
      }
    }
  }

  return { habits, logs };
}

/**
 * Resolve a relative toggle against the latest projected state into the absolute
 * value it should become. Recording the absolute value (rather than the toggle
 * itself) is what keeps replay from double-applying across rapid taps.
 */
export function resolveToggleValue(projected: Snapshot, habitId: string, dateStr: string, target: number): number {
  const current = projected.logs[habitId]?.[dateStr] || 0;
  return current >= target ? 0 : target;
}

/**
 * Replay buffered ops through real mutations once the session is authenticated.
 * Best-effort: a single failing op (e.g. a log on a habit that was only ever created
 * locally in the same window) is dropped rather than aborting the rest.
 */
export function replayOps(ops: BufferedOp[], cloud: CloudMutations): void {
  for (const op of ops) {
    try {
      if (op.kind === 'add') cloud.addHabit(op.name, op.color, op.icon, op.target, op.streakGoal);
      else if (op.kind === 'update') cloud.updateHabit(op.id, op.updates);
      else if (op.kind === 'delete') cloud.deleteHabit(op.id);
      else if (op.kind === 'setLog') cloud.updateHabitDate(op.habitId, op.date, op.value);
    } catch {
      // Drop the failed op and continue.
    }
  }
}
