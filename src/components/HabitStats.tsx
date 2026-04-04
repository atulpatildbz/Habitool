import { useMemo, type ReactNode } from 'react';
import { Flame, Trophy, Calendar, TrendingUp, Star, Crown } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { calculateStats, calculateMonthRate, calculatePeriodAvg } from '../lib/stats';
import { Habit } from '../hooks/types';
import { cn } from '../lib/utils';

interface HabitStatsProps {
  habit: Habit;
  logs: { [dateString: string]: number };
  selectedMonth: Date;
}

export function HabitStats({ habit, logs, selectedMonth }: HabitStatsProps) {
  const target = habit.target || 1;
  const isQuantity = target > 1;

  const stats = useMemo(
    () => calculateStats(logs, target, habit.createdAt),
    [logs, target, habit.createdAt]
  );

  const selectedMonthRate = useMemo(
    () => calculateMonthRate(logs, target, selectedMonth),
    [logs, target, selectedMonth]
  );

  const today = useMemo(() => new Date(), []);

  const avgs = useMemo(() => {
    if (!isQuantity) return null;
    return {
      week: calculatePeriodAvg(logs, startOfWeek(today), endOfWeek(today)),
      month: calculatePeriodAvg(logs, startOfMonth(selectedMonth), endOfMonth(selectedMonth)),
      year: calculatePeriodAvg(logs, startOfYear(today), endOfYear(today)),
    };
  }, [logs, isQuantity, today, selectedMonth]);

  const selectedMonthLabel = format(selectedMonth, 'MMM yyyy');

  return (
    <div className="flex flex-col gap-3 mt-4">
      {/* Streak row */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Flame size={16} />}
          label="Current streak"
          value={`${stats.currentStreak}d`}
          color={stats.currentStreak > 0 ? 'text-orange-500' : 'text-zinc-400'}
        />
        <StatCard
          icon={<Trophy size={16} />}
          label="Longest streak"
          value={`${stats.longestStreak}d`}
          color={stats.longestStreak > 0 ? 'text-amber-500' : 'text-zinc-400'}
        />
      </div>

      {/* Completion rates (+ avg for quantity habits) */}
      <div className="grid grid-cols-3 gap-2">
        <RateCard
          label="This week"
          value={stats.weekRate}
          avg={avgs?.week}
          target={isQuantity ? target : undefined}
        />
        <RateCard
          label={selectedMonthLabel}
          value={selectedMonthRate}
          avg={avgs?.month}
          target={isQuantity ? target : undefined}
        />
        <RateCard
          label="This year"
          value={stats.yearRate}
          avg={avgs?.year}
          target={isQuantity ? target : undefined}
        />
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={<Calendar size={16} />}
          label="Total days"
          value={`${stats.totalCompletions}`}
          color="text-blue-500"
        />
        <StatCard
          icon={<Star size={16} />}
          label="Perfect weeks"
          value={`${stats.perfectWeeks}`}
          color={stats.perfectWeeks > 0 ? 'text-violet-500' : 'text-zinc-400'}
        />
        <StatCard
          icon={<Crown size={16} />}
          label="Best day"
          value={stats.bestDay ? stats.bestDay.day : '--'}
          color={stats.bestDay ? 'text-emerald-500' : 'text-zinc-400'}
          subtitle={stats.bestDay ? `${stats.bestDay.rate}%` : undefined}
        />
      </div>

      {/* All-time rate bar */}
      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <TrendingUp size={14} />
            <span>All-time consistency</span>
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {stats.completionRate}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${stats.completionRate}%`,
              backgroundColor: habit.color,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
      <div className={cn('shrink-0', color)}>{icon}</div>
      <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
        {value}
      </span>
      {subtitle && (
        <span className="text-xs text-zinc-500">{subtitle}</span>
      )}
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">{label}</span>
    </div>
  );
}

function RateCard({
  label,
  value,
  avg,
  target,
}: {
  label: string;
  value: number;
  avg?: number;
  target?: number;
}) {
  const getRateColor = (v: number) => {
    if (v >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (v >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-zinc-600 dark:text-zinc-400';
  };

  const getAvgColor = (a: number, t: number) => {
    const ratio = a / t;
    if (ratio >= 0.8) return 'text-emerald-600 dark:text-emerald-400';
    if (ratio >= 0.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-zinc-600 dark:text-zinc-400';
  };

  const showAvg = avg !== undefined && target !== undefined;

  return (
    <div className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
      {showAvg ? (
        <>
          <span className={cn('text-lg font-bold leading-tight', getAvgColor(avg, target))}>
            {avg % 1 === 0 ? avg.toFixed(0) : avg.toFixed(1)}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight">
            /{target} · {value}%
          </span>
        </>
      ) : (
        <span className={cn('text-lg font-bold leading-tight', getRateColor(value))}>
          {value}%
        </span>
      )}
      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">{label}</span>
    </div>
  );
}
