// 問題・設定・文言の検査（設計書 4.3）。
// 使い方：node scripts/validate-puzzles.ts [--release] [問題のフォルダ]
//   --release … 公開用。見本（sample: true）を通さず、計算の記録も必ず調べる
// 問題のフォルダの初期値は content/puzzles

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateAll, type PuzzleFile, type ValidationContext } from './lib/validate.ts';

const root = new URL('..', import.meta.url);
const readJson = (path: string): unknown => JSON.parse(readFileSync(new URL(path, root), 'utf-8'));

const args = process.argv.slice(2);
const release = args.includes('--release');
const dir = args.find((a) => !a.startsWith('--')) ?? 'content/puzzles';

const config = readJson('src/data/config.json') as ValidationContext['config'];
const ctx: ValidationContext = {
  config,
  glossary: readJson('src/data/glossary.json') as ValidationContext['glossary'],
  messages: Object.fromEntries(
    config.languages.available.map((l) => [l, readJson(`src/data/i18n/${l}.json`)]),
  ) as ValidationContext['messages'],
};

const dirPath = new URL(`${dir.replace(/\\/g, '/').replace(/\/?$/, '/')}`, root);
const files: PuzzleFile[] = [];
const parseErrors: string[] = [];
if (existsSync(dirPath)) {
  for (const name of readdirSync(dirPath).filter((n) => n.endsWith('.json') && n !== 'index.json').sort()) {
    try {
      files.push({ fileName: name, data: JSON.parse(readFileSync(new URL(name, dirPath), 'utf-8')) });
    } catch (e) {
      parseErrors.push(`${name}: JSON として読めません（${(e as Error).message}）`);
    }
  }
}

const errors = [...parseErrors, ...validateAll(files, ctx, { release })];
const label = `${join(dir)}（${files.length} 日分、${release ? '公開用' : '開発用'}）`;
if (errors.length) {
  console.error(`検査で ${errors.length} 件の問題が見つかりました：${label}`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`検査を通りました：${label}`);
