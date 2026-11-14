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

const DAY_MS = 86400000;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** 使い回す1日分：中身は元の日のまま、日付・番号・id だけを付け替える（「再出題」とは書かない。決定メモ） */
function reuse(src: DailyPuzzle, date: string, number: number): DailyPuzzle {
  return { ...src, date, number, spots: src.spots.map((s, i) => ({ ...s, id: `${date}-${i + 1}` })) };
}

/**
 * 今日までの問題を選ぶ。見本（sample: true）は公開しない。
 * 問題のファイルがない日は、作った問題を最初の日から順に使い回す（決定メモ：14日分を1周として使い回す）。
 * 番号は最初の日を #1 として日ごとに続ける。
 * 戻り値の files は公開するファイル名と中身、index は日付の一覧（新しい順）
 */
export function selectPublishable(
  files: { fileName: string; data: DailyPuzzle }[],
  today: string,
): { files: { fileName: string; data: DailyPuzzle }[]; index: { days: IndexEntry[] } } {
  const made = files
    .filter(({ fileName, data }) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName) && data.sample !== true)
    .map(({ data }) => data)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const first = made[0];
  const out: DailyPuzzle[] = [];
  if (first && first.date <= today) {
    const byDate = new Map(made.map((p) => [p.date, p]));
    const span = daysBetween(first.date, today);
    for (let i = 0; i <= span; i++) {
      const date = addDays(first.date, i);
      const own = byDate.get(date);
      out.push(own ?? reuse(made[i % made.length]!, date, first.number + i));
    }
  }
  out.reverse();
  return {
    files: out.map((data) => ({ fileName: `${data.date}.json`, data: stripForPublic(data) })),
    index: { days: out.map((data) => ({ date: data.date, number: data.number })) },
  };
}
