// S2 問題・S3 答え合わせ（設計書 1.4・2章）

import { config } from '../../data';
import { monthDay } from '../../core/date';
import { lossDisplay, type Grade } from '../../core/grade';
import { MARK_EMOJI } from '../../core/share';
import { fullHistory, SEATS } from '../../core/history';
import { buildReplay, type ReplayStep, type SeatAction } from '../../core/replay';
import type { HistoryItem, Spot } from '../../core/types';
import { isMachineTranslated, getLocale, t } from '../../i18n';
import type { Session } from '../../session';
import type { Screen } from '../app';
import { cardParts, cardRow } from '../cards';
import { button, h } from '../dom';
import { termEl, withTerms } from '../glossaryTip';
import { footer, settingsButton } from '../parts';

export type SpotProps = {
  session: Session;
  onBack: () => void;
  /** 5問解き終えた（結果の画面は #5） */
  onFinish: () => void;
};

const MARK_KEY = { g: 'green', y: 'yellow', r: 'red' } as const;

/** BB で持っている額を、画面用のチップの数に（ブラインド 50/100 なら 9.1BB → 910。言語に合わせて桁区切り） */
export function chips(bbAmount: number): string {
  return new Intl.NumberFormat(getLocale()).format(Math.round(bbAmount * config.display.bigBlind));
}

/**
 * その行動で賭ける額（BB）。データに sizeBB があればそれ、ベットは今のポット×割合、
 * オールインは残りのチップ。額のない行動（チェック・コール・フォールド）は undefined
 */
export function actionAmountBB(spot: Pick<Spot, 'options' | 'potBB' | 'effectiveStackBB'>, id: string): number | undefined {
  const o = spot.options.find((x) => x.id === id);
  if (o?.sizeBB !== undefined) return o.sizeBB;
  const action = config.actions[id];
  // 計算した額は 10 チップ単位（0.1BB）に丸める（実際のテーブルで1枚単位の額は出ないため）
  if (action?.kind === 'bet' && action.potFraction !== undefined) return Math.round(spot.potBB * action.potFraction * 10) / 10;
  if (action?.kind === 'allin') return spot.effectiveStackBB;
  return undefined;
}

function actionLabel(spot: Spot, id: string): string {
  const amount = actionAmountBB(spot, id);
  return t(`actionLabels.${id}`, { amount: amount !== undefined ? chips(amount) : '' });
}

/** ボタンの下に小さく出す説明（ベットの「ポットの1/3」など）。なければ null */
function actionSub(id: string): string | null {
  const key = `actionSub.${id}`;
  const s = t(key);
  return s === key ? null : s;
}

function who(spot: Spot, actor: HistoryItem['actor']): string {
  return actor === 'hero' ? t('spot.you', { pos: spot.hero.position }) : spot.villain.position;
}

/** 文字の「ここまでの流れ」を開いているか（再生があるので最初は閉じる。描き直しても状態を保つ） */
let historyOpen = false;

