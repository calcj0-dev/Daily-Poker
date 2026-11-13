import { describe, expect, it } from 'vitest';
import { config, messagesByLocale, type MessageTree } from '../src/data';
import { format, lookup, setLocale, t } from '../src/i18n';
import { createStore, normalize } from '../src/storage';

function leafKeys(tree: MessageTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [prefix + k] : leafKeys(v, `${prefix}${k}.`)));
}

describe('文言（i18n）', () => {
  it('3言語の文言のキーがそろっている', () => {
    const ja = leafKeys(messagesByLocale.ja).sort();
    for (const l of config.languages.available) expect(leafKeys(messagesByLocale[l]).sort(), l).toEqual(ja);
  });

  it('名前はどの言語でも Daily Poker', () => {
    for (const l of config.languages.available) expect(lookup(messagesByLocale[l], 'app.name')).toBe('Daily Poker');
  });

  it('差し込みを置き換え、言語を切り替えられる', () => {
    expect(format('{a}と{b}', { a: 1 })).toBe('1と{b}');
    setLocale('en');
    expect(t('home.start')).toBe('Start');
    setLocale('ja');
    expect(t('home.start')).toBe('はじめる');
  });
});

/** テスト用の localStorage の代わり */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

describe('保存（storage）', () => {
  it('選んだ言語を保存して読み直せる', () => {
    const backend = memoryStorage();
    createStore(() => backend).setLang('zh-Hant');
    expect(createStore(() => backend).getLang()).toBe('zh-Hant');
  });

  it('保存できない環境でも例外を出さず、その場では値を持つ', () => {
    const broken = () => {
      throw new Error('blocked');
    };
    const s = createStore(broken);
    expect(s.available()).toBe(false);
    s.setLang('en');
    expect(s.getLang()).toBe('en');
  });

  it('壊れた中身は空に戻す', () => {
    expect(normalize('x')).toEqual({ version: 1, days: {} });
    expect(normalize({ version: 1, lang: 'fr', days: {} }).lang).toBeUndefined();
  });
});
