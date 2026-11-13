// 起動と画面のつなぎ。今日（日本時間）の問題を読み、トップを出す。
// URL に ?sample を付けると見本の問題で遊べる（画面の確認用。見本の日を「今日」として扱い、記録は保存しない。公開前に外す）

import './style.css';
import { initAnalytics, track } from './analytics';
import { config, isLocale } from './data';
import { puzzleDate } from './core/date';
import type { DailyPuzzle } from './core/types';
import { setLocale } from './i18n';
import { loadIndex, loadPuzzle, loadSample, type IndexEntry } from './puzzles';
import { createSession, type Session } from './session';
import { createStore, memoryStorage, store as deviceStore } from './storage';
import { createApp } from './ui/app';
import { archiveScreen } from './ui/screens/archive';
import { resultScreen } from './ui/screens/result';
import { spotScreen } from './ui/screens/spot';
import { statsScreen } from './ui/screens/stats';
import { topScreen } from './ui/screens/top';

const saved = deviceStore.getLang();
setLocale(isLocale(saved) ? saved : config.languages.default);
initAnalytics();

async function start(root: HTMLElement): Promise<void> {
  const app = createApp(root);
  const sample = new URLSearchParams(location.search).has('sample') ? await loadSample() : null;
  const memory = memoryStorage();
  const store = sample ? createStore(() => memory) : deviceStore;
  const today = sample ? () => sample.date : () => puzzleDate();

  const sessions = new Map<string, Session>();
  function sessionFor(puzzle: DailyPuzzle): Session {
    let s = sessions.get(puzzle.date);
    if (!s) {
      s = createSession(puzzle, store, { today });
      sessions.set(puzzle.date, s);
    }
    return s;
  }
  async function load(date: string): Promise<DailyPuzzle | null> {
    if (sample) return date === sample.date ? sample : null;
    return loadPuzzle(date);
  }

  let todayPuzzle = await load(today());

  let atTop = false;
  function goTop(): void {
    atTop = true;
    const session = todayPuzzle ? sessionFor(todayPuzzle) : null;
    app.show(
      topScreen({
        session,
        onPlay: () => session && goPlay(session),
        onResult: () => session && goResult(session),
        onArchive: goArchive,
        onStats: goStats,
      }),
    );
  }
  function goPlay(session: Session): void {
    atTop = false;
    if (session.next() === null) return goResult(session);
    app.show(spotScreen({ session, onBack: goTop, onFinish: () => goResult(session) }));
  }
  function goResult(session: Session): void {
    atTop = false;
    app.show(resultScreen({ session, onTop: goTop, onArchive: goArchive }));
  }
  async function goArchive(): Promise<void> {
    atTop = false;
    track('archive_open', {});
    const entries: IndexEntry[] = sample ? [{ date: sample.date, number: sample.number }] : await loadIndex();
    app.show(
      archiveScreen({
        entries,
        days: () => store.read().days,
        onTop: goTop,
        onPick: async (e) => {
          const p = await load(e.date);
          if (p) goPlay(sessionFor(p));
        },
      }),
    );
  }
  function goStats(): void {
    atTop = false;
    track('stats_open', {});
    app.show(statsScreen({ store, today, onTop: goTop }));
  }

  goTop();

  // 1分おきに確かめる（開いたままの人のため。トップを見ているときだけ描き直す）
  // ・日本時間の0時をまたいだら、次の問題を読む
  // ・今日の問題がまだ無ければ（0時の作り直しが遅れているとき）、読み直し続ける（設計書 5.2・U9）
  let shownDate = today();
  setInterval(async () => {
    const changed = today() !== shownDate;
    if (!changed && todayPuzzle) return;
    shownDate = today();
    const loaded = await load(shownDate);
    if (!changed && !loaded) return;
    todayPuzzle = loaded;
    if (atTop) goTop();
  }, 60_000);
}

const root = document.querySelector<HTMLElement>('#app');
if (root) void start(root);
