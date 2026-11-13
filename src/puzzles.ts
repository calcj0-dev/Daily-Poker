// 問題の読み込み（設計書 5章）。今日までの問題だけが public/puzzles/ に置かれる（#7）

import type { DailyPuzzle } from './core/types';

export type IndexEntry = { date: string; number: number };

/** その日の問題を読む。なければ null */
export async function loadPuzzle(date: string): Promise<DailyPuzzle | null> {
  try {
    const res = await fetch(`./puzzles/${date}.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = (await res.json()) as DailyPuzzle;
    return data.date === date ? data : null;
  } catch {
    return null;
  }
}

/** 公開されている日の一覧（新しい順）。読めなければ空 */
export async function loadIndex(): Promise<IndexEntry[]> {
  try {
    const res = await fetch('./puzzles/index.json', { cache: 'no-cache' });
    if (!res.ok) return [];
    const data = (await res.json()) as { days?: IndexEntry[] };
    return [...(data.days ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    return [];
  }
}

/**
 * 見本の問題（URL に ?sample を付けたときだけ）。画面をスマホで確かめるためのもので、公開前に外す。
 * 数字は計算していない
 */
export async function loadSample(): Promise<DailyPuzzle> {
  const mod = await import('./data/sample/2026-12-01.sample.json');
  return mod.default as unknown as DailyPuzzle;
}
