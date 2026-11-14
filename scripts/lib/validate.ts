// 問題・設定・文言の検査（設計書 4.3）。
// ビルドの前（scripts/validate-puzzles.ts）とテストで動く。
// Node からそのまま読めるよう、ここでは型だけを import し、データは引数で受け取る

import { replayMismatch } from './replayCheck.ts';
import type { DailyPuzzle, Spot } from '../../src/core/types';

type Tree = { [key: string]: string | Tree };

export type ValidationContext = {
  config: {
    spotsPerDay: number;
    actions: Record<string, { kind: string }>;
    defaultOptions: Record<string, string[]>;
    languages: { available: string[]; labels: Record<string, string> };
  };
  glossary: { terms: Record<string, Record<string, { term: string; short: string } | undefined>> };
  messages: Record<string, Tree>;
};

export type PuzzleFile = { fileName: string; data: unknown };

const STREETS = ['flop', 'turn', 'river'] as const;
const BOARD_SIZE: Record<string, number> = { flop: 3, turn: 4, river: 5 };
const CARD = /^[2-9TJQKA][shdc]$/;
const FACING_KINDS = ['fold', 'call', 'raise'];
const FIRST_KINDS = ['check', 'bet', 'allin'];
const SOLVER_FIELDS = [
  'tool',
  'commit',
  'rangesVersion',
  'oopRange',
  'ipRange',
  'startStreet',
  'betSizes',
  'targetExploitabilityPctPot',
  'exploitabilityPctPot',
  'solvedAt',
  'spotFile',
] as const;

function leafKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [prefix + k] : leafKeys(v, `${prefix}${k}.`)));
}

