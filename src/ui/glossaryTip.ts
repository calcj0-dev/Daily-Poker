// 用語の吹き出し（設計書 2章 M2）。用語をタップすると一言の説明を出す

import { track } from '../analytics';
import { term } from '../i18n';
import { h } from './dom';

let current: { el: HTMLElement; anchor: HTMLElement } | null = null;

export function closeTip(): void {
  current?.el.remove();
  current = null;
}

function openTip(anchor: HTMLElement, id: string): void {
  const entry = term(id);
  if (!entry) return;
  if (current?.anchor === anchor) {
    closeTip();
    return;
  }
  closeTip();
  const el = h('div', { className: 'tip', attrs: { role: 'tooltip' } }, [
    h('strong', { text: entry.term }),
    h('span', { text: entry.short }),
  ]);
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  const width = Math.min(280, window.innerWidth - 32);
  el.style.width = `${width}px`;
  const left = Math.max(16, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 16));
  el.style.left = `${left + window.scrollX}px`;
  // 下に入らなければ上に出す
  const below = r.bottom + 8;
  const height = el.offsetHeight;
  const top = below + height > window.innerHeight - 8 ? r.top - height - 8 : below;
  el.style.top = `${Math.max(8, top) + window.scrollY}px`;
  current = { el, anchor };
  track('glossary_open', { term: id });
}

/** タップで説明が出る用語（点線の下線） */
export function termEl(id: string, text?: string): HTMLElement {
  const label = text ?? term(id)?.term ?? id;
  const el = h('button', { className: 'term', text: label, attrs: { type: 'button' } });
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    openTip(el, id);
  });
  return el;
}

/**
 * 文の中の用語に下線を付ける。ids の用語の名前（今の言語）が文に出てきたら、その部分をタップできるようにする
 */
export function withTerms(text: string, ids: string[]): Node[] {
  const names = ids
    .map((id) => ({ id, name: term(id)?.term ?? '' }))
    // 「BTN（ボタン）」のような名前は、かっこの前だけで探す
    .map((x) => ({ ...x, name: x.name.replace(/\s*[（(].*$/, '') }))
    .filter((x) => x.name.length > 0)
    .sort((a, b) => b.name.length - a.name.length);
  const nodes: Node[] = [];
  let rest = text;
  while (rest.length) {
    let hit: { index: number; id: string; name: string } | null = null;
    for (const n of names) {
      const i = rest.toLowerCase().indexOf(n.name.toLowerCase());
      if (i >= 0 && (!hit || i < hit.index)) hit = { index: i, ...n };
    }
    if (!hit) {
      nodes.push(document.createTextNode(rest));
      break;
    }
    if (hit.index > 0) nodes.push(document.createTextNode(rest.slice(0, hit.index)));
    nodes.push(termEl(hit.id, rest.slice(hit.index, hit.index + hit.name.length)));
    rest = rest.slice(hit.index + hit.name.length);
  }
  return nodes;
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', () => closeTip());
}
