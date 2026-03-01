import { format, subDays } from 'date-fns';

export function calculateStreaks(logs: { [dateString: string]: number }, target: number) {
  if (!logs) return { current: 0, longest: 0 };
  
  const dates = Object.keys(logs)
    .filter(d => logs[d] >= target)
    .sort();
    
  if (dates.length === 0) return { current: 0, longest: 0 };

  let current = 0;
  let longest = 0;
  let tempStreak = 1;

  for (let i = 0; i < dates.length - 1; i++) {
    const currentDay = new Date(dates[i]);
    const nextDay = new Date(dates[i+1]);
    const diffTime = Math.abs(nextDay.getTime() - currentDay.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      if (tempStreak > longest) longest = tempStreak;
      tempStreak = 1;
    }
  }
  if (tempStreak > longest) longest = tempStreak;

  // Calculate current streak
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  
  let checkDate = new Date();
  let checkDateStr = format(checkDate, 'yyyy-MM-dd');
  
  if (logs[checkDateStr] >= target) {
    current = 1;
  } else {
    checkDate = subDays(checkDate, 1);
    checkDateStr = format(checkDate, 'yyyy-MM-dd');
    if (logs[checkDateStr] >= target) {
      current = 1;
    } else {
      return { current: 0, longest };
    }
  }

  while (true) {
    checkDate = subDays(checkDate, 1);
    checkDateStr = format(checkDate, 'yyyy-MM-dd');
    if (logs[checkDateStr] >= target) {
      current++;
    } else {
      break;
    }
  }

  return { current, longest };
}