function subKeys(tree: Tree | undefined, key: string): string[] {
  const node = tree?.[key];
  return typeof node === 'object' && node !== null ? Object.keys(node) : [];
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** config・glossary・3言語の i18n がそろっているか */
export function validateStatic(ctx: ValidationContext): string[] {
  const errors: string[] = [];
  const langs = ctx.config.languages.available;
  const [base, ...rest] = langs;
  if (!base) return ['config.languages.available が空です'];

  for (const l of langs) {
    if (!ctx.messages[l]) errors.push(`i18n/${l}.json がありません`);
    if (!ctx.config.languages.labels[l]) errors.push(`config.languages.labels に ${l} がありません`);
  }
  const baseKeys = new Set(leafKeys(ctx.messages[base] ?? {}));
  for (const l of rest) {
    const keys = new Set(leafKeys(ctx.messages[l] ?? {}));
    for (const k of baseKeys) if (!keys.has(k)) errors.push(`i18n/${l}.json に ${k} がありません`);
    for (const k of keys) if (!baseKeys.has(k)) errors.push(`i18n/${base}.json に ${k} がありません（${l} にだけある）`);
  }
  for (const l of langs) {
    for (const k of leafKeys(ctx.messages[l] ?? {})) {
      const v = k.split('.').reduce<unknown>((n, p) => (n as Tree | undefined)?.[p], ctx.messages[l]);
      if (typeof v === 'string' && !/\S/.test(v)) errors.push(`i18n/${l}.json の ${k} が空です`);
    }
  }

  for (const [id, entry] of Object.entries(ctx.glossary.terms)) {
    for (const l of langs) {
      const e = entry[l];
      if (!e || !/\S/.test(e.term ?? '') || !/\S/.test(e.short ?? '')) errors.push(`glossary の ${id} に ${l} の term・short がありません`);
    }
  }

  for (const [group, ids] of Object.entries(ctx.config.defaultOptions)) {
    for (const id of ids) if (!ctx.config.actions[id]) errors.push(`config.defaultOptions.${group} の ${id} が config.actions にありません`);
  }
  for (const l of langs) {
    const labels = subKeys(ctx.messages[l], 'actionLabels');
    for (const id of Object.keys(ctx.config.actions)) {
      if (!labels.includes(id)) errors.push(`i18n/${l}.json の actionLabels に ${id} がありません`);
    }
  }
  return errors;
}

export type PuzzleCheckOptions = {
  /** 公開用。sample: true を通さず、計算の記録も必ず調べる */
  release: boolean;
};

/** 1日分のファイルを調べる */
export function validatePuzzle(file: PuzzleFile, ctx: ValidationContext, opts: PuzzleCheckOptions): string[] {
  const errors: string[] = [];
  const at = (msg: string) => errors.push(`${file.fileName}: ${msg}`);
  const p = file.data as Partial<DailyPuzzle> | null;
  if (typeof p !== 'object' || p === null) return [`${file.fileName}: JSON の形が違います`];

  const m = /^(\d{4}-\d{2}-\d{2})(\.sample)?\.json$/.exec(file.fileName);
  if (!m) at('ファイル名は YYYY-MM-DD.json にしてください');
  if (typeof p.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) at('date は YYYY-MM-DD');
  else if (m && m[1] !== p.date) at(`date（${p.date}）とファイル名が違います`);
  if (!Number.isInteger(p.number) || (p.number ?? 0) < 1) at('number は1以上の整数');
  if (p.sample === true && opts.release) at('見本（sample: true）は公開できません');

  const spots = Array.isArray(p.spots) ? p.spots : [];
  if (spots.length !== ctx.config.spotsPerDay) at(`問題の数が ${spots.length} です（${ctx.config.spotsPerDay} 問にしてください）`);
  const checkSolver = opts.release || p.sample !== true;
  spots.forEach((s, i) => {
    for (const e of validateSpot(s, i + 1, p.date ?? '', ctx, checkSolver)) at(e);
  });
  return errors;
}

function validateSpot(s: Spot, expectedIndex: number, date: string, ctx: ValidationContext, checkSolver: boolean): string[] {
  const errors: string[] = [];
  const name = `${typeof s?.id === 'string' ? s.id : `${expectedIndex}問目`}`;
  const at = (msg: string) => errors.push(`${name}: ${msg}`);
  if (typeof s !== 'object' || s === null) return [`${expectedIndex}問目: 形が違います`];
  const langs = ctx.config.languages.available;
  const base = ctx.messages[langs[0] ?? 'ja'];

  if (s.index !== expectedIndex) at(`index は ${expectedIndex} にしてください`);
  if (s.id !== `${date}-${expectedIndex}`) at(`id は ${date}-${expectedIndex} にしてください`);

  // 段階とタグ
  if (!(STREETS as readonly string[]).includes(s.street)) at('street は flop／turn／river');
  const tags = Array.isArray(s.tags) ? s.tags : [];
  const streetTags = tags.filter((t) => (STREETS as readonly string[]).includes(t));
  if (streetTags.length !== 1) at('tags に flop／turn／river のどれか1つを入れてください');
  else if (streetTags[0] !== s.street) at(`tags の ${streetTags[0]} と street（${s.street}）が違います`);
  const tagNames = subKeys(base, 'tags');
  for (const t of tags) if (!tagNames.includes(t)) at(`tag ${t} が i18n の tags にありません`);
  if (typeof s.spotType !== 'string' || !s.spotType) at('spotType がありません');

  // 席
  const positions = subKeys(base, 'positions');
  if (!positions.includes(s.hero?.position)) at('hero.position が正しくありません');
  if (!positions.includes(s.villain?.position)) at('villain.position が正しくありません');
  if (s.hero?.position === s.villain?.position) at('hero と villain が同じ席です');

  // カード
  const cards = [...(Array.isArray(s.hero?.cards) ? s.hero.cards : []), ...(Array.isArray(s.board) ? s.board : [])];
  if (!Array.isArray(s.hero?.cards) || s.hero.cards.length !== 2) at('手札は2枚');
  for (const c of cards) if (typeof c !== 'string' || !CARD.test(c)) at(`カード ${String(c)} の書き方が違います（例 Ah・Td）`);
  const dup = cards.filter((c, i) => cards.indexOf(c) !== i);
  if (dup.length) at(`同じカードがあります：${[...new Set(dup)].join(' ')}`);
  if (Array.isArray(s.board) && BOARD_SIZE[s.street] !== undefined && s.board.length !== BOARD_SIZE[s.street]) {
    at(`場のカードの枚数（${s.board.length}）が ${s.street} と合いません`);
  }

  // チップ
  if (!isNum(s.potBB) || s.potBB <= 0) at('potBB は正の数');
  if (!isNum(s.effectiveStackBB) || s.effectiveStackBB < 0) at('effectiveStackBB は0以上の数');
  if (s.facing !== null) {
    if (s.facing?.action !== 'bet' || !isNum(s.facing?.amountBB) || s.facing.amountBB <= 0) at('facing は null か { action: "bet", amountBB }');
  }

  // ここまでの流れ
  const historyActions = subKeys(base, 'historyActions');
  for (const h of Array.isArray(s.history) ? s.history : []) {
    if (!['preflop', ...STREETS].includes(h.street)) at(`history の street ${String(h.street)} が正しくありません`);
    if (h.actor !== 'hero' && h.actor !== 'villain') at('history の actor は hero か villain');
    if (!historyActions.includes(h.action)) at(`history の action ${String(h.action)} が i18n の historyActions にありません`);
    if ((h.action === 'raise' || h.action === 'bet') && !isNum(h.amountBB)) at(`history の ${h.action} に amountBB がありません`);
  }
  if (!Array.isArray(s.history)) at('history がありません');

  // 流れとポット・残りのチップ・場のカードのつじつま（ハンドの再生と同じ計算）
  if (Array.isArray(s.history) && Array.isArray(s.board) && isNum(s.potBB) && isNum(s.effectiveStackBB)) {
    try {
      for (const e of replayMismatch(s)) at(e);
    } catch (e) {
      at(`流れを再生できません：${(e as Error).message}`);
    }
  }

  // 選択肢
  const options = Array.isArray(s.options) ? s.options : [];
  if (options.length < 2) at('選択肢は2つ以上');
  const ids = options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) at('選択肢の id が重なっています');
  const allowed = s.facing ? FACING_KINDS : FIRST_KINDS;
  let sum = 0;
  for (const o of options) {
    const action = ctx.config.actions[o.id];
    if (!action) {
      at(`選択肢 ${o.id} が config.actions にありません`);
      continue;
    }
    if (!allowed.includes(action.kind)) {
      at(`選択肢 ${o.id} は${s.facing ? '相手がベットした場面' : '先に動く場面'}では使えません`);
    }
    if (!isNum(o.freq) || o.freq < 0 || o.freq > 1) at(`選択肢 ${o.id} の freq は0〜1`);
    else sum += o.freq;
    if (!isNum(o.evBB)) at(`選択肢 ${o.id} の evBB が数ではありません`);
    if (action.kind === 'raise' && (!isNum(o.sizeBB) || o.sizeBB <= 0)) at(`選択肢 ${o.id} に sizeBB（レイズの額）がありません`);
  }
  if (options.length && (sum < 0.99 || sum > 1.01)) at(`freq の合計が ${sum.toFixed(3)} です（0.99〜1.01）`);

  // 解説と用語
  for (const l of langs) {
    const text = (s.explanation as Record<string, unknown> | undefined)?.[l];
    if (typeof text !== 'string' || !/\S/.test(text)) at(`explanation に ${l} がありません`);
  }
  for (const t of Array.isArray(s.terms) ? s.terms : []) if (!ctx.glossary.terms[t]) at(`用語 ${t} が glossary にありません`);

  // 計算の記録
  if (checkSolver) {
    const rec = s.solver as Record<string, unknown> | undefined;
    if (!rec) at('solver（計算の記録）がありません');
    else {
      for (const f of SOLVER_FIELDS) if (rec[f] === undefined || rec[f] === null || rec[f] === '') at(`solver.${f} がありません`);
      const target = rec.targetExploitabilityPctPot;
      const got = rec.exploitabilityPctPot;
      if (isNum(target) && isNum(got) && got > target) at(`精度 ${got}% が目標 ${target}% に届いていません`);
    }
  }
  return errors;
}

