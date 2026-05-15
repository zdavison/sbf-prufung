// ==UserScript==
// @name         SBF Translator
// @namespace    https://github.com/zdavison/sbf-prufung
// @match        https://www.bootspruefung.de/*
// @connect      raw.githubusercontent.com
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @version      0.4.0
// @description  Hover translations for SBF quiz questions, sourced from ELWIS data.
// @updateURL    https://raw.githubusercontent.com/zdavison/sbf-prufung/main/userscript/sbf-translate.user.js
// @downloadURL  https://raw.githubusercontent.com/zdavison/sbf-prufung/main/userscript/sbf-translate.user.js
// ==/UserScript==

(function () {
  'use strict';

  const DATA_URL = 'https://raw.githubusercontent.com/zdavison/sbf-prufung/main/data/questions.json';
  const HOVER_DELAY_MS = 500;
  const CURSOR_OFFSET = 12;
  const MIN_TEXT_LEN = 5;
  const MAX_TEXT_LEN = 500;
  const JACCARD_THRESHOLD = 0.85;
  const LEVENSHTEIN_THRESHOLD = 0.9;
  const LENGTH_DIFF_CUTOFF = 0.3;

  // ---- Normalization & matching ----

  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.?!:;]+$/, '');
  }

  function tokenize(s) { return s.split(' ').filter(Boolean); }

  function jaccard(a, b) {
    const A = new Set(tokenize(a));
    const B = new Set(tokenize(b));
    if (A.size === 0 || B.size === 0) return 0;
    let inter = 0;
    for (const t of A) if (B.has(t)) inter++;
    return inter / (A.size + B.size - inter);
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  }

  function findInMap(normText, map) {
    const direct = map.get(normText);
    if (direct) return direct;
    const len = normText.length;
    let best = null, bestScore = 0;
    for (const [key, value] of map) {
      const keyLen = key.length;
      if (Math.abs(keyLen - len) / Math.max(keyLen, len) > LENGTH_DIFF_CUTOFF) continue;
      const j = jaccard(normText, key);
      if (j >= JACCARD_THRESHOLD && j > bestScore) { best = value; bestScore = j; }
    }
    if (best) return best;
    for (const [key, value] of map) {
      const keyLen = key.length;
      if (Math.abs(keyLen - len) / Math.max(keyLen, len) > LENGTH_DIFF_CUTOFF) continue;
      const r = 1 - levenshtein(normText, key) / Math.max(keyLen, len);
      if (r >= LEVENSHTEIN_THRESHOLD && r > bestScore) { best = value; bestScore = r; }
    }
    return best;
  }

  function lookup(text, maps) {
    const norm = normalize(text);
    if (!norm) return null;
    return findInMap(norm, maps.questionMap) || findInMap(norm, maps.answerMap);
  }

  // ---- Lazy data loading ----

  let dataPromise = null;

  function fetchJSON(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            try { resolve(JSON.parse(res.responseText)); }
            catch (e) { reject(e); }
          } else {
            reject(new Error('HTTP ' + res.status));
          }
        },
        onerror: (err) => reject(err),
        ontimeout: () => reject(new Error('timeout'))
      });
    });
  }

  function getMaps() {
    if (!dataPromise) {
      dataPromise = fetchJSON(DATA_URL).then((data) => {
        const questionMap = new Map();
        const answerMap = new Map();
        for (const item of data) {
          if (item?.de?.question && item?.en?.question) {
            questionMap.set(normalize(item.de.question), item.en.question);
          }
          const de = item?.de?.answers, en = item?.en?.answers;
          if (Array.isArray(de) && Array.isArray(en)) {
            for (let i = 0; i < de.length && i < en.length; i++) {
              if (de[i] && en[i]) answerMap.set(normalize(de[i]), en[i]);
            }
          }
        }
        return { questionMap, answerMap };
      }).catch((err) => {
        console.warn('[SBF Translator] failed to load translations', err);
        dataPromise = null;
        throw err;
      });
    }
    return dataPromise;
  }

  // ---- Tooltip ----

  let tooltipEl = null;
  let tooltipAnchor = null;

  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'sbf-translate-tooltip';
    Object.assign(tooltipEl.style, {
      position: 'fixed',
      zIndex: '2147483647',
      background: '#222',
      color: '#fff',
      padding: '8px 10px',
      borderRadius: '6px',
      fontSize: '14px',
      lineHeight: '1.4',
      maxWidth: '420px',
      wordWrap: 'break-word',
      pointerEvents: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      display: 'none',
      fontFamily: 'system-ui, sans-serif'
    });
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function positionTooltip(clientX, clientY) {
    const tt = ensureTooltip();
    const rect = tt.getBoundingClientRect();
    let x = clientX + CURSOR_OFFSET;
    let y = clientY + CURSOR_OFFSET;
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
    if (y + rect.height > window.innerHeight) y = clientY - rect.height - CURSOR_OFFSET;
    if (x < 4) x = 4;
    if (y < 4) y = 4;
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
  }

  function showTooltip(text, clientX, clientY) {
    const tt = ensureTooltip();
    tt.textContent = text;
    tt.style.display = 'block';
    positionTooltip(clientX, clientY);
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
    tooltipAnchor = null;
  }

  // ---- Debounced hover state ----

  // Mouse events are kept trivially cheap: update last position/target and
  // reset a single timer. All DOM inspection and translation lookup only
  // happen once the mouse has been stationary for HOVER_DELAY_MS.

  let lastTarget = null;
  let lastX = 0, lastY = 0;
  let hoverTimer = null;

  const lookupCache = new WeakMap();

  function findCandidate(start) {
    let el = start;
    while (el && el !== document.body && el instanceof Element) {
      if (tooltipEl && (el === tooltipEl || tooltipEl.contains(el))) return null;
      const text = el.textContent;
      const len = text ? text.length : 0;
      if (len > MAX_TEXT_LEN) return null;
      if (len >= MIN_TEXT_LEN) {
        const trimmed = text.trim();
        if (trimmed.length >= MIN_TEXT_LEN && trimmed.length <= MAX_TEXT_LEN) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  async function onHoverSettle() {
    const target = lastTarget;
    if (!target || !(target instanceof Element) || !target.isConnected) return;
    if (tooltipEl && tooltipEl.contains(target)) return;

    const candidate = findCandidate(target);
    if (!candidate) return;

    let translation = lookupCache.get(candidate);
    if (translation === undefined) {
      try {
        const maps = await getMaps();
        translation = lookup(candidate.textContent, maps) || null;
      } catch {
        translation = null;
      }
      lookupCache.set(candidate, translation);
    }

    // Confirm the mouse hasn't moved off this candidate during the async work.
    if (!translation) return;
    if (!(lastTarget instanceof Node) || !candidate.contains(lastTarget)) return;

    tooltipAnchor = candidate;
    showTooltip(translation, lastX, lastY);
  }

  function onMouseMove(e) {
    lastTarget = e.target;
    lastX = e.clientX; lastY = e.clientY;

    if (tooltipEl && tooltipEl.style.display === 'block') {
      if (tooltipAnchor && tooltipAnchor.contains(e.target)) {
        positionTooltip(lastX, lastY);
      } else {
        hideTooltip();
      }
    }

    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(onHoverSettle, HOVER_DELAY_MS);
  }

  function onMouseLeave() {
    clearTimeout(hoverTimer);
    hideTooltip();
  }

  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave, { passive: true });
})();
