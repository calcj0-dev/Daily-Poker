// 日本時間で今日までの問題だけを public/puzzles/ に置き、index.json を作る（設計書 5.2）。
// ビルドの前に動く。毎日0時（日本時間）に GitHub Actions が Vercel を作り直し、その日の問題が出る。
// 使い方：node scripts/copy-puzzles.ts [--today=YYYY-MM-DD]

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { DailyPuzzle } from '../src/core/types';
import { jstDate, selectPublishable } from './lib/publish.ts';

const root = new URL('..', import.meta.url);
const src = new URL('content/puzzles/', root);
const out = new URL('public/puzzles/', root);

const todayArg = process.argv.find((a) => a.startsWith('--today='))?.slice('--today='.length);
const today = todayArg ?? jstDate(new Date());

const files = readdirSync(src)
  .filter((n) => n.endsWith('.json'))
  .map((fileName) => ({ fileName, data: JSON.parse(readFileSync(new URL(fileName, src), 'utf-8')) as DailyPuzzle }));

const { files: publish, index } = selectPublishable(files, today);

// 前のビルドで置いた問題を残さない（先の日の問題が残らないように）
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of publish) writeFileSync(new URL(f.fileName, out), JSON.stringify(f.data));
writeFileSync(new URL('index.json', out), JSON.stringify(index));

console.log(`問題を公開します：今日 ${today}（日本時間）まで ${publish.length} 日分`);
