// S4 結果（設計書 2章）。5つのマス・🟩の数・連続日数・シェア（コピー・X・画像付き）

import { track } from '../../analytics';
import { monthDay } from '../../core/date';
import { greenCount, marksLine, shareText } from '../../core/share';
import { t } from '../../i18n';
import type { Session } from '../../session';
import { renderResultImage } from '../../share/resultImage';
import { canShareImage, copyText, openXIntent, shareWithImage } from '../../share/share';
import type { Screen } from '../app';
import { button, h } from '../dom';
import { footer, portalLinks, topBar } from '../parts';

export type ResultProps = { session: Session; onTop: () => void; onArchive: () => void };

export function resultScreen(props: ResultProps): Screen {
  const { session } = props;
  return {
    render() {
      const day = session.day();
      const marks = day?.marks ?? [];
      const { m, d } = monthDay(session.puzzle.date);
      const streak = session.streak();
      const text = () => shareText({ number: session.puzzle.number, date: session.puzzle.date, marks, streak });

      const copyBtn = button(t('result.copy'), async () => {
        track('share_click', { method: 'copy' });
        if (await copyText(text())) {
          copyBtn.textContent = t('result.copied');
          setTimeout(() => (copyBtn.textContent = t('result.copy')), 2000);
        }
      }, 'btn');
      const shareBlock = session.canShare()
        ? h('div', { className: 'share-buttons' }, [
            button(t('result.share'), () => {
              track('share_click', { method: 'x_intent' });
              openXIntent(text());
            }, 'btn btn-primary'),
            copyBtn,
          ])
        : h('p', { className: 'muted small', text: t('result.archiveNote') });

      // 画像付きのシェア。タップの後に描くと iPhone で共有が止められるため、先に描いておき、
      // 画像を共有できる端末だけにボタンを出す
      if (session.canShare()) {
        void renderResultImage({ number: session.puzzle.number, date: session.puzzle.date, marks, streak }).then((blob) => {
          if (!blob || !canShareImage(blob) || !shareBlock.isConnected) return;
          const b = button(t('result.shareImage'), () => {
            track('share_click', { method: 'web_share' });
            void shareWithImage(text(), blob);
          }, 'btn share-image');
          shareBlock.append(b);
        });
      }

      return h('div', { className: 'page' }, [
        topBar([button('←', props.onTop, 'btn-icon')]),
        h('main', { className: 'result' }, [
          h('h1', { className: 'result-title', text: t('result.heading', { m, d }) }),
          h('p', { className: 'muted', text: `#${session.puzzle.number}` }),
          h('p', { className: 'marks marks-lg', text: marksLine(marks) }),
          h('p', { className: 'result-greens', text: t('result.greens', { g: greenCount(marks) }) }),
          session.archive ? null : h('p', { text: t('result.streak', { n: streak }) }),
          shareBlock,
          button(t('home.archive'), props.onArchive, 'btn btn-wide'),
          portalLinks(),
        ]),
        footer(),
      ]);
    },
  };
}