/** すべての日のファイルをまとめて調べる（id の重なり・number の並び） */
export function validateAll(files: PuzzleFile[], ctx: ValidationContext, opts: PuzzleCheckOptions): string[] {
  const errors = validateStatic(ctx);
  for (const f of files) errors.push(...validatePuzzle(f, ctx, opts));

  const puzzles = files
    .map((f) => ({ fileName: f.fileName, p: f.data as Partial<DailyPuzzle> }))
    .filter(({ p }) => typeof p?.date === 'string')
    .sort((a, b) => (a.p.date! < b.p.date! ? -1 : 1));

  const seen = new Map<string, string>();
  for (const { fileName, p } of puzzles) {
    for (const s of Array.isArray(p.spots) ? p.spots : []) {
      const prev = seen.get(s?.id);
      if (prev) errors.push(`${fileName}: id ${s.id} が ${prev} と重なっています`);
      else if (typeof s?.id === 'string') seen.set(s.id, fileName);
    }
  }
  // 見本は番号の並びに数えない
  const real = puzzles.filter(({ p }) => p.sample !== true);
  real.forEach(({ fileName, p }, i) => {
    const first = real[0]?.p.number ?? 1;
    if (p.number !== first + i) errors.push(`${fileName}: number は ${first + i} にしてください（日付の順に1ずつ増やす）`);
  });
  if (real[0] && real[0].p.number !== 1 && opts.release) {
    errors.push(`${real[0].fileName}: 最初の日の number は 1 にしてください`);
  }
  return errors;
}
