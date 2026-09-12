import ui from '../../content/ui.json';
import type { ProgressStore } from '../app/store';
import type { BookDef } from '../content/schema';
import { AVATARS } from '../ui/avatars';

/**
 * 本機家長報告（DECISIONS D17）：每本書每頁的星、重試次數、讀完時間。資料不離裝置。
 * 入口藏在 HUD 頭像長按，小孩不會誤入。
 */
export interface ParentReport {
  open(): void;
  close(): void;
}

export function createParentReport(container: HTMLElement, store: ProgressStore, books: Record<string, BookDef>, onSwitch: () => void): ParentReport {
  const root = document.createElement('div');
  root.className = 'report';
  root.hidden = true;
  container.append(root);
  const render = () => {
    const profile = store.active();
    const rows: string[] = [];
    for (const book of Object.values(books)) {
      const progress = profile?.books[book.id];
      const done = progress?.completedAt ? new Date(progress.completedAt).toLocaleDateString('zh-TW') : ui.report.notyet;
      rows.push(`<h3>${book.title} <small>${ui.report.completed}${done}</small></h3>`);
      rows.push(`<table><thead><tr><th>${ui.report.page}</th><th>${ui.report.stars}</th><th>${ui.report.attempts}</th></tr></thead><tbody>`);
      book.pages.forEach((p, i) => {
        const pg = progress?.pages[p.id];
        rows.push(`<tr><td>${i + 1}</td><td>${pg?.stars ? '⭐' : '—'}</td><td>${pg?.attempts ?? 0}</td></tr>`);
      });
      rows.push('</tbody></table>');
    }
    root.innerHTML = `<div class="report-card">
      <div class="report-head"><span class="report-avatar">${profile ? AVATARS[profile.id].svg : ''}</span><h2>${ui.report.title}</h2></div>
      ${rows.join('')}
      <p class="report-privacy">${ui.report.privacy}</p>
      <div class="report-actions"><button type="button" class="hud-btn report-switch">${ui.profile.switch}</button><button type="button" class="hud-btn report-close">${ui.report.close}</button></div>
    </div>`;
    root.querySelector('.report-close')?.addEventListener('click', () => api.close());
    root.querySelector('.report-switch')?.addEventListener('click', () => {
      api.close();
      onSwitch();
    });
  };
  const api: ParentReport = {
    open() {
      render();
      root.hidden = false;
    },
    close() {
      root.hidden = true;
    },
  };
  return api;
}
