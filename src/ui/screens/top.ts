// S1 トップ（設計書 2章）。今日の問題・次の問題までの時間

import { monthDay, msUntilNextPuzzle } from '../../core/date';
import { greenCount, marksLine } from '../../core/share';
import { t } from '../../i18n';
import type { Session } from '../../session';
import type { Screen } from '../app';
import { button, h } from '../dom';
import { disclaimer, languageSelect, versionEl } from '../parts';

export type TopProps = {
  /** 今日の問題。準備中なら null */
  session: Session | null;
  onPlay: () => void;
};

export function topScreen(props: TopProps): Screen {
  let timer: ReturnType<typeof setInterval> | undefined;

  function countdown(): string {
    const ms = msUntilNextPuzzle();
    const min = Math.floor(ms / 60000);
    return t('home.next', { h: Math.floor(min / 60), min: min % 60 });
  }

  function todayBlock(): HTMLElement {
    const s = props.session;
    if (!s) return h('section', { className: 'today' }, [h('p', { className: 'muted', text: t('home.notReady') })]);
    const { m, d } = monthDay(s.puzzle.date);
    const day = s.day();
    const next = s.next();
    const children: HTMLElement[] = [h('h2', { className: 'today-title', text: t('home.today', { m, d, n: s.puzzle.number }) })];
    if (next === null && day) {
      children.push(
        h('p', { className: 'muted', text: t('home.done') }),
        h('p', { className: 'marks', text: marksLine(day.marks) }),
        h('p', { text: t('result.greens', { g: greenCount(day.marks) }) }),
        button(t('home.seeResult'), props.onPlay, 'btn btn-primary'),
      );
    } else {
      children.push(button(next === 0 ? t('home.start') : t('home.continue'), props.onPlay, 'btn btn-primary'));
    }
    return h('section', { className: 'today' }, children);
  }

  return {
    render() {
      const next = h('p', { className: 'muted small', text: countdown() });
      clearInterval(timer);
      timer = setInterval(() => (next.textContent = countdown()), 30_000);
      return h('div', { className: 'page' }, [
        h('header', { className: 'top-bar' }, [versionEl(), languageSelect()]),
        h('main', { className: 'top' }, [
          h('h1', { className: 'app-name', text: t('app.name') }),
          h('p', { className: 'tagline', text: t('app.tagline') }),
          todayBlock(),
          next,
        ]),
        disclaimer(),
      ]);
    },
    dispose() {
      clearInterval(timer);
    },
  };
}
