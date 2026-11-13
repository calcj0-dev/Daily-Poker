// 問題のデータの型（設計書 4.2）

export type Street = 'flop' | 'turn' | 'river';
export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type ExplanationLocale = 'ja' | 'en' | 'zh-Hant';

export type HistoryItem = {
  street: 'preflop' | Street;
  actor: 'hero' | 'villain';
  action: 'raise' | 'call' | 'check' | 'bet' | 'fold';
  amountBB?: number;
};

export type SpotOption = {
  /** config.actions のどれか */
  id: string;
  /** お手本の割合（0〜1） */
  freq: number;
  /** その行動の平均の得（BB） */
  evBB: number;
  /** レイズ・ベットの実際の額 */
  sizeBB?: number;
};

export type GradingOverride = Partial<{
  greenMaxLossPctPot: number;
  yellowMaxLossPctPot: number;
  yellowMinSolverFreq: number;
}>;

/** 計算の記録。アプリでは使わない（公開時に外す） */
export type SolverRecord = {
  tool: string;
  commit: string;
  rangesVersion: string;
  oopRange: string;
  ipRange: string;
  startStreet: Street;
  betSizes: unknown;
  targetExploitabilityPctPot: number;
  exploitabilityPctPot: number | null;
  solvedAt: string | null;
  spotFile: string;
};

export type Spot = {
  id: string;
  index: number;
  tags: string[];
  spotType: string;
  hero: { position: Position; cards: [string, string] };
  villain: { position: Position };
  board: string[];
  street: Street;
  potBB: number;
  effectiveStackBB: number;
  history: HistoryItem[];
  facing: { action: 'bet'; amountBB: number } | null;
  options: SpotOption[];
  explanation: Record<ExplanationLocale, string>;
  terms: string[];
  grading?: GradingOverride;
  solver?: SolverRecord;
};

export type DailyPuzzle = {
  date: string;
  number: number;
  sample?: boolean;
  note?: string;
  spots: Spot[];
};
