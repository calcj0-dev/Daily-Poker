// 場面の案（spec）から、問題の1問（options・解説はまだ空）と、計算の設定（solver/spots）を作る（設計書 7.1 の手順1・2）。
// ポット・残りのチップ・流れの額は、ここで計算する（手で書くと食い違うため）。
// Node からそのまま読めるよう、import には拡張子を付ける

import type { HistoryItem, Position, Spot, Street } from '../../src/core/types.ts';

/** 1手：「hero check」「villain bet 33」（% はその時点のポットに対する割合）「hero call」「villain raise 3」（x 倍） */
export type LineStep = string;

export type SpotSpec = {
  /** 場面の種類（レンジのファイル名の前半） */
  type: 'srp_btn_bb' | 'srp_co_bb' | 'srp_sb_bb' | '3bp_bb_btn';
  /** あなたの席 */
  hero: Position;
  cards: [string, string];
  /** 出題する時点の場のカード */
  board: string[];
  /** 場にカードが出た後の流れ。最後が相手のベットなら、それが「相手が賭けてきた」場面になる */
  flop?: LineStep[];
  turn?: LineStep[];
  river?: LineStep[];
  /** 段階以外のタグ（bluffcatch・bluff・value・betsize・check・3betpot） */
  tags: string[];
  /** 解説の用語（あとで足してもよい） */
  terms?: string[];
  /** 出題する段階で相手のレイズを入れるときの額（x 倍）。省略は 3 */
  raiseX?: number;
};

type Preflop = { oop: Position; ip: Position; history: (pos: { hero: Position }) => HistoryItem[]; pot: number; stack: number };

