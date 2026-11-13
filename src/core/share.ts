// シェアの文（設計書 1.5）。文面は i18n の share.text。手札や答えは入れない

import { t } from '../i18n';
import type { DayRecord, Mark } from '../storage';
import { monthDay } from './date';

export const MARK_EMOJI: Record<Mark, string> = { g: '🟩', y: '🟨', r: '🟥' };

export function marksLine(marks: (Mark | null)[]): string {
  return marks.map((m) => (m ? MARK_EMOJI[m] : '⬜')).join('');
}

export function greenCount(marks: (Mark | null)[]): number {
  return marks.filter((m) => m === 'g').length;
}

/** シェアできるか：その日の問題として解き終えた日だけ（過去の問題はシェアできない） */
export function canShare(day: DayRecord | undefined): boolean {
  return !!day && day.finished && day.playedOnDay;
}

/** シェアの文（URL は含めない。コピー・X の投稿画面で別に付ける） */
export function shareText(input: { number: number; date: string; marks: (Mark | null)[]; streak: number }): string {
  const { m, d } = monthDay(input.date);
  return t('share.text', {
    n: input.number,
    m,
    d,
    g: greenCount(input.marks),
    marks: marksLine(input.marks),
    streak: input.streak,
  });
}
