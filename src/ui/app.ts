// 画面の切り替え。言語が変わったら今の画面を描き直す

import { onLocaleChange } from '../i18n';
import { closeTip } from './glossaryTip';

export type Screen = { render(): HTMLElement; dispose?(): void };

export function createApp(root: HTMLElement) {
  let current: Screen | null = null;

  function draw(): void {
    if (!current) return;
    closeTip();
    root.replaceChildren(current.render());
  }

  onLocaleChange(draw);

  return {
    show(screen: Screen): void {
      current?.dispose?.();
      current = screen;
      draw();
      window.scrollTo(0, 0);
    },
    redraw: draw,
  };
}

export type App = ReturnType<typeof createApp>;
