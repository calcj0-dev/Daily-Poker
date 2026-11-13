// 計測（設計書 8.4）。ページの表示は Vercel Analytics、イベントは GA4。
// 失敗しても例外を出さない（広告ブロックなどで読み込めなくても遊べるように）。
// 送らないもの：個人を特定できる情報、選んだ行動そのもの

import { inject } from '@vercel/analytics';
import { getLocale } from './i18n';

export type StreakBucket = '1' | '2-6' | '7-29' | '30+';

export type AnalyticsEvent =
  | { name: 'start'; props: { puzzle: number; archive: boolean } }
  | { name: 'answer'; props: { puzzle: number; index: number; mark: 'g' | 'y' | 'r'; tag: 'flop' | 'turn' | 'river' } }
  | { name: 'finish'; props: { puzzle: number; greens: number; streak: StreakBucket; archive: boolean } }
  | { name: 'share_click'; props: { method: 'copy' | 'x_intent' | 'web_share' } }
  | { name: 'glossary_open'; props: { term: string } }
  | { name: 'archive_open'; props: Record<string, never> }
  | { name: 'stats_open'; props: Record<string, never> }
  | { name: 'lang_change'; props: { to: string } }
  | { name: 'portal_click'; props: { target: 'portal' | 'follow' } };

type Gtag = (...args: unknown[]) => void;
type GtagWindow = { dataLayer?: unknown[]; gtag?: Gtag };

/** GA4 の測定ID（環境変数 VITE_GA_ID）。空なら GA4 は読み込まない */
export function gaId(): string {
  return ((import.meta.env.VITE_GA_ID as string | undefined) ?? '').trim();
}

/** 起動時に1回呼ぶ */
export function initAnalytics(): void {
  try {
    if (import.meta.env.PROD) inject({ mode: 'production', framework: 'vanilla' });
  } catch {
    // 読み込めなくても遊べる
  }
  const id = gaId();
  if (!id) return;
  try {
    const w = window as unknown as GtagWindow;
    w.dataLayer = w.dataLayer ?? [];
    w.gtag = function gtag() {
      // gtag.js は arguments をそのまま受け取る決まり
      w.dataLayer!.push(arguments);
    };
    w.gtag('js', new Date());
    w.gtag('config', id);
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.append(s);
  } catch {
    // 読み込めなくても遊べる
  }
}

/** イベントを送る。全イベントに lang を付ける */
export function track<N extends AnalyticsEvent['name']>(name: N, props: Extract<AnalyticsEvent, { name: N }>['props']): void {
  try {
    const gtag = (window as unknown as GtagWindow).gtag;
    if (typeof gtag !== 'function') return;
    gtag('event', name, { ...props, lang: getLocale() });
  } catch {
    // 計測の失敗で遊びを止めない
  }
}

/** 連続日数の区分（設計書 8.4） */
export function streakBucket(n: number): StreakBucket {
  if (n <= 1) return '1';
  if (n <= 6) return '2-6';
  if (n <= 29) return '7-29';
  return '30+';
}
