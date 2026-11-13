// 計算の結果を1問に書き込む（設計書 7.4）。Node からそのまま読めるよう、型だけを import する

import type { DailyPuzzle, SolverRecord, SpotOption } from '../../src/core/types';

export type SolverOutput = {
  id: string;
  options: SpotOption[];
  solver: SolverRecord;
  stats?: { seconds: number; memoryGB: number; compressed: boolean };
};

/** その id の問題の options と solver を置き換えた新しい1日分を返す。選択肢の並びは問題の options の順を保つ */
export function mergeSolverOutput(puzzle: DailyPuzzle, out: SolverOutput): DailyPuzzle {
  const index = puzzle.spots.findIndex((s) => s.id === out.id);
  if (index < 0) throw new Error(`問題 ${out.id} がありません`);
  const spot = puzzle.spots[index]!;

  const ids = spot.options.map((o) => o.id);
  const outIds = out.options.map((o) => o.id);
  const missing = ids.filter((id) => !outIds.includes(id));
  const extra = outIds.filter((id) => !ids.includes(id));
  if (missing.length || extra.length) {
    throw new Error(`選択肢が合いません（問題：${ids.join(',')}／計算：${outIds.join(',')}）`);
  }

  // 割合の端数を、合計がちょうど1になるようにそろえる（一番大きい割合で調整）
  const options = ids.map((id) => ({ ...out.options.find((o) => o.id === id)! }));
  const sum = options.reduce((a, o) => a + o.freq, 0);
  const top = options.reduce((a, o) => (o.freq > a.freq ? o : a));
  top.freq = Math.round((top.freq + (1 - sum)) * 10000) / 10000;

  const spots = puzzle.spots.slice();
  spots[index] = { ...spot, options, solver: out.solver };
  return { ...puzzle, spots };
}
