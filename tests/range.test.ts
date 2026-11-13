// レンジの読み取りと、8つのレンジのつじつま（設計書 7.2）

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { expandToken, overlap, parseRange, rangePercent } from '../scripts/lib/range';

describe('レンジの書き方', () => {
  it('ペア・範囲・+ を広げる', () => {
    expect(expandToken('QQ+')).toEqual(['QQ', 'KK', 'AA']);
    expect(expandToken('22-44')).toEqual(['22', '33', '44']);
    expect(expandToken('A2s-A4s')).toEqual(['A2s', 'A3s', 'A4s']);
    expect(expandToken('KTs+')).toEqual(['KTs', 'KJs', 'KQs']);
    expect(expandToken('AK')).toEqual(['AKs', 'AKo']);
  });

  it('全部の手は100%、AA は 6/1326', () => {
    expect(rangePercent(parseRange('22+,A2+,K2+,Q2+,J2+,T2+,92+,82+,72+,62+,52+,42+,32'))).toBeCloseTo(100);
    expect(rangePercent(parseRange('AA'))).toBeCloseTo((6 / 1326) * 100);
    expect(rangePercent(parseRange('AKs:0.5'))).toBeCloseTo((2 / 1326) * 100);
  });

  it('同じ手が2回・読めない項目は止まる', () => {
    expect(() => parseRange('AA,KK+')).toThrow(/2回/);
    expect(() => parseRange('KAs')).toThrow();
    expect(() => parseRange('AKx')).toThrow();
  });
});

const dir = 'content/ranges';
const ranges = Object.fromEntries(
  readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => {
      const r = JSON.parse(readFileSync(`${dir}/${n}`, 'utf-8')) as { id: string; range: string };
      return [r.id, parseRange(r.range)];
    }),
);
const get = (id: string) => {
  const r = ranges[id];
  if (!r) throw new Error(`no range ${id}`);
  return r;
};

describe('8つのレンジのつじつま', () => {
  it('4種類の場面 × 2人がそろっている', () => {
    for (const s of ['srp_btn_bb', 'srp_co_bb', 'srp_sb_bb', '3bp_bb_btn']) {
      expect(ranges[`${s}_oop`], s).toBeDefined();
      expect(ranges[`${s}_ip`], s).toBeDefined();
    }
  });

  it('BB が付いていく手と、上げ返す手が重ならない', () => {
    expect(overlap(get('srp_btn_bb_oop'), get('3bp_bb_btn_oop'))).toEqual([]);
    expect(overlap(get('srp_co_bb_oop'), parseRange('JJ+,AQs+,AKo,A5s'))).toEqual([]);
    expect(overlap(get('srp_sb_bb_ip'), parseRange('99+,AJs+,KQs,AQo+,A5s-A3s'))).toEqual([]);
  });

  it('BTN が上げ返しに付いていく手は、BTN が最初に上げた手の中にある。さらに上げ返す QQ+・AK は入れない', () => {
    const open = get('srp_btn_bb_ip');
    expect([...get('3bp_bb_btn_ip').keys()].filter((h) => !open.has(h))).toEqual([]);
    expect(overlap(get('3bp_bb_btn_ip'), parseRange('QQ+,AK'))).toEqual([]);
  });

  it('後ろの席ほど広い（BTN > SB > CO）', () => {
    const pct = (id: string) => rangePercent(get(id));
    expect(pct('srp_btn_bb_ip')).toBeGreaterThan(pct('srp_sb_bb_oop'));
    expect(pct('srp_sb_bb_oop')).toBeGreaterThan(pct('srp_co_bb_ip'));
  });
});
