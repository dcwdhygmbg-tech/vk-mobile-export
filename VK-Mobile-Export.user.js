 // ==UserScript==
 // @name         VK Mobile Music Export
 // @namespace    local.vk.mobile.export
 // @version      1.0.0
 // @description  Export visible VK Music tracks to TXT on iPhone Safari
 // @match        https://vk.com/*
 // @match        https://m.vk.com/*
 // @match        https://vk.ru/*
 // @grant        none
 // @run-at       document-idle
 // ==/UserScript==

 (() => {
   'use strict';

   if (window.__vkMobileExportInstalled) return;
   window.__vkMobileExportInstalled = true;

   const tracks = new Map();
   let scanning = false;

   const clean = value =>
     (value || '').replace(/\s+/g, ' ').trim();

   function getTrackRows() {
     return [...document.querySelectorAll(
       '.audio_row, [data-testid*="audio"], [class*="audio_row"]'
     )];
   }

   function extractTracks() {
     let added = 0;

     for (const row of getTrackRows()) {
       const artistEl = row.querySelector(
         '.audio_row__performers, [class*="performer"], [class*="artist"]'
       );
       const titleEl = row.querySelector(
         '.audio_row__title_inner, [class*="title_inner"], [class*="track-title"]'
       );

       let artist = clean(artistEl?.innerText);
       let title = clean(titleEl?.innerText);

       // Fallback for alternative mobile layouts
       if (!title) {
         const links = [...row.querySelectorAll('a')]
           .map(a => clean(a.innerText))
           .filter(Boolean);

         if (links.length >= 2) {
           artist ||= links[0];
           title = links[1];
         }
       }

       if (!artist || !title) continue;

       const line = `${artist} — ${title}`;
       if (!tracks.has(line)) {
         tracks.set(line, line);
         added++;
       }
     }

     updateStatus(`Сохранено: ${tracks.size} · +${added}`);
   }

   function updateStatus(text) {
     const status = document.getElementById('vkme-status');
     if (status) status.textContent = text;
   }

   function downloadTxt() {
     extractTracks();

     if (!tracks.size) {
       alert(
         'Треки не найдены. Открой список аудиозаписей VK в Safari и прокрути страницу.'
       );
       return;
     }

     const content = [...tracks.values()].join('\n');
     const blob = new Blob(['\uFEFF' + content], {
       type: 'text/plain;charset=utf-8'
     });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');

     a.href = url;
     a.download = 'VK-Music-Export.txt';
     document.body.appendChild(a);
     a.click();
     a.remove();

     setTimeout(() => URL.revokeObjectURL(url), 30000);
   }

   function scanPage() {
     if (scanning) return;
     scanning = true;

     extractTracks();

     const button = document.getElementById('vkme-scan');
     if (button) button.textContent = 'Прокручиваю…';

     let previousHeight = -1;
     let stable = 0;
     let steps = 0;

     const timer = setInterval(() => {
       extractTracks();

       const height = document.documentElement.scrollHeight;

       if (height === previousHeight) stable++;
       else stable = 0;

       previousHeight = height;
       window.scrollBy(0, Math.max(350, window.innerHeight * 0.8));
       steps++;

       if (stable >= 6 || steps >= 150) {
         clearInterval(timer);
         scanning = false;
         if (button) button.textContent = 'Сканировать список';
         updateStatus(`Готово к экспорту: ${tracks.size}`);
         alert(
           `Сканирование завершено. Найдено треков: ${tracks.size}.\n` +
           'Если список большой, проверь, что VK загрузил все записи.'
         );
       }
     }, 900);
   }

   function createUI() {
     if (document.getElementById('vkme-panel')) return;

     const panel = document.createElement('div');
     panel.id = 'vkme-panel';
     panel.style.cssText = [
       'position:fixed',
       'right:10px',
       'bottom:100px',
       'z-index:2147483647',
       'width:190px',
       'padding:10px',
       'border-radius:14px',
       'background:#202127',
       'color:white',
       'font:14px -apple-system,BlinkMacSystemFont,sans-serif',
       'box-shadow:0 3px 16px #0006'
     ].join(';');

     panel.innerHTML = `
       <div style="font-weight:700;margin-bottom:8px">
         VK Music Export
       </div>
       <div id="vkme-status" style="font-size:12px;margin-bottom:8px">
         Готов к работе
       </div>
       <button id="vkme-scan" style="width:100%;padding:10px;margin-bottom:6px">
         Сканировать список
       </button>
       <button id="vkme-save" style="width:100%;padding:10px">
         Экспорт TXT
       </button>
       <button id="vkme-hide" style="margin-top:6px;width:100%;padding:6px">
         Скрыть
       </button>
     `;

     document.body.appendChild(panel);

     document.getElementById('vkme-scan')
       .addEventListener('click', scanPage);
     document.getElementById('vkme-save')
       .addEventListener('click', downloadTxt);
     document.getElementById('vkme-hide')
       .addEventListener('click', () => panel.remove());
   }

   createUI();

   // VK may replace page contents during navigation.
   new MutationObserver(() => {
     if (!document.getElementById('vkme-panel')) createUI();
   }).observe(document.documentElement, {
     childList: true,
     subtree: true
   });
 })();
