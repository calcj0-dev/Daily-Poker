// mp-solve の結果（out/<id>.json）を、問題のファイルの options・solver に書き込む（設計書 7.4）。
// 使い方：node scripts/merge-solver-output.ts <mp-solve の out フォルダ> [問題のフォルダ]
//   問題のフォルダの初期値は content/puzzles。id（YYYY-MM-DD-n）の日付のファイルの n 問目に書く

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DailyPuzzle } from '../src/core/types';
import { mergeSolverOutput, type SolverOutput } from './lib/merge.ts';

const [outDir, puzzleDir = 'content/puzzles'] = process.argv.slice(2);
if (!outDir) {
  console.error('使い方：node scripts/merge-solver-output.ts <mp-solve の out フォルダ> [問題のフォルダ]');
  process.exit(2);
}

const outputs = readdirSync(outDir)
  .filter((n) => n.endsWith('.json'))
  .map((n) => JSON.parse(readFileSync(join(outDir, n), 'utf-8')) as SolverOutput);

const byDate = new Map<string, SolverOutput[]>();
for (const o of outputs) {
  const date = o.id.slice(0, 10);
  byDate.set(date, [...(byDate.get(date) ?? []), o]);
}

let merged = 0;
const errors: string[] = [];
for (const [date, list] of byDate) {
  const file = join(puzzleDir, `${date}.json`);
  let puzzle: DailyPuzzle;
  try {
    puzzle = JSON.parse(readFileSync(file, 'utf-8')) as DailyPuzzle;
  } catch {
    errors.push(`${file} がありません（${list.map((o) => o.id).join(', ')}）`);
    continue;
  }
  for (const o of list) {
    try {
      puzzle = mergeSolverOutput(puzzle, o);
      merged++;
    } catch (e) {
      errors.push(`${o.id}：${(e as Error).message}`);
    }
  }
  writeFileSync(file, JSON.stringify(puzzle, null, 2) + '\n');
}

console.log(`${merged} 問に計算の結果を書き込みました`);
if (errors.length) {
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
