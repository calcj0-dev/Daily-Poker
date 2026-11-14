// 場面の案から、問題と計算の設定を作る

import { describe, expect, it } from 'vitest';
import { buildSpot } from '../scripts/lib/spec';
import { replayMismatch } from '../scripts/lib/replayCheck';

describe('場面の案から問題を作る', () => {
  it('見本の3問目（リバーで相手が 67% を賭ける）を、同じポット・残り・流れで作れる', () => {
    const { spot, solver } = buildSpot(
      {
        type: 'srp_btn_bb',
        hero: 'BB',
        cards: ['Ah', '9h'],
        board: ['Kd', '8s', '3c', '7h', '2d'],
        flop: ['hero check', 'villain bet 33', 'hero call'],
        turn: ['hero check', 'villain check'],
        river: ['hero check', 'villain bet 67'],
        tags: ['bluffcatch'],
      },
      '2099-01-01-3',
      3,
    );
    expect(spot.potBB).toBe(9.1);
    expect(spot.effectiveStackBB).toBe(95.7);
    expect(spot.facing).toEqual({ action: 'bet', amountBB: 6.1 });
    expect(spot.tags).toEqual(['river', 'bluffcatch']);
    expect(spot.options.map((o) => o.id)).toEqual(['fold', 'call', 'raise']);
    expect(replayMismatch(spot)).toEqual([]);
    expect(solver.decisionPath).toEqual(['Check', 'Bet(1.8)', 'Call', 'Check', 'Check', 'Check', 'Bet(6.1)']);
    expect(solver.hero).toEqual({ player: 'oop', cards: ['Ah', '9h'] });
    const sizes = solver.betSizes as Record<string, Record<string, { bet: string }>>;
    expect(sizes.river!.ip!.bet).toBe('67%');
    expect(sizes.flop!.ip!.bet).toBe('33%');
  });

  it('SB 対 BB はポット 5（SB が上げ、BB が付いていく）', () => {
    const { spot } = buildSpot(
      { type: 'srp_sb_bb', hero: 'SB', cards: ['Ks', 'Qs'], board: ['Qh', '7d', '2c'], tags: ['value'] },
      '2099-01-01-1',
      1,
    );
    expect(spot.potBB).toBe(5);
    expect(spot.villain.position).toBe('BB');
    expect(spot.options.map((o) => o.id)).toEqual(['check', 'bet33', 'bet67', 'allin']);
    expect(replayMismatch(spot)).toEqual([]);
  });

  it('上げ返したポットのフロップで、あなたが先に動く', () => {
    const { spot, solver } = buildSpot(
      { type: '3bp_bb_btn', hero: 'BB', cards: ['Qd', 'Qs'], board: ['Js', '7d', '4c'], tags: ['3betpot'] },
      '2099-01-01-5',
      5,
    );
    expect(spot.potBB).toBe(21.5);
    expect(spot.effectiveStackBB).toBe(89.5);
    expect(solver.decisionPath).toEqual([]);
    expect(replayMismatch(spot)).toEqual([]);
  });

  it('ベットに答えないまま次の段階へ進む案は止める', () => {
    expect(() =>
      buildSpot(
        { type: 'srp_btn_bb', hero: 'BB', cards: ['Ah', '9h'], board: ['Kd', '8s', '3c', '7h'], flop: ['hero check', 'villain bet 33'], tags: [] },
        'x',
        1,
      ),
    ).toThrow(/答えない/);
  });
});

describe('公開日の付け替え', () => {
  it('2099-01-03 の問題を、公開日 2026-12-30 から3日目（2027-01-01・#3）にする', async () => {
    const { redate } = await import('../scripts/lib/redate');
    const { spot } = buildSpot(
      { type: 'srp_sb_bb', hero: 'SB', cards: ['Ks', 'Qs'], board: ['Qh', '7d', '2c'], tags: [] },
      '2099-01-03-1',
      1,
    );
    const draft = { date: '2099-01-03', number: 3, spots: [{ ...spot, solver: { spotFile: 'solver/spots/2099-01-03-1.json' } as never }] };
    const { puzzle, renames } = redate(draft, '2026-12-30', 2, 3);
    expect(puzzle.date).toBe('2027-01-01');
    expect(puzzle.number).toBe(3);
    expect(puzzle.spots[0]!.id).toBe('2027-01-01-1');
    expect(puzzle.spots[0]!.solver?.spotFile).toBe('solver/spots/2027-01-01-1.json');
    expect(renames).toEqual([['2099-01-03-1', '2027-01-01-1']]);
  });
});
