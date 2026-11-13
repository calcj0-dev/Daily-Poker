// 起動。#1 の時点では、作品名・バージョン・言語の切り替え・免責だけの空のページ

import './style.css';
import { initAnalytics, track } from './analytics';
import { config, isLocale, type Locale } from './data';
import { getLocale, onLocaleChange, setLocale, t } from './i18n';
import { store } from './storage';
import { h } from './ui/dom';
import { APP_VERSION } from './version';

const saved = store.getLang();
setLocale(isLocale(saved) ? saved : config.languages.default);
initAnalytics();

function languageSelect(): HTMLSelectElement {
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
    setLocale(next as Locale);
    track('lang_change', { to: next });
  });
  return select;
}

function render(root: HTMLElement): void {
  root.replaceChildren(
    h('header', { className: 'top-bar' }, [
      h('span', { className: 'version', text: t('app.version', { version: APP_VERSION }) }),
      h('label', { className: 'settings', attrs: { title: t('common.settings') } }, ['⚙', languageSelect()]),
    ]),
    h('main', { className: 'screen' }, [
      h('h1', { className: 'app-name', text: t('app.name') }),
      h('p', { className: 'tagline', text: t('app.tagline') }),
    ]),
    h('footer', { className: 'disclaimer', text: t('common.disclaimer') }),
  );
}

const root = document.querySelector<HTMLElement>('#app');
if (root) {
  render(root);
  onLocaleChange(() => render(root));
}
