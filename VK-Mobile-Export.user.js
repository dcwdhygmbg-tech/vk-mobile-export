
<escape>// ==UserScript==
// @name         VK Mobile Music Export
// @namespace    https://github.com/dcwdhygmbg-tech/vk-mobile-export
// @version      1.2.0
// @description  Export VK Music track names to TXT on iPhone Safari
// @match        https://vk.com/*
// @match        https://m.vk.com/*
// @match        https://vk.ru/*
// @match        https://m.vk.ru/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  if (window.__vkMobileExportInstalled) return;
  window.__vkMobileExportInstalled = true;

  const tracks = new Map();
  let scanning = false;
  let scanTimer = null;

  const clean = value =>
    (value || '').replace(/\s+/g, ' ').trim();

  function status(message) {
    const el = document.getElementById('vkme-status');
    if (el) el.textContent = message;
  }

  function getRows() {
    return document.querySelectorAll([
      '.audio_row',
      '.audio_row__inner',
      '[data-testid*="audio"]',
      '[class*="audio_row"]',
      '[data-audio]'
    ].join(','));
  }

  function collect() {
    let added = 0;

    for (const row of getRows()) {
      const artistEl = row.querySelector([
        '.audio_row__performers',
        '.audio_row__artist',
        '[class*="performer"]',
        '[class*="artist"]'
      ].join(','));

      const titleEl = row.querySelector([
        '.audio_row__title_inner',
        '.audio_row__title',
        '[class*="title_inner"]',
        '[class*="track-title"]'
      ].join(','));

      let artist = clean(
        artistEl?.innerText || artistEl?.textContent
      );

      let title = clean(
        titleEl?.innerText || titleEl?.textContent
      );

      // Fallback for alternative mobile VK layouts
      if (!artist || !title) {
        const links = Array.from(row.querySelectorAll('a'))
          .map(a => clean(a.innerText || a.textContent))
          .filter(Boolean);

        const unique = [...new Set(links)];

        if (!artist && unique.length >= 2) {
          artist = unique[0];
        }
        if (!title && unique.length >= 2) {
          title = unique[1];
        }
      }

      if (!artist || !title) continue;
      if (artist.length > 180 || title.length > 240) continue;

      const line = artist + ' — ' + title;

      if (!tracks.has(line)) {
        tracks.set(line, line);
        added++;
      }
    }

    status('Найдено: ' + tracks.size + ' (+' + added + ')');
    return added;
  }

  function exportTxt() {
    collect();

    if (!tracks.size) {
      alert(
        'Треки не найдены. Открой список аудиозаписей VK ' +
        'в Safari и попробуй прокрутить его вручную.'
      );
      return;
    }

    const content =
      '\uFEFF' + Array.from(tracks.values()).join('\n');

    const blob = new Blob(
      [content],
      { type: 'text/plain;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'VK-Music-Export.txt';
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status('Экспортировано: ' + tracks.size);
  }

  function scan() {
    if (scanning) return;

    scanning = true;
    collect();

    const button = document.getElementById('vkme-scan');
    if (button) button.textContent = 'Сканирую…';

    let lastHeight = 0;
    let stableCount = 0;
    let steps = 0;

    scanTimer = setInterval(() => {
      collect();

      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight || 0
      );

      if (height === lastHeight) {
        stableCount++;
      } else {
        stableCount = 0;
      }

      lastHeight = height;

      window.scrollBy(
        0,
        Math.max(300, Math.floor(window.innerHeight * 0.75))
      );

      steps++;

      if (stableCount >= 7 || steps >= 180) {
        clearInterval(scanTimer);
        scanTimer = null;
        scanning = false;

        if (button) button.textContent = 'Сканировать список';

        status('Сканирование окончено: ' + tracks.size);

        alert(
          'Сканирование завершено. Найдено записей: ' +
          tracks.size +
          '. Нажми «Экспорт TXT». ' +
          'Если треков меньше ожидаемого, проверь, ' +
          'загрузил ли VK весь список.'
        );
      }
    }, 850);
  }

  function mount() {
    if (!document.body || document.getElementById('vkme-panel')) {
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'vkme-panel';

    panel.style.cssText = [
      'position:fixed',
      'right:10px',
      'bottom:90px',
      'z-index:2147483647',
      'width:200px',
      'padding:11px',
      'border-radius:13px',
      'background:#202127',
      'color:#fff',
      'font:14px -apple-system,BlinkMacSystemFont,sans-serif',
      'box-shadow:0 3px 16px #0006'
    ].join(';');

    panel.innerHTML =
      '<div style="font-weight:700;margin-bottom:8px">' +
      'VK Music Export</div>' +
      '<div id="vkme-status" ' +
      'style="font-size:12px;margin-bottom:8px">' +
      'Готов. Открой аудиозаписи.</div>' +
      '<button id="vkme-scan" ' +
      'style="width:100%;padding:10px;margin-bottom:6px">' +
      'Сканировать список</button>' +
      '<button id="vkme-export" ' +
      'style="width:100%;padding:10px;margin-bottom:6px">' +
      'Экспорт TXT</button>' +
      '<button id="vkme-hide" ' +
      'style="width:100%;padding:6px">Скрыть</button>';

    document.body.appendChild(panel);

    document.getElementById('vkme-scan')
      .addEventListener('click', scan);

    document.getElementById('vkme-export')
      .addEventListener('click', exportTxt);

    document.getElementById('vkme-hide')
      .addEventListener('click', () => {
        if (scanTimer) clearInterval(scanTimer);
        scanning = false;
        panel.remove();
      });
  }

  mount();

  new MutationObserver(() => {
    if (!document.getElementById('vkme-panel')) {
      mount();
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();</escape>
