// T-07 copy-puzzles：明日以降の日付のファイルが公開されない

import { describe, expect, it } from 'vitest';
import type { DailyPuzzle } from '../src/core/types';
import sampleJson from './fixtures/2026-12-01.sample.json';
import { jstDate, selectPublishable } from '../scripts/lib/publish';

function day(date: string, number: number): { fileName: string; data: DailyPuzzle } {
  const p = structuredClone(sampleJson) as unknown as DailyPuzzle;
  delete p.sample;
  return { fileName: `${date}.json`, data: { ...p, date, number } };
}

describe('T-07 公開する問題', () => {
  const files = [day('2026-12-01', 1), day('2026-12-02', 2), day('2026-12-03', 3)];

  it('今日（日本時間）までだけを公開し、明日以降は公開しない', () => {
    const r = selectPublishable(files, '2026-12-02');
    expect(r.files.map((f) => f.fileName)).toEqual(['2026-12-02.json', '2026-12-01.json']);
    expect(r.index.days).toEqual([
      { date: '2026-12-02', number: 2 },
      { date: '2026-12-01', number: 1 },
    ]);
  });

  it('見本は公開しない', () => {
    const sample = { fileName: '2026-12-01.sample.json', data: sampleJson as unknown as DailyPuzzle };
    expect(selectPublishable([sample], '2027-01-01').files).toEqual([]);
  });

  it('計算の記録とメモは外す', () => {
    const [f] = selectPublishable([day('2026-12-01', 1)], '2026-12-01').files;
    expect(f?.data.spots.every((s) => !('solver' in s))).toBe(true);
    expect('note' in (f?.data ?? {})).toBe(false);
    // 1日分は 20KB 以下（要件定義書 6章）
    expect(JSON.stringify(f?.data).length).toBeLessThan(20_000);
  });

  it('日本時間の0時（UTC 15時）で今日が変わる', () => {
    expect(jstDate(new Date('2026-12-01T14:59:59Z'))).toBe('2026-12-01');
    expect(jstDate(new Date('2026-12-01T15:00:00Z'))).toBe('2026-12-02');
  });
});