const PREFLOP: Record<SpotSpec['type'], Preflop> = {
  srp_btn_bb: {
    oop: 'BB',
    ip: 'BTN',
    pot: 5.5,
    stack: 97.5,
    history: ({ hero }) => [
      { street: 'preflop', actor: hero === 'BTN' ? 'hero' : 'villain', action: 'raise', amountBB: 2.5 },
      { street: 'preflop', actor: hero === 'BB' ? 'hero' : 'villain', action: 'call' },
    ],
  },
  srp_co_bb: {
    oop: 'BB',
    ip: 'CO',
    pot: 5.5,
    stack: 97.5,
    history: ({ hero }) => [
      { street: 'preflop', actor: hero === 'CO' ? 'hero' : 'villain', action: 'raise', amountBB: 2.5 },
      { street: 'preflop', actor: hero === 'BB' ? 'hero' : 'villain', action: 'call' },
    ],
  },
  srp_sb_bb: {
    oop: 'SB',
    ip: 'BB',
    pot: 5,
    stack: 97.5,
    history: ({ hero }) => [
      { street: 'preflop', actor: hero === 'SB' ? 'hero' : 'villain', action: 'raise', amountBB: 2.5 },
      { street: 'preflop', actor: hero === 'BB' ? 'hero' : 'villain', action: 'call' },
    ],
  },
  '3bp_bb_btn': {
    oop: 'BB',
    ip: 'BTN',
    pot: 21.5,
    stack: 89.5,
    history: ({ hero }) => [
      { street: 'preflop', actor: hero === 'BTN' ? 'hero' : 'villain', action: 'raise', amountBB: 2.5 },
      { street: 'preflop', actor: hero === 'BB' ? 'hero' : 'villain', action: 'raise', amountBB: 10.5 },
      { street: 'preflop', actor: hero === 'BTN' ? 'hero' : 'villain', action: 'call' },
    ],
  },
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export type BuiltSpot = { spot: Spot; solver: Record<string, unknown> };

export function buildSpot(spec: SpotSpec, id: string, index: number): BuiltSpot {
  const pre = PREFLOP[spec.type];
  if (spec.hero !== pre.oop && spec.hero !== pre.ip) throw new Error(`${id}: hero は ${pre.oop} か ${pre.ip}`);
  const villain = spec.hero === pre.oop ? pre.ip : pre.oop;
  const heroPlayer = spec.hero === pre.oop ? 'oop' : 'ip';
  const street: Street = spec.board.length === 3 ? 'flop' : spec.board.length === 4 ? 'turn' : 'river';

  const history: HistoryItem[] = pre.history({ hero: spec.hero });
  const decisionPath: string[] = [];
  /** 計算に入れる賭け額（段階・席ごと） */
  const used: Record<Street, { oop: Set<string>; ip: Set<string> }> = {
    flop: { oop: new Set(), ip: new Set() },
    turn: { oop: new Set(), ip: new Set() },
    river: { oop: new Set(), ip: new Set() },
  };
  let pot = pre.pot;
  let stack = pre.stack;
  let facing: Spot['facing'] = null;

  const streets: Street[] = ['flop', 'turn', 'river'];
  const lines = { flop: spec.flop ?? [], turn: spec.turn ?? [], river: spec.river ?? [] };
  for (const st of streets) {
    if (streets.indexOf(st) > streets.indexOf(street)) {
      if (lines[st].length) throw new Error(`${id}: ${st} の流れがありますが、場のカードが ${spec.board.length} 枚です`);
      continue;
    }
    let bet = 0;
    const steps = lines[st];
    steps.forEach((raw, k) => {
      const [who, action, arg] = raw.split(/\s+/) as ['hero' | 'villain', string, string | undefined];
      const player = (who === 'hero') === (heroPlayer === 'oop') ? 'oop' : 'ip';
      const isLastOnDecision = st === street && k === steps.length - 1;
      if (action === 'check') {
        history.push({ street: st, actor: who, action: 'check' });
        decisionPath.push('Check');
      } else if (action === 'bet') {
        const pct = Number(arg);
        const amount = round1((pot * pct) / 100);
        used[st][player].add(`${pct}%`);
        if (isLastOnDecision && who === 'villain') {
          facing = { action: 'bet', amountBB: amount };
        } else {
          history.push({ street: st, actor: who, action: 'bet', amountBB: amount });
        }
        decisionPath.push(`Bet(${amount})`);
        bet = amount;
      } else if (action === 'call') {
        history.push({ street: st, actor: who, action: 'call' });
        decisionPath.push('Call');
        pot = round1(pot + 2 * bet);
        stack = round1(stack - bet);
        bet = 0;
      } else {
        throw new Error(`${id}: 読めない行動 ${raw}（check／bet %／call）`);
      }
    });
    if (bet && !(st === street && facing)) throw new Error(`${id}: ${st} でベットに答えないまま次へ進んでいます`);
  }

  const options = facing ? ['fold', 'call', 'raise'] : ['check', 'bet33', 'bet67', 'allin'];
  const heroSizes = facing ? { bet: '', raise: `${spec.raiseX ?? 3}x` } : { bet: '33%,67%,a', raise: '3x' };
  const later = { bet: '67%', raise: 'a' };
  const betSizes: Record<string, { oop: { bet: string; raise: string }; ip: { bet: string; raise: string } }> = {};
  for (const st of streets) {
    const idx = streets.indexOf(st);
    const decIdx = streets.indexOf(street);
    if (idx > decIdx) {
      betSizes[st] = { oop: later, ip: later };
      continue;
    }
    const sizes = (p: 'oop' | 'ip') => {
      const list = [...used[st][p]];
      if (idx === decIdx && p === heroPlayer) return heroSizes;
      // 出題する段階の相手：賭けた額＋ 67%（なければ 33%,67%）。それより前の段階：流れの額だけ（なければ 67%）
      if (idx === decIdx) return { bet: list.length ? [...new Set([...list, '67%'])].join(',') : '33%,67%', raise: '3x' };
      return { bet: list.length ? list.join(',') : '67%', raise: '3x' };
    };
    betSizes[st] = { oop: sizes('oop'), ip: sizes('ip') };
  }

  const spot: Spot = {
    id,
    index,
    tags: [street, ...spec.tags],
    spotType: spec.type,
    hero: { position: spec.hero, cards: spec.cards },
    villain: { position: villain },
    board: spec.board,
    street,
    potBB: pot,
    effectiveStackBB: stack,
    history,
    facing,
    options: options.map((o) => ({ id: o, freq: 0, evBB: 0 })),
    explanation: { ja: '', en: '', 'zh-Hant': '' },
    terms: spec.terms ?? [],
  };
  const solver = {
    id,
    situation: spec.type,
    oopRange: `ranges/${spec.type}_oop.json`,
    ipRange: `ranges/${spec.type}_ip.json`,
    startingPotBB: pre.pot,
    effectiveStackBB: pre.stack,
    board: spec.board,
    startStreet: 'flop',
    betSizes,
    hero: { player: heroPlayer, cards: spec.cards },
    decisionPath,
    accuracy: { targetExploitabilityPctPot: 0.3, maxIterations: 1000 },
    options,
  };
  return { spot, solver };
}
