// 作成中の問題（content/drafts/2099-01-NN.json）に、公開日から順に本当の日付と番号を付け、
// content/puzzles/ に移す。計算の設定（content/solver/spots/）の名前と記録も付け替える。
// 使い方：node scripts/assign-dates.ts --start=YYYY-MM-DD [--first-number=1] [--dry-run]

import { existsSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import type { DailyPuzzle } from '../src/core/types';
import { redate } from './lib/redate.ts';

const root = new URL('..', import.meta.url);
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const start = arg('start');
const firstNumber = Number(arg('first-number') ?? 1);
const dryRun = process.argv.includes('--dry-run');
if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
  console.error('使い方：node scripts/assign-dates.ts --start=YYYY-MM-DD [--first-number=1] [--dry-run]');
  process.exit(2);
}

const draftsDir = new URL('content/drafts/', root);
const files = readdirSync(draftsDir).filter((n) => /^2099-01-\d{2}\.json$/.test(n)).sort();
files.forEach((name, i) => {
  const draft = JSON.parse(readFileSync(new URL(name, draftsDir), 'utf-8')) as DailyPuzzle;
  const { puzzle, renames } = redate(draft, start, i, firstNumber + i);
  const out = new URL(`content/puzzles/${puzzle.date}.json`, root);
  console.log(`${name} → content/puzzles/${puzzle.date}.json（#${puzzle.number}）`);
  if (dryRun) return;
  if (existsSync(out)) throw new Error(`${puzzle.date}.json はすでにあります`);
  writeFileSync(out, JSON.stringify(puzzle, null, 2) + '\n');
  for (const [from, to] of renames) {
    const src = new URL(`content/solver/spots/${from}.json`, root);
    if (!existsSync(src)) continue;
    const cfg = JSON.parse(readFileSync(src, 'utf-8')) as { id: string };
    cfg.id = to;
    writeFileSync(src, JSON.stringify(cfg, null, 2) + '\n');
    renameSync(src, new URL(`content/solver/spots/${to}.json`, root));
  }
  rmSync(new URL(name, draftsDir));
});
