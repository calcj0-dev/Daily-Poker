// 「ここまでの流れ」に、ほかの4人のフォールドを足す

import { describe, expect, it } from 'vitest';
import { fullHistory, type HistoryEvent } from '../src/core/history';
import type { HistoryItem, Position } from '../src/core/types';

function spot(hero: Position, villain: Position, history: HistoryItem[]) {
  return { hero: { position: hero, cards: ['Ah', 'Kd'] as [string, string] }, villain: { position: villain }, history };
}

/** 読みやすい形（"UTG,HJ,CO fold" / "hero raise 2.5"） */
function show(events: HistoryEvent[]): string[] {
  return events.map((e) =>
    e.kind === 'folds' ? `${e.positions.join(',')} fold` : `${e.item.actor} ${e.item.action}${e.item.amountBB ? ` ${e.item.amountBB}` : ''}`,
  );
}

describe('ここまでの流れ', () => {
  it('BTN が上げ、BB が付いていく：前の3人と SB が降りる', () => {
    const s = spot('BB', 'BTN', [
      { street: 'preflop', actor: 'villain', action: 'raise', amountBB: 2.5 },
      { street: 'preflop', actor: 'hero', action: 'call' },
      { street: 'flop', actor: 'hero', action: 'check' },
    ]);
    expect(show(fullHistory(s))).toEqual(['UTG,HJ,CO fold', 'villain raise 2.5', 'SB fold', 'hero call', 'hero check']);
  });

  it('CO が上げ、BB が付いていく：BTN と SB も降りる', () => {
    const s = spot('CO', 'BB', [
      { street: 'preflop', actor: 'hero', action: 'raise', amountBB: 2.5 },
      { street: 'preflop', actor: 'villain', action: 'call' },
    ]);
    expect(show(fullHistory(s))).toEqual(['UTG,HJ fold', 'hero raise 2.5', 'BTN,SB fold', 'villain call']);
  });

  it('SB が上げ、BB が付いていく：SB より前の4人が降りる', () => {
    const s = spot('SB', 'BB', [
      { street: 'preflop', actor: 'hero', action: 'raise', amountBB: 2.5 },
      { street: 'preflop', actor: 'villain', action: 'call' },
    ]);
    expect(show(fullHistory(s))).toEqual(['UTG,HJ,CO,BTN fold', 'hero raise 2.5', 'villain call']);
  });

  it('BB が上げ返し、BTN が付いていく：2周目の行動はそのあとに続く', () => {
    const s = spot('BB', 'BTN', [
      { street: 'preflop', actor: 'villain', action: 'raise', amountBB: 2.5 },
      { street: 'preflop', actor: 'hero', action: 'raise', amountBB: 10.5 },
      { street: 'preflop', actor: 'villain', action: 'call' },
    ]);
    expect(show(fullHistory(s))).toEqual(['UTG,HJ,CO fold', 'villain raise 2.5', 'SB fold', 'hero raise 10.5', 'villain call']);
  });
});
