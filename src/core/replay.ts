// ハンドの再生（設計書 9.2「ハンドの再生」）。ブラインドを置くところから、出題する判断の直前までを
// 1手ずつの「場面」にする。各場面に、ポット・その段階で賭けた額・残りのチップ・降りた席・場のカードの枚数を持つ。
// Node（問題の検査）からも読めるよう、import には拡張子を付ける

import { fullHistory, SEATS } from './history.ts';
import type { HistoryItem, Position, Spot, Street } from './types.ts';

const STACK_BB = 100;
const BLINDS: Partial<Record<Position, number>> = { SB: 0.5, BB: 1 };
const BOARD_COUNT: Record<Street, number> = { flop: 3, turn: 4, river: 5 };

/** 席に出す吹き出し（その段階での最後の行動） */
export type SeatAction = { action: HistoryItem['action'] | 'blind'; amountBB?: number };

export type ReplayCaption =
  | { kind: 'blinds' }
  | { kind: 'folds'; positions: Position[] }
  | { kind: 'action'; item: HistoryItem }
  /** 相手がいま賭けた額（出題の直前の行動） */
  | { kind: 'facing'; amountBB: number }
  | { kind: 'deal'; street: Street };

export type ReplayStep = {
  street: 'preflop' | Street;
  /** 見せる場のカードの枚数（0・3・4・5） */
  boardCount: number;
  /** 前の段階までに集まったポット（この段階で賭けている額は含まない） */
  potBB: number;
  /** この段階で各席が賭けている額 */
  bets: Partial<Record<Position, number>>;
  stacks: Record<Position, number>;
  folded: Position[];
  last: Partial<Record<Position, SeatAction>>;
  /** この場面で動いた席 */
  actors: Position[];
  caption: ReplayCaption;
};

type State = Omit<ReplayStep, 'caption' | 'actors' | 'folded'> & { folded: Set<Position> };

function snapshot(s: State, caption: ReplayCaption, actors: Position[]): ReplayStep {
  return {
    street: s.street,
    boardCount: s.boardCount,
    potBB: round(s.potBB),
    bets: { ...s.bets },
    stacks: { ...s.stacks },
    folded: [...s.folded],
    last: { ...s.last },
    actors,
    caption,
  };
}

export function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** 次の段階へ：賭けた額をポットに集め、カードを配る */
function deal(s: State, street: Street): void {
  for (const v of Object.values(s.bets)) s.potBB += v ?? 0;
  s.bets = {};
  s.last = {};
  s.street = street;
  s.boardCount = BOARD_COUNT[street];
}

export function buildReplay(spot: Pick<Spot, 'history' | 'hero' | 'villain' | 'facing' | 'street'>): ReplayStep[] {
  const posOf: Record<HistoryItem['actor'], Position> = { hero: spot.hero.position, villain: spot.villain.position };
  const stacks = Object.fromEntries(SEATS.map((p) => [p, STACK_BB])) as Record<Position, number>;
  const s: State = { street: 'preflop', boardCount: 0, potBB: 0, bets: {}, stacks, folded: new Set(), last: {} };
  const steps: ReplayStep[] = [];

  for (const [p, amount] of Object.entries(BLINDS) as [Position, number][]) {
    s.bets[p] = amount;
    s.stacks[p] -= amount;
    s.last[p] = { action: 'blind', amountBB: amount };
  }
  steps.push(snapshot(s, { kind: 'blinds' }, ['SB', 'BB']));

  const goTo = (street: 'preflop' | Street) => {
    if (street === 'preflop' || street === s.street) return;
    // 飛ばした段階があっても、順に配る
    for (const st of ['flop', 'turn', 'river'] as Street[]) {
      if (BOARD_COUNT[st] > s.boardCount && BOARD_COUNT[st] <= BOARD_COUNT[street]) {
        deal(s, st);
        steps.push(snapshot(s, { kind: 'deal', street: st }, []));
      }
    }
  };

  for (const e of fullHistory(spot)) {
    if (e.kind === 'folds') {
      for (const p of e.positions) {
        s.folded.add(p);
        s.last[p] = { action: 'fold' };
      }
      steps.push(snapshot(s, { kind: 'folds', positions: e.positions }, e.positions));
      continue;
    }
    const item = e.item;
    goTo(item.street);
    const pos = posOf[item.actor];
    const before = s.bets[pos] ?? 0;
    let after = before;
    if (item.action === 'raise' || item.action === 'bet') after = item.amountBB ?? before;
    else if (item.action === 'call') after = Math.max(...Object.values(s.bets).map((v) => v ?? 0), 0);
    else if (item.action === 'fold') s.folded.add(pos);
    s.bets[pos] = after;
    s.stacks[pos] = round(s.stacks[pos] - (after - before));
    s.last[pos] = { action: item.action, amountBB: item.action === 'raise' || item.action === 'bet' ? item.amountBB : undefined };
    steps.push(snapshot(s, { kind: 'action', item }, [pos]));
  }

  // 出題する段階のカードまで配る（例：フロップで付いていき、ターンで最初に行動する場面）
  goTo(spot.street);

  if (spot.facing) {
    const pos = posOf.villain;
    const before = s.bets[pos] ?? 0;
    s.bets[pos] = spot.facing.amountBB;
    s.stacks[pos] = round(s.stacks[pos] - (spot.facing.amountBB - before));
    s.last[pos] = { action: 'bet', amountBB: spot.facing.amountBB };
    steps.push(snapshot(s, { kind: 'facing', amountBB: spot.facing.amountBB }, [pos]));
  }
  return steps;
}
