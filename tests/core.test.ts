// T-01〜T-05・T-08（設計書 10.1）

import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../src/data';
import { addDays, msUntilNextPuzzle, puzzleDate } from '../src/core/date';
import { grade, lossDisplay } from '../src/core/grade';
import { emptyDay, nextIndex, recordAnswer } from '../src/core/progress';
import { canShare, shareText } from '../src/core/share';
import { computeStats, currentStreak, maxStreak } from '../src/core/stats';
import type { DailyPuzzle, Spot } from '../src/core/types';
import { setLocale } from '../src/i18n';
import { createStore, type DayRecord } from '../src/storage';
import sampleJson from '../src/data/sample/2026-12-01.sample.json';

const sample = sampleJson as unknown as DailyPuzzle;
const spot = (i: number) => sample.spots[i] as Spot;

describe('T-01 採点（見本の問題）', () => {
  it('1問目：チェックは損2.7%・割合20%で🟨、オールインは損33.6%で🟥、1/3は🟩', () => {
    const check = grade(spot(0), 'check');
    expect(check.lossPct).toBeCloseTo(2.727, 2);
    expect(check.mark).toBe('y');
    const allin = grade(spot(0), 'allin');
    expect(allin.lossPct).toBeCloseTo(33.6, 1);
    expect(allin.mark).toBe('r');
    expect(grade(spot(0), 'bet33').mark).toBe('g');
    expect(grade(spot(0), 'bet67').mark).toBe('y');
  });

  it('3問目：相手のベットを基準のポットに含める（9.1＋6.1）', () => {
    const fold = grade(spot(2), 'fold');
    expect(fold.lossPct).toBeCloseTo((0.12 / 15.2) * 100, 6);
    expect(fold.mark).toBe('g');
    expect(grade(spot(2), 'call').mark).toBe('g');
    expect(grade(spot(2), 'raise').mark).toBe('r');
  });

  it('4問目：損が5%を超え、お手本も選ばない 1/3 は🟥', () => {
    expect(grade(spot(3), 'check').mark).toBe('y');
    expect(grade(spot(3), 'bet33').mark).toBe('r');
    expect(grade(spot(3), 'allin').mark).toBe('y');
  });

  it('お手本との差の表示：0.05BB 未満は「ほぼなし」', () => {
    expect(lossDisplay(grade(spot(0), 'bet33')).nearZero).toBe(true);
    expect(lossDisplay(grade(spot(0), 'check'))).toEqual({ nearZero: false, loss: '0.1', pct: '3' });
  });
});

describe('T-02 境目ちょうど', () => {
  const make = (evs: number[], freqs: number[]): Pick<Spot, 'potBB' | 'facing' | 'options'> => ({
    potBB: 100,
    facing: null,
    options: evs.map((evBB, i) => ({ id: `o${i}`, evBB, freq: freqs[i] ?? 0 })),
  });

  it('損がちょうど1%は🟩、ちょうど5%は🟨、割合ちょうど10%は🟨', () => {
    const s = make([10, 9, 5, 4.9, 4.9], [0.8, 0, 0, 0.1, 0.0999]);
    expect(grade(s, 'o1').mark).toBe('g');
    expect(grade(s, 'o2').mark).toBe('y');
    expect(grade(s, 'o3').mark).toBe('y');
    expect(grade(s, 'o4').mark).toBe('r');
  });

  it('小数の誤差があっても境目を含める（ポット9.1で損0.091＝1%）', () => {
    const s = { potBB: 9.1, facing: null, options: [{ id: 'a', evBB: 1, freq: 1 }, { id: 'b', evBB: 1 - 0.091, freq: 0 }] };
    expect(grade(s, 'b').mark).toBe('g');
  });

  it('問題ごとの grading で境目を上書きできる', () => {
    const s = { ...make([10, 8], [1, 0]), grading: { greenMaxLossPctPot: 2 } };
    expect(grade(s, 'o1').mark).toBe('g');
  });
});

describe('T-03 日本時間の日付', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Taipei']) {
    it(`端末が ${tz} でも、日本時間の0時（UTC 15時）で切り替わる`, () => {
      process.env.TZ = tz;
      expect(puzzleDate(new Date('2026-12-01T14:59:59Z'))).toBe('2026-12-01');
      expect(puzzleDate(new Date('2026-12-01T15:00:00Z'))).toBe('2026-12-02');
    });
  }

  it('次の問題までの時間・月またぎ・年またぎ', () => {
    expect(msUntilNextPuzzle(new Date('2026-12-01T14:00:00Z'))).toBe(60 * 60 * 1000);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });
});

/** 5問を順に答えた DayRecord */
function play(date: string, today: string, marks = ['g', 'g', 'y', 'r', 'g'] as const): DayRecord {
  let day: DayRecord | undefined;
  marks.forEach((mark, index) => {
    day = recordAnswer(day, { date, today, index, optionId: 'call', mark, tags: ['river', 'bluffcatch'], spotsPerDay: 5 });
  });
  return day!;
}

