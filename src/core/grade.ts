// 1問の採点（設計書 3.1・決定 #3）

import { config } from '../data';
import type { Mark } from '../storage';
import type { Spot } from './types';

/** 境目ちょうどを確実に含めるための小さな余裕（小数の計算の誤差よけ） */
const EPS = 1e-9;

export type Grade = {
  mark: Mark;
  /** 選んだ行動の損（BB） */
  loss: number;
  /** 損がポットの何%か */
  lossPct: number;
  /** お手本がその行動を選ぶ割合（0〜1） */
  freq: number;
};

/** あなたが行動する直前に、場にあるチップの合計 */
export function basePot(spot: Pick<Spot, 'potBB' | 'facing'>): number {
  return spot.potBB + (spot.facing?.amountBB ?? 0);
}

export function grade(spot: Pick<Spot, 'potBB' | 'facing' | 'options' | 'grading'>, optionId: string): Grade {
  const chosen = spot.options.find((o) => o.id === optionId);
  if (!chosen) throw new Error(`unknown option: ${optionId}`);
  const th = { ...config.grading, ...spot.grading };
  const best = Math.max(...spot.options.map((o) => o.evBB));
  const loss = Math.max(0, best - chosen.evBB);
  const lossPct = (loss / basePot(spot)) * 100;

  let mark: Mark;
  if (lossPct <= th.greenMaxLossPctPot + EPS) mark = 'g';
  else if (lossPct <= th.yellowMaxLossPctPot + EPS || chosen.freq >= th.yellowMinSolverFreq - EPS) mark = 'y';
  else mark = 'r';
  return { mark, loss, lossPct, freq: chosen.freq };
}

/** 画面の「お手本との差」。loss < 0.05BB なら「ほぼなし」 */
export function lossDisplay(g: Pick<Grade, 'loss' | 'lossPct'>): { nearZero: boolean; loss: string; pct: string } {
  return {
    nearZero: g.loss < 0.05,
    loss: g.loss.toFixed(1),
    pct: String(Math.round(g.lossPct)),
  };
}
