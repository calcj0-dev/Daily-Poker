// S5 過去の問題（設計書 2章・5.3）。新しい順。解いた日は「4/5」

import { monthDay } from '../../core/date';
import { greenCount } from '../../core/share';
import { t } from '../../i18n';
import type { IndexEntry } from '../../puzzles';
import type { DayRecord } from '../../storage';
import type { Screen } from '../app';
import { button, h } from '../dom';
import { footer, topBar } from '../parts';

export type ArchiveProps = {
  entries: IndexEntry[];
  days: () => Record<string, DayRecord>;
  onPick: (entry: IndexEntry) => void;
  onTop: () => void;
};

export function archiveScreen(props: ArchiveProps): Screen {
  return {
    render() {
      const days = props.days();
      const items = props.entries.map((e) => {
        const { m, d } = monthDay(e.date);
        const day = days[e.date];
        const b = button('', () => props.onPick(e), 'btn archive-item');
        b.append(
          h('span', { text: t('archive.item', { n: e.number, m, d }) }),
          h('span', { className: 'muted', text: day?.finished ? t('archive.played', { g: greenCount(day.marks) }) : '' }),
        );
        return h('li', {}, [b]);
      });
      return h('div', { className: 'page' }, [
        topBar([button('←', props.onTop, 'btn-icon')]),
        h('main', { className: 'list-page' }, [
          h('h1', { text: t('archive.heading') }),
          items.length ? h('ul', { className: 'archive-list' }, items) : h('p', { className: 'muted', text: t('stats.empty') }),
        ]),
        footer(),
      ]);
    },
  };
}
