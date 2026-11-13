// 文言の取り出しと言語の切り替え（設計書 8.3）。
// キーは "home.start" のように点でつなぐ。文言はコードに書かず i18n/<言語>.json に置く

import { config, glossary, messagesByLocale, type Locale, type MessageTree } from '../data';

let locale: Locale = config.languages.default;

type Listener = (next: Locale) => void;
const listeners = new Set<Listener>();

export function setLocale(next: Locale): void {
  locale = next;
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  for (const fn of listeners) fn(next);
}

export function getLocale(): Locale {
  return locale;
}

/** 言語が変わったら呼ばれる。戻り値で解除 */
export function onLocaleChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 英語・中国語のように、解説を AI が翻訳している言語か（決定 #18） */
export function isMachineTranslated(l: Locale = locale): boolean {
  return config.languages.machineTranslated.includes(l);
}

export type Vars = Record<string, string | number>;

/** {name} の形の差し込みを置き換える。値がない差し込みはそのまま残す */
export function format(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

/** "a.b.c" をたどって文字列を取り出す。なければ undefined */
export function lookup(tree: MessageTree, key: string): string | undefined {
  let node: string | MessageTree | undefined = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** 今の言語の文言。なければ日本語、それもなければキーをそのまま返す */
export function t(key: string, vars?: Vars): string {
  const s = lookup(messagesByLocale[locale], key) ?? lookup(messagesByLocale.ja, key) ?? key;
  return format(s, vars);
}

/** 用語の名前と一言の説明（glossary.json） */
export function term(id: string): { term: string; short: string } | undefined {
  const entry = glossary.terms[id as keyof typeof glossary.terms];
  return entry?.[locale];
}
