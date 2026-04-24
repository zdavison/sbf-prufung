// ==UserScript==
// @name         SBF Translator
// @namespace    https://github.com/zdavison/sbf-prufung
// @match        https://www.bootspruefung.de/quiz/*
// @connect      raw.githubusercontent.com
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @version      0.1.0
// @description  Hover translations for SBF quiz questions, sourced from ELWIS data.
// ==/UserScript==

(function () {
  'use strict';

  const DATA_URL = 'https://raw.githubusercontent.com/zdavison/sbf-prufung/main/data/questions.json';
  const HOVER_DELAY_MS = 500;
  const CURSOR_OFFSET = 12;
  const JACCARD_THRESHOLD = 0.85;
  const LEVENSHTEIN_THRESHOLD = 0.9;
  const LENGTH_DIFF_CUTOFF = 0.3;

  const questionMap = new Map();
  const answerMap = new Map();

  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.?!:;]+$/, '');
  }

  function buildMaps(data) {
    for (const item of data) {
      if (item?.de?.question && item?.en?.question) {
        questionMap.set(normalize(item.de.question), item.en.question);
      }
      const deAnswers = item?.de?.answers;
      const enAnswers = item?.en?.answers;
      if (Array.isArray(deAnswers) && Array.isArray(enAnswers)) {
        for (let i = 0; i < deAnswers.length && i < enAnswers.length; i++) {
          if (deAnswers[i] && enAnswers[i]) {
            answerMap.set(normalize(deAnswers[i]), enAnswers[i]);
          }
        }
      }
    }
  }

  function tokenize(s) {
    return s.split(' ').filter(Boolean);
  }

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

  function levenshteinRatio(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a, b) / maxLen;
  }

  function findInMap(normText, map) {
    const direct = map.get(normText);
    if (direct) return direct;
    let best = null;
    let bestScore = 0;
    const len = normText.length;
    for (const [key, value] of map) {
      if (Math.abs(key.length - len) / Math.max(key.length, len) > LENGTH_DIFF_CUTOFF) continue;
      const j = jaccard(normText, key);
      if (j >= JACCARD_THRESHOLD && j > bestScore) {
        best = value;
        bestScore = j;
        continue;
      }
      if (j < JACCARD_THRESHOLD) {
        const r = levenshteinRatio(normText, key);
        if (r >= LEVENSHTEIN_THRESHOLD && r > bestScore) {
          best = value;
          bestScore = r;
        }
      }
    }
    return best;
  }

  function lookup(text) {
    const norm = normalize(text);
    if (!norm) return null;
    return findInMap(norm, questionMap) || findInMap(norm, answerMap);
  }

  // An element is a "leaf text block" if it has non-empty trimmed text and no
  // descendant block-level element that itself carries text.
  const BLOCK_TAGS = new Set([
    'DIV', 'P', 'LI', 'UL', 'OL', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE',
    'HEADER', 'FOOTER', 'NAV', 'FORM', 'TABLE', 'TR', 'TD', 'TH', 'TBODY',
    'THEAD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'FIGURE', 'BLOCKQUOTE'
  ]);

  function isLeafTextBlock(el) {
    const text = el.textContent;
    if (!text || !text.trim()) return false;
    for (const child of el.children) {
      if (BLOCK_TAGS.has(child.tagName) && child.textContent && child.textContent.trim()) {
        return false;
      }
    }
    return true;
  }

  function processElement(el) {
    if (el.dataset.sbfMatched) return;
    if (!isLeafTextBlock(el)) return;
    const translation = lookup(el.textContent);
    el.dataset.sbfMatched = '1';
    if (!translation) return;
    el.dataset.sbfTranslation = translation;
    attachHover(el);
  }

  function walk(root) {
    if (!(root instanceof Element)) return;
    if (root.matches('script, style, noscript')) return;
    processElement(root);
    // Descend even if matched — children can still be their own leaves above.
    for (const child of root.children) walk(child);
  }

  // ---- Tooltip ----

  let tooltipEl = null;
  let activeEl = null;
  let showTimer = null;
  let moveHandler = null;

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

  function showTooltip(el, clientX, clientY) {
    const tt = ensureTooltip();
    tt.textContent = el.dataset.sbfTranslation || '';
    tt.style.display = 'block';
    positionTooltip(clientX, clientY);
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
  }

  function attachHover(el) {
    el.addEventListener('mouseenter', (e) => {
      activeEl = el;
      clearTimeout(showTimer);
      const { clientX, clientY } = e;
      let lastX = clientX, lastY = clientY;
      moveHandler = (ev) => { lastX = ev.clientX; lastY = ev.clientY; positionTooltip(lastX, lastY); };
      el.addEventListener('mousemove', moveHandler);
      showTimer = setTimeout(() => {
        if (activeEl === el) showTooltip(el, lastX, lastY);
      }, HOVER_DELAY_MS);
    });
    el.addEventListener('mouseleave', () => {
      if (activeEl === el) activeEl = null;
      clearTimeout(showTimer);
      if (moveHandler) {
        el.removeEventListener('mousemove', moveHandler);
        moveHandler = null;
      }
      hideTooltip();
    });
  }

  // ---- Observer ----

  function startObserver() {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof Element) walk(node);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // ---- Bootstrap ----

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

  fetchJSON(DATA_URL).then((data) => {
    buildMaps(data);
    walk(document.body);
    startObserver();
  }).catch((err) => {
    console.warn('[SBF Translator] failed to load translations', err);
  });
})();
