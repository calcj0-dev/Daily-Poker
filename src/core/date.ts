// 日本時間の日付（設計書 5.1）。端末がどの国の時間でも、日本時間の0時で切り替わる

import { config } from '../data';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: config.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** その時刻の、日本時間の日付（YYYY-MM-DD） */
export function puzzleDate(now: Date = new Date()): string {
  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** YYYY-MM-DD に日数を足す（暦の計算だけなので UTC で行う） */
export function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** 2つの日付の差（b − a、日数） */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** 次の問題（日本時間の翌0時）までのミリ秒 */
export function msUntilNextPuzzle(now: Date = new Date()): number {
  const tomorrow = addDays(puzzleDate(now), 1);
  // 日本時間には夏時間がないため、0時は UTC の前日15時
  const next = Date.parse(`${tomorrow}T00:00:00+09:00`);
  return next - now.getTime();
}

/** 画面の「{m}月{d}日」用 */
export function monthDay(date: string): { m: number; d: number } {
  const [, m, d] = date.split('-').map(Number);
  return { m: m ?? 0, d: d ?? 0 };
}
