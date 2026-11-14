// 再生の最後と、問題のデータのつじつま（問題の検査で使う。アプリには入らない）。
// Node からそのまま読めるよう、import には拡張子を付ける

import { buildReplay, round } from '../../src/core/replay.ts';
import type { Spot } from '../../src/core/types.ts';

/**
 * 再生の最後と、問題のデータのつじつま（問題の検査で使う）。
 * 最後の場面のポット（相手の今回のベットを除く）が potBB と、あなたの残りが effectiveStackBB と合うか
 */
export function replayMismatch(spot: Pick<Spot, 'history' | 'hero' | 'villain' | 'facing' | 'street' | 'potBB' | 'effectiveStackBB' | 'board'>): string[] {
  const steps = buildReplay(spot);
  const last = steps[steps.length - 1]!;
  const errors: string[] = [];
  const villainBet = spot.facing ? (last.bets[spot.villain.position] ?? 0) : 0;
  const pot = round(last.potBB + Object.values(last.bets).reduce<number>((a, v) => a + (v ?? 0), 0) - villainBet);
  if (Math.abs(pot - spot.potBB) > 0.051) errors.push(`流れから計算したポット ${pot} と potBB ${spot.potBB} が違います`);
  const heroStack = last.stacks[spot.hero.position];
  if (Math.abs(heroStack - spot.effectiveStackBB) > 0.051) {
    errors.push(`流れから計算したあなたの残り ${heroStack} と effectiveStackBB ${spot.effectiveStackBB} が違います`);
  }
  if (last.boardCount !== spot.board.length) errors.push(`流れの最後の場のカード ${last.boardCount} 枚と board ${spot.board.length} 枚が違います`);
  return errors;
}
