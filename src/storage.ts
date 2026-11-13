// 端末の中の保存（設計書 6章）。キーは config.storageKey の1つだけで、中身は1つの JSON。
// 読み書きはすべて try/catch。保存できない環境（シークレットモードなど）でも遊べるようにする

import { config, isLocale, type Locale } from './data';

export type Mark = 'g' | 'y' | 'r';

export type DayRecord = {
  /** 選んだ行動の ID（まだなら null） */
  answers: (string | null)[];
  marks: (Mark | null)[];
  /** 5問解き終えたか */
  finished: boolean;
  /** その日の問題として解き終えたか（連続日数に数える。0時をまたいでも、その日に解き始めていれば true） */
  playedOnDay: boolean;
  /** その日（日本時間）のうちに1問目に答えたか（決定メモ：0時をまたいだ日の扱い） */
  startedOnDay?: boolean;
  /** 答えた問題のタグ（成績の場面別に使う。設計書 6章に足したもの） */
  tags?: (string[] | null)[];
};

export type SaveData = {
  version: 1;
  lang?: Locale;
  days: Record<string, DayRecord>;
};

function empty(): SaveData {
  return { version: 1, days: {} };
}

/** 保存の窓口。テストでは localStorage の代わりを渡せる */
export function createStore(backend: () => Storage | undefined = () => globalThis.localStorage) {
  const key = config.storageKey;
  // 保存できないときも、その場では遊べるようにメモリに持つ
  let memory: SaveData | null = null;

  function available(): boolean {
    try {
      const s = backend();
      if (!s) return false;
      const probe = `${key}.probe`;
      s.setItem(probe, '1');
      s.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  function read(): SaveData {
    if (memory) return memory;
    try {
      const raw = backend()?.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      memory = normalize(parsed);
    } catch {
      memory = empty();
    }
    return memory;
  }

  function write(next: SaveData): void {
    memory = next;
    try {
      backend()?.setItem(key, JSON.stringify(next));
    } catch {
      // 保存できなくても遊べるようにする
    }
  }

  return {
    available,
    read,
    write,
    getLang(): Locale | undefined {
      return read().lang;
    },
    setLang(lang: Locale): void {
      write({ ...read(), lang });
    },
  };
}

/** 壊れた中身や古い形を、読める形にそろえる */
export function normalize(v: unknown): SaveData {
  if (typeof v !== 'object' || v === null) return empty();
  const o = v as Partial<SaveData>;
  if (o.version !== 1) return empty();
  const days = typeof o.days === 'object' && o.days !== null ? o.days : {};
  return { version: 1, lang: isLocale(o.lang) ? o.lang : undefined, days };
}

export const store = createStore();

/** 端末に残さない保存先（見本で遊ぶときと、テスト用） */
export function memoryStorage(): Storage {
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
