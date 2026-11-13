// 1日分の問題を解く流れ。答えの採点・記録・保存・計測をまとめる

import { streakBucket, track } from './analytics';
import { config } from './data';
import { grade, type Grade } from './core/grade';
import { nextIndex, recordAnswer } from './core/progress';
import { canShare, greenCount } from './core/share';
import { currentStreak } from './core/stats';
import type { DailyPuzzle, Spot } from './core/types';
import type { createStore, DayRecord } from './storage';

export type Store = ReturnType<typeof createStore>;
export type Session = ReturnType<typeof createSession>;

export function createSession(puzzle: DailyPuzzle, store: Store, opts: { today: () => string }) {
  const spots = config.spotsPerDay;

  function day(): DayRecord | undefined {
    return store.read().days[puzzle.date];
  }

  return {
    puzzle,
    /** 過去の問題か（今日の問題でなければ過去の問題） */
    get archive(): boolean {
      return puzzle.date !== opts.today();
    },
    day,
    /** 次に答える問題（0 から）。全部答えていれば null */
    next(): number | null {
      return nextIndex(day(), spots);
    },
    spot(index: number): Spot {
      const s = puzzle.spots[index];
      if (!s) throw new Error(`no spot ${index}`);
      return s;
    },
    /** シェアできるか（その日の問題として解き終えた日だけ） */
    canShare(): boolean {
      return canShare(day());
    },
    streak(): number {
      return currentStreak(store.read().days, opts.today());
    },
    /** 1問目を開いたとき */
    started(): void {
      if (nextIndex(day(), spots) === 0) track('start', { puzzle: puzzle.number, archive: this.archive });
    },
    /** 答える。すでに答えていれば、その答えの採点を返す（変えられない） */
    answer(index: number, optionId: string): Grade {
      const s = this.spot(index);
      const prev = day()?.answers[index];
      if (prev) return grade(s, prev);
      const g = grade(s, optionId);
      const data = store.read();
      const rec = recordAnswer(data.days[puzzle.date], {
        date: puzzle.date,
        today: opts.today(),
        index,
        optionId,
        mark: g.mark,
        tags: s.tags,
        spotsPerDay: spots,
      });
      data.days[puzzle.date] = rec;
      store.write(data);
      track('answer', { puzzle: puzzle.number, index: index + 1, mark: g.mark, tag: s.street });
      if (rec.finished) {
        track('finish', {
          puzzle: puzzle.number,
          greens: greenCount(rec.marks),
          streak: streakBucket(this.streak()),
          archive: this.archive,
        });
      }
      return g;
    },
  };
}
