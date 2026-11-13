// シェア（設計書 8.5）。コピー、X の投稿画面、画像付きの Web Share。前作から流用

import { siteUrl } from '../data';

const X_INTENT = 'https://x.com/intent/post';
export const IMAGE_FILE_NAME = 'daily-poker.png';

/** 結果の文をクリップボードにコピーする。できなければ false */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(`${text}\n${siteUrl()}`);
    return true;
  } catch {
    return false;
  }
}

export function imageFile(blob: Blob): File {
  return new File([blob], IMAGE_FILE_NAME, { type: 'image/png' });
}

/** 画像つきで Web Share できる端末か */
export function canShareImage(blob: Blob | null): boolean {
  if (!blob || typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') return false;
  try {
    return navigator.canShare({ files: [imageFile(blob)] });
  } catch {
    return false;
  }
}

/** X の投稿画面を新しいタブで開く（画像は付かない） */
export function openXIntent(text: string): void {
  // 空白は + ではなく %20 にする（X の投稿画面で確実に空白として扱われるように）
  const q = `text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl())}`;
  window.open(`${X_INTENT}?${q}`, '_blank', 'noopener');
}

/** Web Share（画像＋文＋URL）。中止したときは false */
export async function shareWithImage(text: string, blob: Blob): Promise<boolean> {
  try {
    await navigator.share({ files: [imageFile(blob)], text: `${text}\n${siteUrl()}` });
    return true;
  } catch {
    return false;
  }
}
