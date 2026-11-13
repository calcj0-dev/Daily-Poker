// S2 問題・S3 答え合わせ（設計書 1.4・2章）

import { config } from '../../data';
import { monthDay } from '../../core/date';
import { lossDisplay, type Grade } from '../../core/grade';
import { MARK_EMOJI } from '../../core/share';
import type { HistoryItem, Spot } from '../../core/types';
import { isMachineTranslated, getLocale, t } from '../../i18n';
import type { Session } from '../../session';
import type { Screen } from '../app';
import { cardRow } from '../cards';
import { button, h } from '../dom';
import { termEl, withTerms } from '../glossaryTip';

export type SpotProps = {
  session: Session;
  onBack: () => void;
  /** 5問解き終えた（結果の画面は #5） */
  onFinish: () => void;
};

const MARK_KEY = { g: 'green', y: 'yellow', r: 'red' } as const;

/** 数を画面用に（小数1けたまで、余計な 0 は付けない） */
export function bb(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function actionLabel(spot: Spot, id: string): string {
  const o = spot.options.find((x) => x.id === id);
  return t(`actionLabels.${id}`, { amount: o?.sizeBB !== undefined ? bb(o.sizeBB) : '' });
}

function who(spot: Spot, actor: HistoryItem['actor']): string {
  return actor === 'hero' ? t('spot.hero') : spot.villain.position;
}

/** 「ここまでの流れ」を開いているか（答えた後に描き直しても閉じないように） */
let historyOpen = false;

function historyBlock(spot: Spot): HTMLElement {
  const groups: { street: string; lines: string[] }[] = [];
  for (const item of spot.history) {
    const line = t(`historyActions.${item.action}`, {
      who: who(spot, item.actor),
      amount: item.amountBB !== undefined ? bb(item.amountBB) : '',
    });
    const last = groups[groups.length - 1];
    if (last && last.street === item.street) last.lines.push(line);
    else groups.push({ street: item.street, lines: [line] });
  }
  const details = h('details', { className: 'history' }, [
    h('summary', { text: t('spot.history') }),
    h(
      'div',
      { className: 'history-body' },
      groups.map((g) =>
        h('p', {}, [
          g.street !== 'preflop' ? h('span', { className: 'history-street', text: t(`streets.${g.street}`) }) : null,
          g.lines.join(' → '),
        ]),
      ),
    ),
  ]);
  details.open = historyOpen;
  details.addEventListener('toggle', () => (historyOpen = details.open));
  return details;
}

function seat(label: string, position: string, stack: number, cards?: string[]): HTMLElement {
  return h('div', { className: 'seat' }, [
    h('div', { className: 'seat-name' }, [h('strong', { text: label }), h('span', { className: 'seat-pos', text: position })]),
    cards ? cardRow(cards, 'lg') : null,
    h('span', { className: 'muted small', text: t('spot.stack', { stack: bb(stack) }) }),
  ]);
}

function tableBlock(spot: Spot): HTMLElement {
  const facing = spot.facing?.amountBB ?? 0;
  // 2人とも 100BB から始まるので、残りは同じ。相手が今ベットしていれば、その分だけ少ない
  const villainStack = spot.effectiveStackBB - facing;
  const pot = h('span', { className: 'pot' }, [termEl('pot', t('spot.pot', { pot: bb(spot.potBB) }))]);
  return h('div', { className: 'table' }, [
    seat(t('spot.villain'), spot.villain.position, villainStack),
    spot.facing ? h('p', { className: 'facing', text: t('spot.facing', { amount: bb(spot.facing.amountBB) }) }) : null,
    h('div', { className: 'board' }, [h('span', { className: 'street', text: t(`streets.${spot.street}`) }), cardRow(spot.board), pot]),
    seat(t('spot.hero'), spot.hero.position, spot.effectiveStackBB, spot.hero.cards),
  ]);
}

function revealBlock(spot: Spot, chosen: string, g: Grade, isLast: boolean, onNext: () => void): HTMLElement {
  const loss = lossDisplay(g);
  const maxFreq = Math.max(...spot.options.map((o) => o.freq));
  const bars = spot.options.map((o) =>
    h('div', { className: `bar-row${o.id === chosen ? ' chosen' : ''}` }, [
      h('span', { className: 'bar-label', text: actionLabel(spot, o.id) }),
      h('span', { className: 'bar-track' }, [
        h('span', { className: `bar-fill${o.freq === maxFreq ? ' top' : ''}`, attrs: { style: `width:${Math.round(o.freq * 100)}%` } }),
      ]),
      h('span', { className: 'bar-pct', text: `${Math.round(o.freq * 100)}%` }),
    ]),
  );
  const explanation = spot.explanation[getLocale()] ?? spot.explanation.ja;
  return h('section', { className: `reveal mark-${g.mark}`, attrs: { 'aria-live': 'polite' } }, [
    h('p', { className: 'reveal-mark' }, [h('span', { className: 'emoji', text: MARK_EMOJI[g.mark] }), t(`reveal.${MARK_KEY[g.mark]}`)]),
    h('p', { text: t('reveal.yourChoice', { action: actionLabel(spot, chosen) }) }),
    h('p', { className: 'reveal-heading', text: t('reveal.solverMix') }),
    h('div', { className: 'bars' }, bars),
    h('p', { className: 'loss', text: loss.nearZero ? t('reveal.evLossZero') : t('reveal.evLoss', { loss: loss.loss, pct: loss.pct }) }),
    h('p', { className: 'explanation' }, withTerms(explanation, spot.terms)),
    isMachineTranslated() ? h('p', { className: 'muted small', text: t('common.aiNote') }) : null,
    spot.terms.length ? h('p', { className: 'terms' }, spot.terms.map((id) => termEl(id))) : null,
    h('p', { className: 'muted small', text: t('common.solverNote') }),
    button(isLast ? t('reveal.toResult') : t('reveal.next'), onNext, 'btn btn-primary btn-wide'),
  ]);
}

export function spotScreen(props: SpotProps): Screen {
  const { session } = props;
  let index = session.next() ?? 0;
  let revealed: { chosen: string; grade: Grade } | null = null;
  let host: HTMLElement | null = null;

  session.started();

  function choose(id: string): void {
    if (revealed) return;
    revealed = { chosen: id, grade: session.answer(index, id) };
    redraw();
    host?.querySelector('.reveal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function next(): void {
    const n = session.next();
    if (n === null) {
      props.onFinish();
      return;
    }
    index = n;
    revealed = null;
    redraw();
    window.scrollTo(0, 0);
  }

  function redraw(): void {
    if (!host) return;
    host.replaceChildren(...content().filter((x): x is HTMLElement => x !== null));
  }

  function content(): (HTMLElement | null)[] {
    const spot = session.spot(index);
    const { m, d } = monthDay(session.puzzle.date);
    const options = h(
      'div',
      { className: 'options' },
      spot.options.map((o) => {
        const b = button(actionLabel(spot, o.id), () => choose(o.id), 'btn btn-option');
        if (revealed) {
          b.disabled = true;
          if (o.id === revealed.chosen) b.classList.add('chosen');
        }
        return b;
      }),
    );
    return [
      h('header', { className: 'spot-bar' }, [
        button('←', props.onBack, 'btn-icon'),
        h('span', { text: `${m}/${d} #${session.puzzle.number}` }),
        h('span', { className: 'progress', text: t('spot.progress', { i: index + 1, total: config.spotsPerDay }) }),
      ]),
      spot.history.length ? historyBlock(spot) : null,
      tableBlock(spot),
      revealed ? null : h('p', { className: 'your-turn', text: t('spot.yourTurn') }),
      options,
      revealed ? revealBlock(spot, revealed.chosen, revealed.grade, session.next() === null, next) : null,
    ];
  }

  return {
    render() {
      host = h('div', { className: 'page spot' }, content());
      return h('div', {}, [host, h('footer', { className: 'disclaimer', text: t('common.disclaimer') })]);
    },
  };
}
