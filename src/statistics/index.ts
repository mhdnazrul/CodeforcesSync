import { toLocalDateString } from "../shared/utils/date";

export interface StreakResult {
  newStreak: number;
  newBestStreak: number;
  newLastAcceptedDate: string;
  updatedSolvedDays: string[];
}

export function computeStreak(
  currentStreak: number,
  lastAcceptedDate: string | null,
  solvedDays: string[],
  currentBestStreak: number = 0,
  today: Date = new Date(),
): StreakResult {
  const todayStr = toLocalDateString(today);

  const days = [...solvedDays];
  if (!days.includes(todayStr)) {
    days.push(todayStr);
  }

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const cutoffStr = toLocalDateString(thirtyDaysAgo);
  const updatedSolvedDays = days.filter((d) => d >= cutoffStr).sort();

  if (lastAcceptedDate === todayStr) {
    return {
      newStreak: currentStreak,
      newBestStreak: Math.max(currentBestStreak, currentStreak),
      newLastAcceptedDate: todayStr,
      updatedSolvedDays,
    };
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterday);

  const newStreak =
    lastAcceptedDate === yesterdayStr
      ? (currentStreak || 0) + 1
      : 1;

  return {
    newStreak,
    newBestStreak: Math.max(currentBestStreak, newStreak),
    newLastAcceptedDate: todayStr,
    updatedSolvedDays,
  };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface WeekDay {
  day: string;
  dateStr: string;
  solved: boolean;
  isFuture: boolean;
  isToday: boolean;
}

export function getWeeklyProgress(
  solvedDays: string[] = [],
  today: Date = new Date(),
): WeekDay[] {
  const currentDay = today.getDay();
  return DAYS.map((day, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (currentDay - i));
    const dateStr = toLocalDateString(date);
    return {
      day,
      dateStr,
      solved: solvedDays.includes(dateStr),
      isFuture: date > today,
      isToday: i === currentDay,
    };
  });
}