describe('T-04 連続日数', () => {
  it('毎日解いた：3日続けば3', () => {
    const days = { '2026-12-01': play('2026-12-01', '2026-12-01'), '2026-12-02': play('2026-12-02', '2026-12-02'), '2026-12-03': play('2026-12-03', '2026-12-03') };
    expect(currentStreak(days, '2026-12-03')).toBe(3);
    // 今日をまだ解いていなくても、昨日まで続いていれば保たれる
    expect(currentStreak(days, '2026-12-04')).toBe(3);
    // 1日あくと0
    expect(currentStreak(days, '2026-12-05')).toBe(0);
  });

  it('1日あけた：あけた後の日から数え直し、最長は残る', () => {
    const days = { '2026-12-01': play('2026-12-01', '2026-12-01'), '2026-12-02': play('2026-12-02', '2026-12-02'), '2026-12-04': play('2026-12-04', '2026-12-04') };
    expect(currentStreak(days, '2026-12-04')).toBe(1);
    expect(maxStreak(days)).toBe(2);
  });

  it('過去の問題を後から解いても数えない（シェアもできない）', () => {
    const days = { '2026-12-01': play('2026-12-01', '2026-12-05'), '2026-12-02': play('2026-12-02', '2026-12-02') };
    expect(days['2026-12-01'].playedOnDay).toBe(false);
    expect(currentStreak(days, '2026-12-02')).toBe(1);
    expect(canShare(days['2026-12-01'])).toBe(false);
    expect(canShare(days['2026-12-02'])).toBe(true);
  });

  it('0時をまたいで解き終えても、その日に解き始めていれば数える（決定メモ）', () => {
    let day = recordAnswer(undefined, { date: '2026-12-01', today: '2026-12-01', index: 0, optionId: 'call', mark: 'g', tags: ['river'], spotsPerDay: 5 });
    for (let i = 1; i < 5; i++) day = recordAnswer(day, { date: '2026-12-01', today: '2026-12-02', index: i, optionId: 'call', mark: 'g', tags: ['river'], spotsPerDay: 5 });
    expect(day.playedOnDay).toBe(true);
    expect(currentStreak({ '2026-12-01': day }, '2026-12-02')).toBe(1);
  });

  it('一度答えた問題は変えられない・次の問題の番号', () => {
    const d1 = recordAnswer(undefined, { date: 'x', today: 'x', index: 0, optionId: 'call', mark: 'g', tags: [], spotsPerDay: 5 });
    const d2 = recordAnswer(d1, { date: 'x', today: 'x', index: 0, optionId: 'fold', mark: 'r', tags: [], spotsPerDay: 5 });
    expect(d2.answers[0]).toBe('call');
    expect(nextIndex(d2, 5)).toBe(1);
    expect(nextIndex(undefined, 5)).toBe(0);
    expect(nextIndex(play('x', 'x'), 5)).toBeNull();
  });

  it('成績：解いた日数・🟩の割合・場面別（3問以上のタグだけ）', () => {
    const days = { '2026-12-01': play('2026-12-01', '2026-12-01'), '2026-12-02': emptyDay(5) };
    days['2026-12-02'] = recordAnswer(days['2026-12-02'], { date: '2026-12-02', today: '2026-12-02', index: 0, optionId: 'check', mark: 'r', tags: ['flop'], spotsPerDay: 5 });
    const s = computeStats(days, '2026-12-02');
    expect(s.played).toBe(1);
    expect(s.greenRate).toBeCloseTo(3 / 6);
    expect(s.byTag.map((x) => x.tag)).toEqual(['bluffcatch', 'river']);
    expect(s.byTag[0]?.rate).toBeCloseTo(3 / 5);
  });
});

describe('T-05 保存できない環境', () => {
  it('保存できなくても答えを記録して遊べ、保存できないことが分かる', () => {
    const store = createStore(() => {
      throw new Error('blocked');
    });
    expect(store.available()).toBe(false);
    const data = store.read();
    data.days['2026-12-01'] = play('2026-12-01', '2026-12-01');
    store.write(data);
    expect(store.read().days['2026-12-01']?.finished).toBe(true);
  });
});

describe('T-08 シェアの文', () => {
  afterEach(() => setLocale('ja'));
  const marks = ['g', 'y', 'g', 'g', 'r'] as const;

  it('3言語とも、番号・日付・マス・🟩の数・連続日数が入り、手札・答えは入らない', () => {
    const expected = {
      ja: 'Daily Poker #1 12/1 🟩3つ\n🟩🟨🟩🟩🟥\n連続 5日',
      en: 'Daily Poker #1 12/1 🟩3/5\n🟩🟨🟩🟩🟥\nStreak 5',
      'zh-Hant': 'Daily Poker #1 12/1 🟩3/5\n🟩🟨🟩🟩🟥\n連續 5 天',
    } as const;
    for (const l of config.languages.available) {
      setLocale(l);
      const text = shareText({ number: 1, date: '2026-12-01', marks: [...marks], streak: 5 });
      expect(text).toBe(expected[l]);
      // カード（Ah など）・行動の名前が入っていない
      expect(text).not.toMatch(/[2-9TJQKA][shdc]|[♠♥♦♣]/);
      for (const a of ['check', 'call', 'fold', 'raise', 'bet', 'allin', 'チェック', 'コール', 'フォールド', 'Check', 'Call', 'Fold']) {
        expect(text).not.toContain(a);
      }
    }
  });
});
