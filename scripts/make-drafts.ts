// 場面の案（content/drafts/specs/day-NN.json）から、作成中の問題（content/drafts/2099-01-NN.json）と
// 計算の設定（content/solver/spots/<id>.json）を作る（設計書 7.1 の手順1・2）。
// 作成中の問題は仮の日付 2099-01-NN（NN＝何日目）で置き、公開日が決まったら assign-dates で付け替える。
// すでにある問題の options・解説・計算の記録は残す（案を変えた問題は --force で作り直す）。
// 使い方：node scripts/make-drafts.ts [--force] day-01 [day-02 ...]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { DailyPuzzle, Spot } from '../src/core/types';
import { buildSpot, type SpotSpec } from './lib/spec.ts';

const root = new URL('..', import.meta.url);
const args = process.argv.slice(2);
const force = args.includes('--force');
const days = args.filter((a) => !a.startsWith('--'));
if (!days.length) {
  console.error('使い方：node scripts/make-drafts.ts [--force] day-01 [day-02 ...]');
  process.exit(2);
}

mkdirSync(new URL('content/solver/spots/', root), { recursive: true });

for (const name of days) {
  const n = Number(/^day-(\d+)$/.exec(name)?.[1]);
  if (!n) throw new Error(`day-NN の形で指定してください：${name}`);
  const specs = JSON.parse(readFileSync(new URL(`content/drafts/specs/${name}.json`, root), 'utf-8')) as { spots: SpotSpec[] };
  const date = `2099-01-${String(n).padStart(2, '0')}`;
  const file = new URL(`content/drafts/${date}.json`, root);
  const prev: DailyPuzzle | null = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf-8')) as DailyPuzzle) : null;

  const spots: Spot[] = specs.spots.map((spec, i) => {
    const id = `${date}-${i + 1}`;
    const built = buildSpot(spec, id, i + 1);
    writeFileSync(new URL(`content/solver/spots/${id}.json`, root), JSON.stringify(built.solver, null, 2) + '\n');
    const old = prev?.spots.find((s) => s.id === id);
    if (!old || force) return built.spot;
    // 案から作る部分は新しく、解説・計算の結果は前のものを残す
    return { ...built.spot, options: old.options, explanation: old.explanation, terms: old.terms.length ? old.terms : built.spot.terms, solver: old.solver };
  });

  const puzzle: DailyPuzzle = { date, number: n, spots };
  writeFileSync(file, JSON.stringify(puzzle, null, 2) + '\n');
  console.log(`${name} → content/drafts/${date}.json（${spots.length} 問）、計算の設定 content/solver/spots/${date}-*.json`);
}
