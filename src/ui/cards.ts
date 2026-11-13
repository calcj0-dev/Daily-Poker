// カードを文字と記号で描く（設計書 2章。画像なし）。マークは4色【案】

import { h } from './dom';

const SUITS: Record<string, { symbol: string; name: string }> = {
  s: { symbol: '♠', name: 'spade' },
  h: { symbol: '♥', name: 'heart' },
  d: { symbol: '♦', name: 'diamond' },
  c: { symbol: '♣', name: 'club' },
};

/** "Ah" → { rank: "A", suit: ♥ } */
export function cardParts(card: string): { rank: string; symbol: string; suit: string } {
  const rank = card[0] === 'T' ? '10' : (card[0] ?? '?');
  const s = SUITS[card[1] ?? ''] ?? { symbol: '?', name: 'unknown' };
  return { rank, symbol: s.symbol, suit: s.name };
}

export function cardEl(card: string, size: 'md' | 'lg' = 'md'): HTMLElement {
  const p = cardParts(card);
  return h('span', { className: `card card-${size} suit-${p.suit}`, attrs: { 'aria-label': `${p.rank}${p.symbol}` } }, [
    h('span', { className: 'card-rank', text: p.rank }),
    h('span', { className: 'card-suit', text: p.symbol }),
  ]);
}

export function cardRow(cards: string[], size: 'md' | 'lg' = 'md'): HTMLElement {
  return h('span', { className: 'cards' }, cards.map((c) => cardEl(c, size)));
}
