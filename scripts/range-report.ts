// レンジの一覧と、全体の何%の手かを出す（オーナーの確認用。設計書 7.2・U4）
// 使い方：node scripts/range-report.ts

import { readdirSync, readFileSync } from 'node:fs';
import { parseRange, rangePercent } from './lib/range.ts';

const dir = new URL('../content/ranges/', import.meta.url);
for (const name of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
  const r = JSON.parse(readFileSync(new URL(name, dir), 'utf-8')) as { id: string; short: { ja: string }; range: string };
  const parsed = parseRange(r.range);
  console.log(`${r.id.padEnd(16)} ${rangePercent(parsed).toFixed(1).padStart(5)}%  ${String(parsed.size).padStart(3)}種類  ${r.short.ja}`);
}
