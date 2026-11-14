// 作成中の1日分に、本当の日付・番号・id を付ける（assign-dates から使う）。
// Node からそのまま読めるよう、import には拡張子を付ける

import type { DailyPuzzle } from '../../src/core/types.ts';

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

/** offset 日目（0 から）の日付を付ける。renames は計算の設定の [古い id, 新しい id] */
export function redate(
  draft: DailyPuzzle,
  start: string,
  offset: number,
  number: number,
): { puzzle: DailyPuzzle; renames: [string, string][] } {
  const date = addDays(start, offset);
  const renames: [string, string][] = [];
  const spots = draft.spots.map((s, i) => {
    const id = `${date}-${i + 1}`;
    renames.push([s.id, id]);
    return {
      ...s,
      id,
      index: i + 1,
      solver: s.solver ? { ...s.solver, spotFile: `solver/spots/${id}.json` } : s.solver,
    };
  });
  return { puzzle: { ...draft, date, number, spots }, renames };
}
