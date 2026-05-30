import { describe, it, expect, vi } from 'vitest';
import {
  applyOps,
  replayOps,
  resolveToggleValue,
  type BufferedOp,
  type Snapshot,
  type CloudMutations,
} from './cloudHabitBuffer';

const DATE = new Date('2026-05-30T00:00:00');
const DATE_STR = '2026-05-30';

function snapshot(partial: Partial<Snapshot> = {}): Snapshot {
  return { habits: partial.habits ?? [], logs: partial.logs ?? {} };
}

function habit(id: string, name = id): Snapshot['habits'][number] {
  return { id, name, color: '#000', icon: 'star', target: 1, createdAt: '2026-01-01T00:00:00.000Z' };
}

function setLog(value: number, habitId = 'h1'): BufferedOp {
  return { kind: 'setLog', habitId, date: DATE, dateStr: DATE_STR, value };
}

describe('applyOps — projecting buffered taps onto the cached snapshot', () => {
  it('adds a habit optimistically with its temp id', () => {
    const result = applyOps(snapshot(), [
      { kind: 'add', tempId: 'temp-1', name: 'Run', color: '#f00', icon: 'run', target: 2 },
    ]);
    expect(result.habits.map((h) => h.id)).toEqual(['temp-1']);
    expect(result.habits[0]).toMatchObject({ name: 'Run', target: 2 });
  });

  it('applies updates to the matching habit only', () => {
    const result = applyOps(snapshot({ habits: [habit('h1', 'Old'), habit('h2', 'Keep')] }), [
      { kind: 'update', id: 'h1', updates: { name: 'New' } },
    ]);
    expect(result.habits.find((h) => h.id === 'h1')?.name).toBe('New');
    expect(result.habits.find((h) => h.id === 'h2')?.name).toBe('Keep');
  });

  it('removes a habit and its logs on delete', () => {
    const base = snapshot({ habits: [habit('h1')], logs: { h1: { [DATE_STR]: 1 } } });
    const result = applyOps(base, [{ kind: 'delete', id: 'h1' }]);
    expect(result.habits).toEqual([]);
    expect(result.logs.h1).toBeUndefined();
  });

  it('sets and clears a log value', () => {
    const set = applyOps(snapshot({ habits: [habit('h1')] }), [setLog(3)]);
    expect(set.logs.h1[DATE_STR]).toBe(3);

    const cleared = applyOps(snapshot({ habits: [habit('h1')], logs: { h1: { [DATE_STR]: 3 } } }), [setLog(0)]);
    expect(cleared.logs.h1?.[DATE_STR]).toBeUndefined();
  });

  it('does not mutate the input snapshot', () => {
    const base = snapshot({ habits: [habit('h1')], logs: { h1: { [DATE_STR]: 1 } } });
    const frozen = JSON.stringify(base);
    applyOps(base, [setLog(5), { kind: 'delete', id: 'h1' }]);
    expect(JSON.stringify(base)).toBe(frozen);
  });
});

describe('resolveToggleValue + double-tap correctness', () => {
  it('toggles an empty day up to target', () => {
    expect(resolveToggleValue(snapshot(), 'h1', DATE_STR, 1)).toBe(1);
  });

  it('toggles a completed day back to zero', () => {
    const proj = snapshot({ logs: { h1: { [DATE_STR]: 1 } } });
    expect(resolveToggleValue(proj, 'h1', DATE_STR, 1)).toBe(0);
  });

  it('two rapid toggles net back to zero when each resolves against prior ops', () => {
    const base = snapshot({ habits: [habit('h1')] });
    let ops: BufferedOp[] = [];

    // First tap: resolve against base+ops, append.
    let value = resolveToggleValue(applyOps(base, ops), 'h1', DATE_STR, 1);
    ops = [...ops, setLog(value)];
    expect(value).toBe(1);

    // Second tap (before any re-render): must resolve against the *projected* state,
    // not the stale snapshot, or it would set 1 again instead of clearing.
    value = resolveToggleValue(applyOps(base, ops), 'h1', DATE_STR, 1);
    ops = [...ops, setLog(value)];
    expect(value).toBe(0);

    expect(applyOps(base, ops).logs.h1?.[DATE_STR]).toBeUndefined();
  });
});

describe('replayOps — flushing buffered ops to Convex once authenticated', () => {
  function spyCloud(): CloudMutations & { calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      addHabit: vi.fn((name) => calls.push(`add:${name}`)),
      updateHabit: vi.fn((id) => calls.push(`update:${id}`)),
      deleteHabit: vi.fn((id) => calls.push(`delete:${id}`)),
      updateHabitDate: vi.fn((habitId, _date, value) => calls.push(`setLog:${habitId}:${value}`)),
    };
  }

  it('replays each op through the matching mutation, in order', () => {
    const cloud = spyCloud();
    replayOps(
      [
        { kind: 'add', tempId: 't', name: 'Run', color: '#0', icon: 'r', target: 1 },
        { kind: 'update', id: 'h1', updates: { name: 'X' } },
        setLog(2, 'h1'),
        { kind: 'delete', id: 'h2' },
      ],
      cloud,
    );
    expect(cloud.calls).toEqual(['add:Run', 'update:h1', 'setLog:h1:2', 'delete:h2']);
  });

  it('replays toggles as absolute setLog values — never as relative toggles (no double-apply)', () => {
    const cloud = spyCloud();
    // A toggle-on then toggle-off resolves to setLog(1) then setLog(0).
    replayOps([setLog(1), setLog(0)], cloud);
    expect(cloud.updateHabitDate).toHaveBeenCalledTimes(2);
    expect(cloud.calls).toEqual(['setLog:h1:1', 'setLog:h1:0']);
  });

  it('continues past a failing op instead of aborting the rest', () => {
    const cloud = spyCloud();
    (cloud.updateHabit as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('not authenticated');
    });
    replayOps([{ kind: 'update', id: 'boom', updates: {} }, setLog(1, 'h1')], cloud);
    // The setLog still ran despite the update throwing.
    expect(cloud.calls).toEqual(['setLog:h1:1']);
  });
});
