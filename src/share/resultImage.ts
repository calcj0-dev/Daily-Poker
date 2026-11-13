// 結果画像 1200×630（設計書 8.5）。作品名・日付と番号・5つのマス・🟩の数・連続日数・URL。
// 手札や答えは描かない。画面に出さない Canvas に描いて PNG にする

import { greenCount } from '../core/share';
import { monthDay } from '../core/date';
import { siteUrl } from '../data';
import { t } from '../i18n';
import type { Mark } from '../storage';

const W = 1200;
const H = 630;
const FONT = 'system-ui, "Hiragino Sans", "Noto Sans JP", "Noto Sans TC", "PingFang TC", sans-serif';
const TEXT = '#1a1f2b';
const SUB = '#5f6779';
const FELT = '#eef5f1';
const PRIMARY = '#1d6b4f';
const MARK_COLOR: Record<Mark, string> = { g: '#2e9d5b', y: '#d9a21b', r: '#d0343c' };
const EMPTY = '#e3e7ed';

export type ResultImageInput = { number: number; date: string; marks: (Mark | null)[]; streak: number | null };

function centered(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, weight: number, color: string): void {
  let s = size;
  for (; s > 18; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= W - 160) break;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, y);
}

/** 「🟩 4つ」の絵文字を、描いた四角に置き換えるための文（先頭の絵文字を外す） */
function withoutLeadingEmoji(text: string): string {
  return text.replace(/^\p{Extended_Pictographic}\s*/u, '');
}

export async function renderResultImage(input: ResultImageInput): Promise<Blob | null> {
  try {
    await document.fonts?.ready;
  } catch {
    // フォントの読み込みを待てなくても描く
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = FELT;
  ctx.beginPath();
  ctx.roundRect(32, 32, W - 64, H - 64, 28);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const { m, d } = monthDay(input.date);
  centered(ctx, t('app.name'), 128, 64, 800, TEXT);
  centered(ctx, `${t('result.heading', { m, d })}  #${input.number}`, 186, 34, 600, SUB);

  // 5つのマス
  const size = 112;
  const gap = 24;
  const total = input.marks.length * size + (input.marks.length - 1) * gap;
  let x = (W - total) / 2;
  for (const mark of input.marks) {
    ctx.fillStyle = mark ? MARK_COLOR[mark] : EMPTY;
    ctx.beginPath();
    ctx.roundRect(x, 232, size, size, 20);
    ctx.fill();
    x += size + gap;
  }

  // 🟩の数（絵文字は端末で見た目が変わるので、緑の四角を描く）
  const greens = withoutLeadingEmoji(t('result.greens', { g: greenCount(input.marks) }));
  ctx.font = `700 44px ${FONT}`;
  const tw = ctx.measureText(greens).width;
  const box = 40;
  const startX = W / 2 - (tw + box + 16) / 2;
  ctx.fillStyle = MARK_COLOR.g;
  ctx.beginPath();
  ctx.roundRect(startX, 400, box, box, 8);
  ctx.fill();
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'left';
  ctx.fillText(greens, startX + box + 16, 437);
  ctx.textAlign = 'center';

  if (input.streak !== null) centered(ctx, t('result.streak', { n: input.streak }), 506, 36, 600, PRIMARY);

  const url = siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
  centered(ctx, url, 568, 26, 500, SUB);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
