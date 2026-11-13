// 画面に共通の部品

import { track } from '../analytics';
import { config, isLocale } from '../data';
import { getLocale, setLocale, t } from '../i18n';
import { store } from '../storage';
import { APP_VERSION } from '../version';
import { h } from './dom';

/** 言語の切り替え（M1 は #5。いまは右上の選択だけ） */
export function languageSelect(): HTMLElement {
  const select = h(
    'select',
    { className: 'lang-select', attrs: { 'aria-label': t('common.language') } },
    config.languages.available.map((l) => {
      const opt = h('option', { text: config.languages.labels[l], attrs: { value: l } });
      opt.selected = l === getLocale();
      return opt;
    }),
  );
  select.addEventListener('change', () => {
    const next = select.value;
    if (!isLocale(next)) return;
    store.setLang(next);
    track('lang_change', { to: next });
    setLocale(next);
  });
  return h('label', { className: 'settings', attrs: { title: t('common.settings') } }, [
    h('span', { text: '⚙', attrs: { 'aria-hidden': 'true' } }),
    select,
  ]);
}

export function versionEl(): HTMLElement {
  return h('span', { className: 'version', text: t('app.version', { version: APP_VERSION }) });
}

export function disclaimer(): HTMLElement {
  return h('footer', { className: 'disclaimer', text: t('common.disclaimer') });
}
