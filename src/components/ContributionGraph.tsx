import { useMemo, useRef, useEffect } from 'react';
import { 
  format, 
  subDays, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isToday,
  isFuture
} from 'date-fns';
import { cn } from '../lib/utils';
import { Habit } from '../hooks/useHabits';

interface ContributionGraphProps {
  habit: Habit;
  logs: { [dateString: string]: number };
  onToggleDate: (date: Date) => void;
}

export function ContributionGraph({ habit, logs, onToggleDate }: ContributionGraphProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const weeks = useMemo(() => {
    const today = new Date();
    // 52 weeks = 364 days. Let's start 364 days ago.
    const start = startOfWeek(subDays(today, 364));
    const end = endOfWeek(today);

    const days = eachDayOfInterval({ start, end });
    
    const weeksArray: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeksArray.push(days.slice(i, i + 7));
    }

    return weeksArray;
  }, []);

  return (
    <div ref={scrollRef} className="flex flex-col gap-2 overflow-x-auto pb-4 scrollbar-hide">
      <div className="flex gap-1 min-w-max pl-8 text-[10px] text-zinc-500 h-4">
        {weeks.map((week, i) => {
          // Check if this week is the first week of a new month
          const currentMonth = week[0].getMonth();
          const prevMonth = i > 0 ? weeks[i-1][0].getMonth() : -1;
          const isNewMonth = currentMonth !== prevMonth;
          
          return (
            <div key={i} className="w-3 shrink-0 relative">
              {isNewMonth && (
                <span className="absolute left-0 whitespace-nowrap">{format(week[0], 'MMM')}</span>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex gap-1 min-w-max">
        <div className="flex flex-col gap-1 text-[10px] text-zinc-500 pr-2 justify-between py-0.5 w-6 shrink-0">
          <span className="leading-3">Sun</span>
          <span className="leading-3 opacity-0">Mon</span>
          <span className="leading-3">Tue</span>
          <span className="leading-3 opacity-0">Wed</span>
          <span className="leading-3">Thu</span>
          <span className="leading-3 opacity-0">Fri</span>
          <span className="leading-3">Sat</span>
        </div>
        
        {weeks.map((week, wIndex) => (
          <div key={wIndex} className="flex flex-col gap-1 shrink-0">
            {week.map((day, dIndex) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isFutureDate = isFuture(day) && !isToday(day);
              const val = logs[dateStr] || 0;
              const target = habit.target || 1;
              const opacity = val >= target ? 1 : Math.max(0.3, val / target);
              const color = val > 0 ? habit.color : undefined;
              
              const isBeforeCreation = day < new Date(habit.createdAt);
              
              return (
                <button
                  key={dIndex}
                  disabled={isFutureDate}
                  onClick={() => onToggleDate(day)}
                  className={cn(
                    "w-3 h-3 rounded-[3px] transition-all duration-200",
                    isFutureDate 
                      ? "bg-transparent cursor-default" 
                      : val > 0 
                        ? "hover:ring-2 hover:ring-opacity-50 cursor-pointer"
                        : isBeforeCreation
                          ? "bg-zinc-100/50 dark:bg-zinc-800/30 cursor-pointer hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600"
                          : "bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600"
                  )}
                  style={{
                    backgroundColor: color,
                    opacity: val > 0 ? opacity : undefined,
                  }}
                  title={`${format(day, 'MMM d, yyyy')}: ${val} / ${target}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
