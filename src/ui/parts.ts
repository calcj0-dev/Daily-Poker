// 画面に共通の部品と、重ねて出す窓（M1 設定・M2 用語・M3 問題の前提・M4 プライバシー）

import { gaId, track } from '../analytics';
import { config, glossary, isLocale } from '../data';
import { getLocale, setLocale, t, term } from '../i18n';
import { store } from '../storage';
import { APP_VERSION } from '../version';
import { button, externalLink, h, linkButton } from './dom';
import { closeModal, showModal } from './modal';

export function versionEl(): HTMLElement {
  return h('span', { className: 'version', text: t('app.version', { version: APP_VERSION }) });
}

/** 右上の ⚙（M1 設定を開く） */
export function settingsButton(): HTMLElement {
  const b = button('⚙', openSettings, 'btn-icon');
  b.setAttribute('aria-label', t('common.settings'));
  return b;
}

export function topBar(left: (Node | null)[] = []): HTMLElement {
  return h('header', { className: 'top-bar' }, [
    h('div', { className: 'top-bar-left' }, left.filter((x): x is Node => x !== null)),
    versionEl(),
    settingsButton(),
  ]);
}

/** M1 設定：言語 */
export function openSettings(): void {
  const choices = config.languages.available.map((l) => {
    const b = button(config.languages.labels[l], () => {
      if (!isLocale(l) || l === getLocale()) return closeModal();
      store.setLang(l);
      track('lang_change', { to: l });
      closeModal();
      setLocale(l);
    }, `btn btn-choice${l === getLocale() ? ' selected' : ''}`);
    b.setAttribute('aria-pressed', String(l === getLocale()));
    return b;
  });
  showModal(t('common.settings'), [h('p', { className: 'label', text: t('common.language') }), h('div', { className: 'choices' }, choices)]);
}

/** M2 用語の一覧 */
export function openGlossary(): void {
  const items = Object.keys(glossary.terms).map((id) => {
    const e = term(id);
    return e ? h('div', { className: 'gloss-item' }, [h('dt', { text: e.term }), h('dd', { text: e.short })]) : null;
  });
  showModal(t('common.glossaryLink'), [h('dl', { className: 'gloss' }, items.filter((x): x is HTMLDivElement => x !== null))]);
}

/** M3 問題の前提と採点の決まり */
export function openBasis(): void {
  const g = config.grading;
  showModal(t('basis.heading'), [
    h('p', { text: t('basis.body') }),
    h('p', { className: 'grading', text: t('basis.grading', { g: g.greenMaxLossPctPot, y: g.yellowMaxLossPctPot, f: Math.round(g.yellowMinSolverFreq * 100) }) }),
    h('p', { className: 'muted small', text: t('common.solverNote') }),
  ]);
}

/** M4 プライバシー。GA4 を読み込むかどうかで文を変える */
export function openPrivacy(): void {
  const withGa = gaId() !== '';
  const body = t(withGa ? 'privacy.body' : 'privacy.bodyBasic');
  showModal(t('privacy.heading'), [
    ...body.split('\n').map((line) => h('p', { text: line })),
    withGa ? h('p', {}, [externalLink(t('privacy.googlePolicy'), config.links.googlePrivacy)]) : null,
    withGa ? h('p', {}, [externalLink(t('privacy.optout'), config.links.gaOptout)]) : null,
    h('p', {}, [externalLink(t('privacy.vercelPolicy'), config.links.vercelPrivacy)]),
  ]);
}

/** 画面の下：用語・問題の前提・プライバシー、免責 */
export function footer(): HTMLElement {
  return h('footer', { className: 'footer' }, [
    h('nav', { className: 'footer-links' }, [
      linkButton(t('common.glossaryLink'), openGlossary),
      linkButton(t('common.basisLink'), openBasis),
      linkButton(t('common.privacyLink'), openPrivacy),
    ]),
    h('p', { className: 'disclaimer', text: t('common.disclaimer') }),
  ]);
}

/** Ted App Lab・フォローへの小さいリンク（決定 #7） */
export function portalLinks(): HTMLElement {
  const portal = externalLink(t('common.portalLink'), config.links.portal);
  portal.addEventListener('click', () => track('portal_click', { target: 'portal' }));
  const follow = externalLink(t('common.follow'), config.links.follow);
  follow.addEventListener('click', () => track('portal_click', { target: 'follow' }));
  return h('p', { className: 'portal small' }, [portal, follow]);
}
