// レンジ（持っていそうな手の一覧）の読み取りと数え上げ（設計書 7.2）。
// 書き方は postflop-solver と同じ：AA, AKs, AKo, AK, 22+, A2s+, K9o+, 99-22, A5s-A2s, 各項目に :0.5 で重み。
// 範囲（-）は postflop-solver に合わせて、強い方を先に書く

export const RANKS = '23456789TJQKA';

/** 手の種類（169種類）："AA"・"AKs"・"AKo" */
export type HandClass = string;

function rankIndex(r: string): number {
  const i = RANKS.indexOf(r);
  if (i < 0) throw new Error(`カードの数字が違います：${r}`);
  return i;
}

/** 手の種類の組み合わせの数（ペア6・スーテッド4・オフスート12） */
export function combos(hand: HandClass): number {
  if (hand.length === 2) return 6;
  return hand[2] === 's' ? 4 : 12;
}

function pair(i: number): HandClass {
  return `${RANKS[i]}${RANKS[i]}`;
}

function nonPair(hi: number, lo: number, suit: 's' | 'o'): HandClass {
  return `${RANKS[hi]}${RANKS[lo]}${suit}`;
}

/** 1つの項目（重みなし）を手の種類の一覧に */
export function expandToken(token: string): HandClass[] {
  const t = token.trim();
  // 22-99
  let m = /^([2-9TJQKA])\1-([2-9TJQKA])\2$/.exec(t);
  if (m) {
    if (rankIndex(m[1]!) < rankIndex(m[2]!)) throw new Error(`範囲は強い方を先に書いてください：${t}`);
    const [a, b] = [rankIndex(m[1]!), rankIndex(m[2]!)].sort((x, y) => x - y);
    return Array.from({ length: b! - a! + 1 }, (_, k) => pair(a! + k));
  }
  // 22+
  m = /^([2-9TJQKA])\1\+$/.exec(t);
  if (m) {
    const a = rankIndex(m[1]!);
    return Array.from({ length: RANKS.length - a }, (_, k) => pair(a + k));
  }
  // AA
  m = /^([2-9TJQKA])\1$/.exec(t);
  if (m) return [pair(rankIndex(m[1]!))];
  // A5s-A2s
  m = /^([2-9TJQKA])([2-9TJQKA])([so])-([2-9TJQKA])([2-9TJQKA])([so])$/.exec(t);
  if (m) {
    if (m[1] !== m[4] || m[3] !== m[6]) throw new Error(`範囲の書き方が違います：${t}`);
    if (rankIndex(m[2]!) < rankIndex(m[5]!)) throw new Error(`範囲は強い方を先に書いてください：${t}`);
    const hi = rankIndex(m[1]!);
    const [a, b] = [rankIndex(m[2]!), rankIndex(m[5]!)].sort((x, y) => x - y);
    if (b! >= hi) throw new Error(`範囲の書き方が違います：${t}`);
    return Array.from({ length: b! - a! + 1 }, (_, k) => nonPair(hi, a! + k, m![3] as 's' | 'o'));
  }
  // A2s+（下のカードを、上のカードの1つ下まで上げる）
  m = /^([2-9TJQKA])([2-9TJQKA])([so])?\+$/.exec(t);
  if (m) {
    const hi = rankIndex(m[1]!);
    const lo = rankIndex(m[2]!);
    if (lo >= hi) throw new Error(`範囲の書き方が違います：${t}`);
    const suits = m[3] ? [m[3] as 's' | 'o'] : (['s', 'o'] as const);
    return suits.flatMap((s) => Array.from({ length: hi - lo }, (_, k) => nonPair(hi, lo + k, s)));
  }
  // AKs・AKo・AK
  m = /^([2-9TJQKA])([2-9TJQKA])([so])?$/.exec(t);
  if (m) {
    const hi = rankIndex(m[1]!);
    const lo = rankIndex(m[2]!);
    if (lo >= hi) throw new Error(`上のカードを先に書いてください：${t}`);
    return m[3] ? [nonPair(hi, lo, m[3] as 's' | 'o')] : [nonPair(hi, lo, 's'), nonPair(hi, lo, 'o')];
  }
  throw new Error(`読めない項目です：${t}`);
}

/** レンジの文字列を、手の種類→重み（0〜1）に。同じ手が2回出てきたらエラー */
export function parseRange(range: string): Map<HandClass, number> {
  const out = new Map<HandClass, number>();
  for (const raw of range.split(',')) {
    if (!raw.trim()) continue;
    const [body, w] = raw.split(':');
    const weight = w === undefined ? 1 : Number(w);
    if (!(weight > 0 && weight <= 1)) throw new Error(`重みは0より大きく1以下：${raw}`);
    for (const hand of expandToken(body!)) {
      if (out.has(hand)) throw new Error(`同じ手が2回あります：${hand}（${raw.trim()}）`);
      out.set(hand, weight);
    }
  }
  return out;
}

/** 全1326通りのうち、何%の手を持っているか */
export function rangePercent(range: Map<HandClass, number>): number {
  let n = 0;
  for (const [hand, w] of range) n += combos(hand) * w;
  return (n / 1326) * 100;
}

/** 2つのレンジで重なっている手（例：コールと3ベットの両方に入れてしまった手） */
export function overlap(a: Map<HandClass, number>, b: Map<HandClass, number>): HandClass[] {
  return [...a.keys()].filter((h) => b.has(h));
}