function historyBlock(spot: Spot): HTMLElement {
  const groups: { street: string; lines: string[] }[] = [];
  for (const e of fullHistory(spot)) {
    const street = e.kind === 'folds' ? e.street : e.item.street;
    const line =
      e.kind === 'folds'
        ? t('historyActions.folds', { who: e.positions.join(t('spot.listSep')) })
        : t(`historyActions.${e.item.action}`, {
            who: who(spot, e.item.actor),
            amount: e.item.amountBB !== undefined ? chips(e.item.amountBB) : '',
          });
    const last = groups[groups.length - 1];
    if (last && last.street === street) last.lines.push(line);
    else groups.push({ street, lines: [line] });
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

/**
 * テーブルの席の場所（あなたを一番下に置き、時計回り）。値は % の [横, 縦]。
 * 一番下（あなた）はテーブルの外に手札と一緒に出すので、ここには5席分
 */
const SLOTS: [number, number][] = [
  [9, 80],
  [9, 22],
  [50, 4],
  [91, 22],
  [91, 80],
];

/** 席の吹き出しの文（フォールド・チェック・コール・レイズ 250 など） */
function seatActionText(a: SeatAction): string {
  return t(`seatActions.${a.action}`, { amount: a.amountBB !== undefined ? chips(a.amountBB) : '' });
}

function bubble(a: SeatAction | undefined): HTMLElement | null {
  if (!a) return null;
  return h('span', { className: `seat-bubble act-${a.action}`, text: seatActionText(a) });
}

/** 再生の場面の説明（テーブルの下に出す1行） */
function captionText(spot: Spot, step: ReplayStep): string {
  const c = step.caption;
  if (c.kind === 'blinds') return t('historyActions.blinds', { sb: chips(0.5), bb: chips(1) });
  if (c.kind === 'folds') return t('historyActions.folds', { who: c.positions.join(t('spot.listSep')) });
  if (c.kind === 'deal') return t('spot.deal', { street: t(`streets.${c.street}`), cards: spot.board.slice(0, step.boardCount).map(cardText).join(' ') });
  if (c.kind === 'facing') return t('spot.facing', { amount: chips(c.amountBB) });
  return t(`historyActions.${c.item.action}`, {
    who: who(spot, c.item.actor),
    amount: c.item.amountBB !== undefined ? chips(c.item.amountBB) : '',
  });
}

function cardText(card: string): string {
  const p = cardParts(card);
  return `${p.rank}${p.symbol}`;
}

/** テーブルの真ん中に出すポット：集まった分＋この段階で賭けている分（採点の基準のポットと同じ） */
function totalPot(step: ReplayStep): number {
  return step.potBB + Object.values(step.bets).reduce<number>((a, v) => a + (v ?? 0), 0);
}

function tableBlock(spot: Spot, step: ReplayStep): HTMLElement {
  const folded = new Set(step.folded);
  const actors = new Set(step.actors);
  const heroAt = SEATS.indexOf(spot.hero.position);

  const others = SLOTS.map(([x, y], k) => {
    const pos = SEATS[(heroAt + k + 1) % SEATS.length]!;
    const isVillain = pos === spot.villain.position;
    const cls = ['seat6', folded.has(pos) ? 'folded' : '', isVillain ? 'villain' : '', actors.has(pos) ? 'acting' : ''].filter(Boolean).join(' ');
    return h('div', { className: cls, attrs: { style: `left:${x}%;top:${y}%` } }, [
      h('span', { className: 'seat6-pos' }, [pos, pos === 'BTN' ? h('span', { className: 'dealer', text: 'D' }) : null]),
      isVillain ? h('span', { className: 'seat6-sub', text: t('spot.villain') }) : null,
      folded.has(pos) ? null : h('span', { className: 'seat6-sub', text: chips(step.stacks[pos]) }),
      bubble(step.last[pos] ?? (folded.has(pos) ? { action: 'fold' } : undefined)),
    ]);
  });

  const felt = h('div', { className: 'felt' }, [
    h('div', { className: 'felt-center' }, [
      h('span', { className: 'street', text: step.street === 'preflop' ? '' : t(`streets.${step.street}`) }),
      step.boardCount ? cardRow(spot.board.slice(0, step.boardCount)) : h('span', { className: 'board-empty' }),
      h('span', { className: 'pot' }, [termEl('pot', t('spot.pot', { pot: chips(totalPot(step)) }))]),
    ]),
    ...others,
  ]);

  const heroPos = spot.hero.position;
  const hero = h('div', { className: `hero-seat${actors.has(heroPos) ? ' acting' : ''}` }, [
    h('div', { className: 'seat-name' }, [
      h('strong', { text: t('spot.hero') }),
      h('span', { className: 'seat-pos' }, [heroPos, heroPos === 'BTN' ? h('span', { className: 'dealer', text: 'D' }) : null]),
      bubble(step.last[heroPos]),
    ]),
    cardRow(spot.hero.cards, 'lg'),
    h('span', { className: 'muted small', text: t('spot.stack', { stack: chips(step.stacks[heroPos]) }) }),
  ]);

  return h('div', { className: 'table', attrs: { 'aria-label': t('spot.table') } }, [felt, hero]);
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

/** 再生で1手を見せる時間（ミリ秒） */
const STEP_MS = 1100;

export function spotScreen(props: SpotProps): Screen {
  const { session } = props;
  let index = session.next() ?? 0;
  let revealed: { chosen: string; grade: Grade } | null = null;
  let host: HTMLElement | null = null;

  // 再生：問題の前に、テーブルの上で1手ずつ見せる
  let steps: ReplayStep[] = buildReplay(session.spot(index));
  let step = 0;
  let replaying = true;
  let timer: ReturnType<typeof setTimeout> | undefined;

  session.started();

  function stopAuto(): void {
    clearTimeout(timer);
    timer = undefined;
  }

  function startReplay(): void {
    stopAuto();
    steps = buildReplay(session.spot(index));
    step = 0;
    replaying = true;
    redraw();
    auto();
  }

  function auto(): void {
    stopAuto();
    timer = setTimeout(() => {
      if (step < steps.length - 1) {
        step++;
        redraw();
        auto();
      } else {
        finishReplay();
      }
    }, STEP_MS);
  }

  function finishReplay(): void {
    stopAuto();
    step = steps.length - 1;
    replaying = false;
    redraw();
  }

  function go(delta: number): void {
    stopAuto();
    step = Math.max(0, Math.min(steps.length - 1, step + delta));
    redraw();
  }

  function choose(id: string): void {
    if (revealed || replaying) return;
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
    window.scrollTo(0, 0);
    startReplay();
  }

  function redraw(): void {
    if (!host) return;
    host.replaceChildren(...content().filter((x): x is HTMLElement => x !== null));
  }

  function replayControls(spot: Spot): HTMLElement {
    const cur = steps[step]!;
    const prev = button('◀', () => go(-1), 'btn btn-step');
    prev.disabled = step === 0;
    prev.setAttribute('aria-label', t('replay.prev'));
    const fwd = button('▶', () => (step === steps.length - 1 ? finishReplay() : go(1)), 'btn btn-step');
    fwd.setAttribute('aria-label', t('replay.next'));
    return h('div', { className: 'replay' }, [
      h('p', { className: 'replay-caption', attrs: { 'aria-live': 'polite' } }, [captionText(spot, cur)]),
      h('div', { className: 'replay-controls' }, [
        prev,
        h('span', { className: 'replay-count', text: t('replay.step', { i: step + 1, n: steps.length }) }),
        fwd,
        button(t('replay.skip'), finishReplay, 'btn btn-skip'),
      ]),
    ]);
  }

  function content(): (HTMLElement | null)[] {
    const spot = session.spot(index);
    const { m, d } = monthDay(session.puzzle.date);
    const header = h('header', { className: 'spot-bar' }, [
      button('←', () => {
        stopAuto();
        props.onBack();
      }, 'btn-icon'),
      h('span', { text: `${m}/${d} #${session.puzzle.number}` }),
      h('span', { className: 'progress', text: t('spot.progress', { i: index + 1, total: config.spotsPerDay }) }),
      settingsButton(),
    ]);
    const cur = steps[step] ?? steps[steps.length - 1]!;

    if (replaying) return [header, tableBlock(spot, cur), replayControls(spot)];

    const options = h(
      'div',
      { className: 'options' },
      spot.options.map((o) => {
        const b = button('', () => choose(o.id), 'btn btn-option');
        const sub = actionSub(o.id);
        b.append(h('span', { className: 'option-main', text: actionLabel(spot, o.id) }), sub ? h('span', { className: 'option-sub', text: sub }) : '');
        if (revealed) {
          b.disabled = true;
          if (o.id === revealed.chosen) b.classList.add('chosen');
        }
        return b;
      }),
    );
    return [
      header,
      tableBlock(spot, cur),
      h('div', { className: 'replay-again' }, [
        spot.facing ? h('p', { className: 'facing', text: t('spot.facing', { amount: chips(spot.facing.amountBB) }) }) : null,
        button(t('replay.again'), startReplay, 'link'),
      ]),
      revealed ? null : h('p', { className: 'your-turn', text: t('spot.yourTurn') }),
      options,
      revealed ? revealBlock(spot, revealed.chosen, revealed.grade, session.next() === null, next) : null,
      spot.history.length ? historyBlock(spot) : null,
    ];
  }

  return {
    render() {
      host = h('div', { className: 'page spot' }, content());
      if (replaying && !timer) auto();
      return h('div', {}, [host, footer()]);
    },
    dispose() {
      stopAuto();
    },
  };
}
