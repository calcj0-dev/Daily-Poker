// T-06（問題の検査）・T-09（文言・用語のそろい、直書きがないこと）

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../src/data/config.json';
import glossary from '../src/data/glossary.json';
import en from '../src/data/i18n/en.json';
import ja from '../src/data/i18n/ja.json';
import zhHant from '../src/data/i18n/zh-Hant.json';
import sample from './fixtures/2026-12-01.sample.json';
import { validateAll, validatePuzzle, validateStatic, type ValidationContext } from '../scripts/lib/validate';

const ctx = { config, glossary, messages: { ja, en, 'zh-Hant': zhHant } } as unknown as ValidationContext;

/** 見本を「計算済みの公開用の1日分」に作り替えたもの */
function released(): Record<string, any> {
  const p = structuredClone(sample) as Record<string, any>;
  delete p.sample;
  for (const s of p.spots) {
    s.solver = { ...s.solver, commit: 'abc1234', rangesVersion: '1', betSizes: { decision: '33%,67%,a' }, exploitabilityPctPot: 0.25, solvedAt: '2026-11-20' };
  }
  return p;
}

function check(data: unknown, release = true, fileName = '2026-12-01.json'): string[] {
  return validatePuzzle({ fileName, data }, ctx, { release });
}

describe('T-06 問題の検査', () => {
  it('正しいデータは通る（公開用）', () => {
    expect(check(released())).toEqual([]);
  });

  it('見本は開発用では通り、公開用では止まる', () => {
    expect(check(sample, false, '2026-12-01.sample.json')).toEqual([]);
    expect(check(sample, true, '2026-12-01.sample.json').join('\n')).toMatch('sample: true');
  });

  const broken: [string, (p: Record<string, any>) => void, RegExp][] = [
    ['手札と場のカードが重なる', (p) => (p.spots[0].hero.cards = ['Kh', 'Ad']), /同じカード/],
    ['カードの書き方が違う', (p) => (p.spots[0].board[0] = '10h'), /書き方/],
    ['場のカードの枚数と段階が合わない', (p) => (p.spots[0].street = 'turn'), /枚数/],
    ['割合の合計が1でない', (p) => (p.spots[0].options[0].freq = 0.5), /freq の合計/],
    ['解説の言語が欠けている', (p) => delete p.spots[0].explanation['zh-Hant'], /explanation に zh-Hant/],
    ['用語が glossary にない', (p) => p.spots[0].terms.push('nope'), /glossary にありません/],
    ['問題の数が足りない', (p) => p.spots.pop(), /問題の数/],
    ['date とファイル名が違う', (p) => (p.date = '2026-12-02'), /ファイル名/],
    ['相手がベットしているのにチェックを出す', (p) => (p.spots[2].options[0].id = 'check'), /使えません/],
    ['レイズの額がない', (p) => delete p.spots[2].options[2].sizeBB, /sizeBB/],
    ['段階のタグがない', (p) => (p.spots[0].tags = ['value']), /flop／turn／river/],
    ['精度が目標に届いていない', (p) => (p.spots[0].solver.exploitabilityPctPot = 0.5), /精度/],
    ['計算の記録がない', (p) => delete p.spots[0].solver, /solver/],
  ];
  for (const [label, breakIt, expected] of broken) {
    it(`止まる：${label}`, () => {
      const p = released();
      breakIt(p);
      expect(check(p).join('\n')).toMatch(expected);
    });
  }

  it('日をまたいで id が重なる・number が飛ぶと止まる', () => {
    const day1 = released();
    const day2 = released();
    day2.date = '2026-12-02';
    day2.number = 3;
    day2.spots.forEach((s: any, i: number) => (s.id = `2026-12-02-${i + 1}`));
    day2.spots[0].id = '2026-12-01-1';
    const errors = validateAll(
      [
        { fileName: '2026-12-01.json', data: day1 },
        { fileName: '2026-12-02.json', data: day2 },
      ],
      ctx,
      { release: true },
    ).join('\n');
    expect(errors).toMatch(/重なっています/);
    expect(errors).toMatch(/number は 2/);
  });
});

describe('T-09 文言と用語', () => {
  it('config・glossary・3言語の i18n がそろっている', () => {
    expect(validateStatic(ctx)).toEqual([]);
  });

  it('言語のキーが欠けると止まる', () => {
    const { tagline: _, ...app } = en.app;
    const bad = { ...ctx, messages: { ...ctx.messages, en: { ...en, app } } } as unknown as ValidationContext;
    expect(validateStatic(bad).join('\n')).toMatch('app.tagline');
  });

  it('src/ のコードに日本語・中国語の文言を直書きしていない（コメントは除く）', () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.ts$/.test(n)) files.push(p);
      }
    };
    walk('src');
    const offenders = files.filter((f) => {
      const code = readFileSync(f, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      return /[぀-ヿ㐀-鿿]/.test(code);
    });
    expect(offenders).toEqual([]);
  });
});
