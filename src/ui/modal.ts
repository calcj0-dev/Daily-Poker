// 画面の上に重ねて出す窓（M1〜M4）

import { t } from '../i18n';
import { button, h } from './dom';

let open: HTMLElement | null = null;

export function closeModal(): void {
  open?.remove();
  open = null;
  document.body.classList.remove('modal-open');
}

export function showModal(heading: string, body: (Node | null)[]): void {
  closeModal();
  const panel = h('div', { className: 'modal-panel', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': heading } }, [
    h('div', { className: 'modal-head' }, [h('h2', { text: heading }), button('×', closeModal, 'btn-icon')]),
    h('div', { className: 'modal-body' }, body.filter((x): x is Node => x !== null)),
    button(t('common.close'), closeModal, 'btn btn-wide'),
  ]);
  const backdrop = h('div', { className: 'modal' }, [panel]);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.body.append(backdrop);
  document.body.classList.add('modal-open');
  open = backdrop;
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
