// 公開する問題を選ぶ（設計書 5.2）。日本時間で今日までの日付だけを公開し、
// 計算の記録（solver）と見本のメモ（note）は外す。Node からそのまま読めるよう、型だけを import する

import type { DailyPuzzle } from '../../src/core/types';

export type IndexEntry = { date: string; number: number };

/** その時刻の、日本時間の日付（YYYY-MM-DD） */
export function jstDate(now: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** 公開用の1日分（アプリで使わない項目を外す） */
export function stripForPublic(p: DailyPuzzle): DailyPuzzle {
  const { note: _note, sample: _sample, ...rest } = p;
  return { ...rest, spots: p.spots.map(({ solver: _solver, ...s }) => s) };
}

/**
 * 今日までの問題を選ぶ。見本（sample: true）は公開しない。
 * 戻り値の files は公開するファイル名と中身、index は日付の一覧（新しい順）
 */
export function selectPublishable(
  files: { fileName: string; data: DailyPuzzle }[],
  today: string,
): { files: { fileName: string; data: DailyPuzzle }[]; index: { days: IndexEntry[] } } {
  const picked = files
    .filter(({ fileName, data }) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName) && data.sample !== true && data.date <= today)
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
  return {
    files: picked.map(({ fileName, data }) => ({ fileName, data: stripForPublic(data) })),
    index: { days: picked.map(({ data }) => ({ date: data.date, number: data.number })) },
  };
}
