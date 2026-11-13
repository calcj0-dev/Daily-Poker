// S6 成績（設計書 2章・3.2）

import { computeStats } from '../../core/stats';
import { t } from '../../i18n';
import type { Store } from '../../session';
import type { Screen } from '../app';
import { button, h } from '../dom';
import { footer, topBar } from '../parts';

export type StatsProps = { store: Store; today: () => string; onTop: () => void };

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function tile(label: string, value: string): HTMLElement {
  return h('div', { className: 'stat-tile' }, [h('span', { className: 'stat-value', text: value }), h('span', { className: 'muted small', text: label })]);
}

export function statsScreen(props: StatsProps): Screen {
  return {
    render() {
      let body: HTMLElement[];
      if (!props.store.available()) {
        body = [h('p', { className: 'muted', text: t('stats.storageOff') })];
      } else {
        const s = computeStats(props.store.read().days, props.today());
        if (s.greenRate === null) {
          body = [h('p', { className: 'muted', text: t('stats.empty') })];
        } else {
          const parts: (HTMLElement | null)[] = [
            h('div', { className: 'stat-tiles' }, [
              tile(t('stats.streak'), String(s.streak)),
              tile(t('stats.maxStreak'), String(s.maxStreak)),
              tile(t('stats.played'), String(s.played)),
              tile(t('stats.greenRate'), pct(s.greenRate)),
            ]),
            s.byTag.length ? h('h2', { className: 'sub-heading', text: t('stats.byTag') }) : null,
            s.byTag.length
              ? h(
                  'div',
                  { className: 'bars' },
                  s.byTag.map((x) =>
                    h('div', { className: 'bar-row' }, [
                      h('span', { className: 'bar-label', text: t(`tags.${x.tag}`) }),
                      h('span', { className: 'bar-track' }, [h('span', { className: 'bar-fill top', attrs: { style: `width:${pct(x.rate)}` } })]),
                      h('span', { className: 'bar-pct', text: pct(x.rate) }),
                    ]),
                  ),
                )
              : null,
          ];
          body = parts.filter((x): x is HTMLElement => x !== null);
        }
      }
      return h('div', { className: 'page' }, [
        topBar([button('←', props.onTop, 'btn-icon')]),
        h('main', { className: 'list-page' }, [h('h1', { text: t('stats.heading') }), ...body]),
        footer(),
      ]);
    },
  };
}
