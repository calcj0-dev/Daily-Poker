// merge-solver-output：計算の結果を問題に書き込む

import { describe, expect, it } from 'vitest';
import type { DailyPuzzle } from '../src/core/types';
import sampleJson from '../src/data/sample/2026-12-01.sample.json';
import { mergeSolverOutput, type SolverOutput } from '../scripts/lib/merge';

const sample = sampleJson as unknown as DailyPuzzle;

const out: SolverOutput = {
  id: '2026-12-01-5',
  options: [
    { id: 'bet67', freq: 0.994, evBB: 29.654 },
    { id: 'check', freq: 0.0034, evBB: 29.343 },
    { id: 'bet33', freq: 0.0026, evBB: 29.195 },
    { id: 'allin', freq: 0, evBB: 26.373 },
  ],
  solver: {
    tool: 'postflop-solver',
    commit: '9d1509f',
    rangesVersion: 'oop:1 ip:1',
    oopRange: 'ranges/3bp_bb_btn_oop.json',
    ipRange: 'ranges/3bp_bb_btn_ip.json',
    startStreet: 'flop',
    betSizes: {},
    targetExploitabilityPctPot: 0.3,
    exploitabilityPctPot: 0.25,
    solvedAt: '2026-11-13',
    spotFile: 'solver/spots/2026-12-01-5.json',
  },
};

describe('計算の結果の書き込み', () => {
  it('options と solver を置き換え、選択肢の並びは問題の順を保つ', () => {
    const p = mergeSolverOutput(sample, out);
    const s = p.spots[4]!;
    expect(s.options.map((o) => o.id)).toEqual(['check', 'bet33', 'bet67', 'allin']);
    expect(s.options.find((o) => o.id === 'bet67')?.evBB).toBe(29.654);
    expect(s.solver?.exploitabilityPctPot).toBe(0.25);
    // ほかの問題と元のデータは変えない
    expect(p.spots[0]).toEqual(sample.spots[0]);
    expect(sample.spots[4]!.options[2]!.evBB).toBe(12.2);
  });

  it('割合の合計をちょうど1にそろえる', () => {
    const p = mergeSolverOutput(sample, { ...out, options: out.options.map((o) => (o.id === 'bet67' ? { ...o, freq: 0.9939 } : o)) });
    const sum = p.spots[4]!.options.reduce((a, o) => a + o.freq, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('選択肢が合わない・問題がないときは止まる', () => {
    expect(() => mergeSolverOutput(sample, { ...out, options: out.options.slice(1) })).toThrow(/選択肢が合いません/);
    expect(() => mergeSolverOutput(sample, { ...out, id: '2026-12-01-9' })).toThrow(/ありません/);
  });
});
