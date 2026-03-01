import { useMemo } from 'react';
import { eachDayOfInterval, format, isToday, subDays } from 'date-fns';
import { cn } from '../lib/utils';
import { Habit } from '../hooks/useHabits';

interface RecentDaysGraphProps {
  habit: Habit;
  logs: { [dateString: string]: number };
  days: 2 | 3 | 4 | 5 | 6 | 7;
  onToggleDate: (date: Date) => void;
}

export function RecentDaysGraph({ habit, logs, days, onToggleDate }: RecentDaysGraphProps) {
  const dayWindow = useMemo(() => {
    const today = new Date();
    const start = subDays(today, days - 1);
    return eachDayOfInterval({ start, end: today });
  }, [days]);

  const target = habit.target || 1;
  const createdAt = new Date(habit.createdAt);

  return (
    <div className="flex flex-col gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex items-center justify-end gap-2 min-w-max">
        {dayWindow.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          return (
            <div key={dateStr} className="w-8 sm:w-9 text-center shrink-0">
              <div className="text-[11px] text-zinc-500">{format(day, 'EEE')}</div>
              <div
                className={cn(
                  "text-xs sm:text-sm",
                  isToday(day) ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-500"
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 min-w-max">
        {dayWindow.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const value = logs[dateStr] || 0;
          const isBeforeCreation = day < createdAt;
          const opacity = value >= target ? 1 : Math.max(0.3, value / target);

          return (
            <button
              key={dateStr}
              onClick={() => onToggleDate(day)}
              className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-lg border transition-all duration-200",
                value > 0
                  ? "border-transparent cursor-pointer hover:ring-2 hover:ring-opacity-50"
                  : isBeforeCreation
                    ? "bg-zinc-100/50 dark:bg-zinc-800/30 border-zinc-200/40 dark:border-zinc-700/40 cursor-pointer hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600"
                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 cursor-pointer hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600"
              )}
              style={{
                backgroundColor: value > 0 ? habit.color : undefined,
                opacity: value > 0 ? opacity : undefined,
              }}
              title={`${format(day, 'MMM d, yyyy')}: ${value} / ${target}`}
            />
          );
        })}
      </div>
    </div>
  );
}
