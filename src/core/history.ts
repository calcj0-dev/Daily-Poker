// 「ここまでの流れ」に、ほかの4人がフォールドしたところを足す。
// 問題のデータ（history）は2人の行動だけを持つので、席の順から組み立てる

import type { HistoryItem, Position, Spot } from './types';

/** プリフロップで行動する順（6人のテーブル） */
export const SEATS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

export type HistoryEvent =
  | { kind: 'action'; item: HistoryItem }
  /** ほかの人のフォールド（続いた分は1つにまとめる） */
  | { kind: 'folds'; street: 'preflop'; positions: Position[] };

export function fullHistory(spot: Pick<Spot, 'history' | 'hero' | 'villain'>): HistoryEvent[] {
  const posOf: Record<HistoryItem['actor'], Position> = { hero: spot.hero.position, villain: spot.villain.position };
  const pre = spot.history.filter((h) => h.street === 'preflop');
  const post = spot.history.filter((h) => h.street !== 'preflop');

  const out: HistoryEvent[] = [];
  const pushFold = (p: Position) => {
    const last = out[out.length - 1];
    if (last?.kind === 'folds') last.positions.push(p);
    else out.push({ kind: 'folds', street: 'preflop', positions: [p] });
  };

  // 1周目：席の順に、2人の最初の行動を置き、ほかの人はフォールド
  let i = 0;
  const acted = new Set<HistoryItem['actor']>();
  for (const pos of SEATS) {
    const item = pre[i];
    if (item && posOf[item.actor] === pos && !acted.has(item.actor)) {
      out.push({ kind: 'action', item });
      acted.add(item.actor);
      i++;
    } else if (pos !== posOf.hero && pos !== posOf.villain) {
      pushFold(pos);
    }
  }
  // 2周目以降（上げ返し・それに付いていく など）と、場にカードが出た後
  for (const item of [...pre.slice(i), ...post]) out.push({ kind: 'action', item });
  return out;
}

/** フォールドした席（テーブルの絵で薄くする） */
export function foldedSeats(spot: Pick<Spot, 'hero' | 'villain'>): Position[] {
  return SEATS.filter((p) => p !== spot.hero.position && p !== spot.villain.position);
}
