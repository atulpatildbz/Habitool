import { useState } from 'react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
  isToday, isFuture, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Habit } from '../hooks/useHabits';

interface CalendarViewProps {
  habit: Habit;
  logs: { [dateString: string]: number };
  onToggleDate: (date: Date) => void;
  onUpdateDate: (date: Date, value: number) => void;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
};

export function CalendarView({ habit, logs, onToggleDate, onUpdateDate, currentMonth, onMonthChange }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "yyyy-MM-dd";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const target = habit.target || 1;

  const handleDayClick = (day: Date) => {
    if (isFuture(day) && !isToday(day)) return;

    if (target === 1) {
      onToggleDate(day);
    } else {
      setSelectedDate(day);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-base text-zinc-900 dark:text-zinc-100">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-xs font-medium text-zinc-500 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dateStr = format(day, dateFormat);
          const val = logs[dateStr] || 0;
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isFutureDate = isFuture(day) && !isToday(day);
          const opacity = val >= target ? 1 : Math.max(0.3, val / target);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toString()}
              disabled={isFutureDate}
              onClick={() => handleDayClick(day)}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-sm transition-all relative",
                !isCurrentMonth && "text-zinc-400 dark:text-zinc-600",
                isFutureDate && "opacity-30 cursor-default",
                !isFutureDate && "hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600",
                isSelected && "ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-1 dark:ring-offset-zinc-900",
                val === 0 && !isFutureDate && "bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                isTodayDate && val === 0 && "ring-1 ring-zinc-400 dark:ring-zinc-500",
                isTodayDate && val > 0 && "ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-1 dark:ring-offset-zinc-900"
              )}
              style={{
                backgroundColor: val > 0 ? `rgba(${hexToRgb(habit.color)}, ${opacity})` : undefined,
                color: val > 0 ? (opacity > 0.5 ? '#fff' : 'inherit') : undefined,
                fontWeight: val > 0 ? 500 : undefined
              }}
            >
              <span className="z-10">{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>

      {target > 1 && selectedDate && (
        <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg flex items-center justify-between border border-zinc-200 dark:border-zinc-700">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {format(selectedDate, 'MMM d, yyyy')}
          </span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              value={logs[format(selectedDate, 'yyyy-MM-dd')] || 0}
              onChange={(e) => onUpdateDate(selectedDate, Number(e.target.value))}
              className="w-16 px-2 py-1.5 text-sm border rounded-md dark:bg-zinc-900 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
            <span className="text-sm text-zinc-500">/ {target}</span>
          </div>
        </div>
      )}
    </div>
  );
}
