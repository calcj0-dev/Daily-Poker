// 1日分の問題を解く流れ。答えの採点・記録・保存・計測をまとめる

import { track } from './analytics';
import { config } from './data';
import { puzzleDate } from './core/date';
import { grade, type Grade } from './core/grade';
import { nextIndex, recordAnswer } from './core/progress';
import type { DailyPuzzle, Spot } from './core/types';
import type { createStore, DayRecord } from './storage';

export type Session = ReturnType<typeof createSession>;

export function createSession(
  puzzle: DailyPuzzle,
  store: ReturnType<typeof createStore>,
  opts: { archive: boolean; now?: () => Date },
) {
  const now = opts.now ?? (() => new Date());
  const spots = config.spotsPerDay;

  function day(): DayRecord | undefined {
    return store.read().days[puzzle.date];
  }

  return {
    puzzle,
    archive: opts.archive,
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
    /** 1問目を開いたとき */
    started(): void {
      if (nextIndex(day(), spots) === 0) track('start', { puzzle: puzzle.number, archive: opts.archive });
    },
    /** 答える。すでに答えていれば、その答えの採点を返す（変えられない） */
    answer(index: number, optionId: string): Grade {
      const s = this.spot(index);
      const prev = day()?.answers[index];
      if (prev) return grade(s, prev);
      const g = grade(s, optionId);
      const data = store.read();
      data.days[puzzle.date] = recordAnswer(data.days[puzzle.date], {
        date: puzzle.date,
        today: puzzleDate(now()),
        index,
        optionId,
        mark: g.mark,
        tags: s.tags,
        spotsPerDay: spots,
      });
      store.write(data);
      track('answer', { puzzle: puzzle.number, index: index + 1, mark: g.mark, tag: s.street });
      return g;
    },
  };
}
