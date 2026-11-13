// JSON のデータを読み込み、型を付けて渡す窓口。
// 細かい型と検査は #2（scripts/validate-puzzles.ts）で足す

import configJson from './data/config.json';
import glossaryJson from './data/glossary.json';
import enJson from './data/i18n/en.json';
import jaJson from './data/i18n/ja.json';
import zhHantJson from './data/i18n/zh-Hant.json';

export type Locale = 'ja' | 'en' | 'zh-Hant';

/** 文言の JSON。入れ子のオブジェクトで、葉は文字列 */
export type MessageTree = { [key: string]: string | MessageTree };

export type AppConfig = {
  version: number;
  timezone: string;
  spotsPerDay: number;
  launchDate: string | null;
  grading: { greenMaxLossPctPot: number; yellowMaxLossPctPot: number; yellowMinSolverFreq: number };
  table: { players: number; stackBB: number; rake: number; headsUpOnly: boolean; streets: string[] };
  defaultOptions: { firstToAct: string[]; facingBet: string[] };
  actions: Record<string, { kind: string; potFraction?: number }>;
  storageKey: string;
  links: { portal: string; follow: string; googlePrivacy: string; gaOptout: string; vercelPrivacy: string };
  languages: {
    default: Locale;
    available: Locale[];
    labels: Record<Locale, string>;
    machineTranslated: Locale[];
  };
};

type GlossaryEntry = { term: string; short: string };
export type Glossary = { version: number; terms: Record<string, Record<Locale, GlossaryEntry>> };

export const config = configJson as AppConfig;
export const glossary = glossaryJson satisfies Glossary;

/** 言語ごとの文言。言語を足すときは JSON を作ってここに1行足す */
export const messagesByLocale: Record<Locale, MessageTree> = {
  ja: jaJson,
  en: enJson,
  'zh-Hant': zhHantJson,
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (config.languages.available as string[]).includes(v);
}

/** 作品のURL（環境変数 VITE_SITE_URL）。未設定なら今のページのURL */
export function siteUrl(): string {
  const v = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (v) return v;
  return typeof location === 'undefined' ? '' : location.origin + location.pathname;
}
