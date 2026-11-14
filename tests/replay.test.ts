// ハンドの再生：場面の並びと、最後の場面と問題のデータのつじつま

import { describe, expect, it } from 'vitest';
import { buildReplay } from '../src/core/replay';
import { replayMismatch } from '../scripts/lib/replayCheck';
import type { DailyPuzzle, Spot } from '../src/core/types';
import fixture from './fixtures/2026-12-01.sample.json';
import sample from '../src/data/sample/2026-12-01.sample.json';

const fx = fixture as unknown as DailyPuzzle;
const sm = sample as unknown as DailyPuzzle;

function captions(spot: Spot): string[] {
  return buildReplay(spot).map((s) => {
    const c = s.caption;
    if (c.kind === 'folds') return `fold ${c.positions.join(',')}`;
    if (c.kind === 'action') return `${c.item.actor} ${c.item.action}`;
    if (c.kind === 'deal') return `deal ${c.street}`;
    if (c.kind === 'facing') return `facing ${c.amountBB}`;
    if (c.kind === 'holecards') return 'holecards';
    return 'blinds';
  });
}

describe('ハンドの再生', () => {
  it('リバーで相手が賭けてくる場面：ブラインド → フォールド → … → 相手のベット', () => {
    const spot = fx.spots[2]!;
    expect(captions(spot)).toEqual([
      'blinds',
      'holecards',
      'fold UTG',
      'fold HJ',
      'fold CO',
      'villain raise',
      'fold SB',
      'hero call',
      'deal flop',
      'hero check',
      'villain bet',
      'hero call',
      'deal turn',
      'hero check',
      'villain check',
      'deal river',
      'hero check',
      'facing 6.1',
    ]);
    const last = buildReplay(spot).at(-1)!;
    expect(last.potBB).toBeCloseTo(9.1);
    expect(last.bets.BTN).toBe(6.1);
    expect(last.stacks.BB).toBeCloseTo(95.7);
    expect(last.stacks.BTN).toBeCloseTo(89.6);
    expect(last.boardCount).toBe(5);
  });

  it('フロップで付いていき、ターンで最初に行動する場面は、最後にターンを配る', () => {
    expect(captions(fx.spots[1]!).slice(-2)).toEqual(['hero call', 'deal turn']);
  });

  it('上げ返したポットでも、ポットとチップが合う', () => {
    const last = buildReplay(fx.spots[4]!).at(-1)!;
    expect(last.potBB).toBeCloseTo(21.5);
    expect(last.stacks.BB).toBeCloseTo(89.5);
  });

  it('見本の5問はすべて、流れとポット・残りのチップ・場のカードが合う', () => {
    for (const s of [...fx.spots, ...sm.spots]) expect(replayMismatch(s), s.id).toEqual([]);
  });

  it('ポットを書き間違えると気づける', () => {
    const s = { ...fx.spots[0]!, potBB: 6 };
    expect(replayMismatch(s).join()).toMatch(/ポット/);
  });
});
