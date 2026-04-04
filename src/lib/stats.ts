import {
  format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, eachDayOfInterval, getDay, differenceInDays,
  min as dateMin, isSameMonth, isFuture, isToday
} from 'date-fns';

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  totalDaysTracked: number;
  completionRate: number; // 0-100
  weekRate: number;       // 0-100
  monthRate: number;      // 0-100
  yearRate: number;       // 0-100
  bestDay: { day: string; rate: number } | null;
  perfectWeeks: number;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function calculatePeriodAvg(
  logs: { [dateString: string]: number },
  from: Date,
  to: Date // inclusive, capped at today
): number {
  const today = new Date();
  const end = to > today ? today : to;
  if (from > end) return 0;
  const days = eachDayOfInterval({ start: from, end });
  const total = days.reduce((sum, d) => sum + (logs[format(d, 'yyyy-MM-dd')] ?? 0), 0);
  const avg = total / days.length;
  // Round to 1 decimal, drop trailing zero
  return Math.round(avg * 10) / 10;
}

export function calculateMonthRate(
  logs: { [dateString: string]: number },
  target: number,
  month: Date
): number {
  const today = new Date();
  const monthStart = startOfMonth(month);
  // For past months use end of month; for current month use today
  const monthEnd = isSameMonth(month, today) ? today : endOfMonth(month);
  // Don't compute future months
  if (monthStart > today) return 0;
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const completed = days.filter(d => {
    const str = format(d, 'yyyy-MM-dd');
    return (logs[str] ?? 0) >= target;
  }).length;
  return Math.round((completed / days.length) * 100);
}

export function calculateStats(
  logs: { [dateString: string]: number },
  target: number,
  createdAt: string
): HabitStats {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const created = new Date(createdAt);

  // All completed dates
  const completedDates = new Set(
    Object.keys(logs).filter(d => logs[d] >= target)
  );

  const totalCompletions = completedDates.size;

  // Total days tracked (from creation to today)
  const totalDaysTracked = Math.max(1, differenceInDays(today, created) + 1);

  // All-time completion rate
  const completionRate = Math.round((totalCompletions / totalDaysTracked) * 100);

  // This week rate
  const weekStart = startOfWeek(today);
  const weekEnd = dateMin([endOfWeek(today), today]);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekCompleted = weekDays.filter(d => completedDates.has(format(d, 'yyyy-MM-dd'))).length;
  const weekRate = Math.round((weekCompleted / weekDays.length) * 100);

  // This month rate
  const monthStart = startOfMonth(today);
  const monthDays = eachDayOfInterval({ start: monthStart, end: today });
  const monthCompleted = monthDays.filter(d => completedDates.has(format(d, 'yyyy-MM-dd'))).length;
  const monthRate = Math.round((monthCompleted / monthDays.length) * 100);

  // This year rate
  const yearStart = startOfYear(today);
  const yearDays = eachDayOfInterval({ start: yearStart, end: today });
  const yearCompleted = yearDays.filter(d => completedDates.has(format(d, 'yyyy-MM-dd'))).length;
  const yearRate = Math.round((yearCompleted / yearDays.length) * 100);

  // Best day of week
  const dayCompletions = [0, 0, 0, 0, 0, 0, 0];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const trackingStart = dateMin([created, today]);
  const allDays = eachDayOfInterval({ start: trackingStart, end: today });
  for (const d of allDays) {
    const dow = getDay(d);
    dayTotals[dow]++;
    if (completedDates.has(format(d, 'yyyy-MM-dd'))) {
      dayCompletions[dow]++;
    }
  }
  let bestDayIdx = 0;
  let bestDayRate = 0;
  for (let i = 0; i < 7; i++) {
    const rate = dayTotals[i] > 0 ? dayCompletions[i] / dayTotals[i] : 0;
    if (rate > bestDayRate) {
      bestDayRate = rate;
      bestDayIdx = i;
    }
  }
  const bestDay = bestDayRate > 0
    ? { day: DAY_NAMES[bestDayIdx], rate: Math.round(bestDayRate * 100) }
    : null;

  // Perfect weeks (full Sun-Sat where all 7 days completed)
  let perfectWeeks = 0;
  // Start from the first full week after creation
  let weekPointer = startOfWeek(created);
  while (weekPointer <= today) {
    const wEnd = endOfWeek(weekPointer);
    if (wEnd <= today) {
      const wDays = eachDayOfInterval({ start: weekPointer, end: wEnd });
      const allCompleted = wDays.every(d => completedDates.has(format(d, 'yyyy-MM-dd')));
      if (allCompleted) perfectWeeks++;
    }
    weekPointer = new Date(weekPointer.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  // Streaks (reuse existing logic inline for consistency)
  const sortedDates = Array.from(completedDates).sort();
  let longestStreak = 0;
  let currentStreak = 0;

  if (sortedDates.length > 0) {
    let tempStreak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const curr = new Date(sortedDates[i]);
      const next = new Date(sortedDates[i + 1]);
      const diff = Math.round((next.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;

    // Current streak
    let checkDate = today;
    let checkStr = format(checkDate, 'yyyy-MM-dd');
    if (completedDates.has(checkStr)) {
      currentStreak = 1;
    } else {
      checkDate = subDays(checkDate, 1);
      checkStr = format(checkDate, 'yyyy-MM-dd');
      if (completedDates.has(checkStr)) {
        currentStreak = 1;
      }
    }
    if (currentStreak > 0) {
      while (true) {
        checkDate = subDays(checkDate, 1);
        checkStr = format(checkDate, 'yyyy-MM-dd');
        if (completedDates.has(checkStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalCompletions,
    totalDaysTracked,
    completionRate,
    weekRate,
    monthRate,
    yearRate,
    bestDay,
    perfectWeeks,
  };
}
