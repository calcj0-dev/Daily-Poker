// 答えの記録（設計書 6章）。保存の中身 days を作り替える純粋な関数

import type { DayRecord, Mark } from '../storage';

export function emptyDay(spots: number): DayRecord {
  return {
    answers: Array<string | null>(spots).fill(null),
    marks: Array<Mark | null>(spots).fill(null),
    finished: false,
    playedOnDay: false,
    startedOnDay: false,
    tags: Array<string[] | null>(spots).fill(null),
  };
}

export type AnswerInput = {
  /** 問題の日付 */
  date: string;
  /** 答えた時点の、日本時間の今日 */
  today: string;
  /** 0 から数えた何問目か */
  index: number;
  optionId: string;
  mark: Mark;
  tags: string[];
  spotsPerDay: number;
};

/**
 * 1問の答えを記録した新しい DayRecord を返す。答えを変えることはできない（すでに答えた問題はそのまま）。
 * 1問目に答えたのがその日のうちなら startedOnDay。5問そろったとき、startedOnDay なら playedOnDay
 */
export function recordAnswer(prev: DayRecord | undefined, a: AnswerInput): DayRecord {
  const day = prev ? structuredClone(prev) : emptyDay(a.spotsPerDay);
  day.tags ??= Array<string[] | null>(a.spotsPerDay).fill(null);
  if (day.answers[a.index] != null) return day;

  const isFirst = day.answers.every((x) => x == null);
  if (isFirst) day.startedOnDay = a.date === a.today;

  day.answers[a.index] = a.optionId;
  day.marks[a.index] = a.mark;
  day.tags[a.index] = a.tags;
  if (day.answers.every((x) => x != null)) {
    day.finished = true;
    day.playedOnDay = day.startedOnDay === true;
  }
  return day;
}

/** 次に答える問題（0 から）。全部答えていれば null */
export function nextIndex(day: DayRecord | undefined, spotsPerDay: number): number | null {
  if (!day) return 0;
  for (let i = 0; i < spotsPerDay; i++) if (day.answers[i] == null) return i;
  return null;
}
