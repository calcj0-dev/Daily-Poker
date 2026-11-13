// 起動。今日（日本時間）の問題を読み、トップを出す。
// URL に ?sample を付けると見本の問題で遊べる（画面の確認用。記録は保存しない。公開前に外す）

import './style.css';
import { initAnalytics } from './analytics';
import { config, isLocale } from './data';
import { puzzleDate } from './core/date';
import { setLocale } from './i18n';
import { loadPuzzle, loadSample } from './puzzles';
import { createSession, type Session } from './session';
import { createStore, store } from './storage';
import { createApp } from './ui/app';
import { spotScreen } from './ui/screens/spot';
import { topScreen } from './ui/screens/top';

const saved = store.getLang();
setLocale(isLocale(saved) ? saved : config.languages.default);
initAnalytics();

async function start(root: HTMLElement): Promise<void> {
  const app = createApp(root);
  const sampleMode = new URLSearchParams(location.search).has('sample');
  const puzzle = sampleMode ? await loadSample() : await loadPuzzle(puzzleDate());
  const session: Session | null = puzzle
    ? createSession(puzzle, sampleMode ? createStore(() => undefined) : store, { archive: false })
    : null;

  const goTop = () => app.show(topScreen({ session, onPlay: goPlay }));
  function goPlay(): void {
    if (!session) return;
    if (session.next() === null) {
      goTop();
      return;
    }
    app.show(spotScreen({ session, onBack: goTop, onFinish: goTop }));
  }
  goTop();
}

const root = document.querySelector<HTMLElement>('#app');
if (root) void start(root);
