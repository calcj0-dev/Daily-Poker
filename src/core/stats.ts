// 成績の計算（設計書 3.2）。保存せず、days から毎回計算する

import type { DayRecord } from '../storage';
import { addDays, daysBetween } from './date';

/** 場面別の🟩の割合を出す最低の問題数 */
export const MIN_TAG_COUNT = 3;

export type Stats = {
  /** 今の連続日数。今日をまだ解いていなくても、昨日まで続いていれば数える */
  streak: number;
  maxStreak: number;
  /** 5問解き終えた日数（過去の問題を含む） */
  played: number;
  /** 答えた全問のうち🟩の割合（0〜1）。まだ答えていなければ null */
  greenRate: number | null;
  /** タグごとの🟩の割合。MIN_TAG_COUNT 問以上答えたタグだけ */
  byTag: { tag: string; total: number; greens: number; rate: number }[];
};

/** 連続日数に数える日（その日の問題として解き終えた日）を古い順に */
function streakDates(days: Record<string, DayRecord>): string[] {
  return Object.entries(days)
    .filter(([, d]) => d.finished && d.playedOnDay)
    .map(([date]) => date)
    .sort();
}

export function currentStreak(days: Record<string, DayRecord>, today: string): number {
  const set = new Set(streakDates(days));
  // 今日を解いていなければ、昨日から数える
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function maxStreak(days: Record<string, DayRecord>): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of streakDates(days)) {
    run = prev && daysBetween(prev, date) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

export function computeStats(days: Record<string, DayRecord>, today: string): Stats {
  let answered = 0;
  let greens = 0;
  const tagCount = new Map<string, { total: number; greens: number }>();
  for (const d of Object.values(days)) {
    d.marks.forEach((m, i) => {
      if (m == null) return;
      answered++;
      if (m === 'g') greens++;
      for (const tag of d.tags?.[i] ?? []) {
        const c = tagCount.get(tag) ?? { total: 0, greens: 0 };
        c.total++;
        if (m === 'g') c.greens++;
        tagCount.set(tag, c);
      }
    });
  }
  const byTag = [...tagCount.entries()]
    .filter(([, c]) => c.total >= MIN_TAG_COUNT)
    .map(([tag, c]) => ({ tag, ...c, rate: c.greens / c.total }))
    .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
  return {
    streak: currentStreak(days, today),
    maxStreak: maxStreak(days),
    played: Object.values(days).filter((d) => d.finished).length,
    greenRate: answered ? greens / answered : null,
    byTag,
  };
}
