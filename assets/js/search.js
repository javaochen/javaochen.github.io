/* 全站搜索（无依赖，纯前端）
 *
 * 用法：Ctrl+K / ⌘K 打开；/ 聚焦；↑↓ 选择；Enter 跳转；Esc 关闭。
 * 索引：仓库根目录 search.json（由 Jekyll Liquid 生成，列出所有有 title 的页面）。
 * 跳转定位：点击结果时把关键词存入 sessionStorage，目标页加载后在首个匹配处高亮并滚动过去。
 */
(function () {
  'use strict';

  var INDEX_URL = '/search.json';
  var STORE_KEY = 'jsq:q';
  var state = { items: null, results: [], active: -1, composing: false, pending: null, overlay: null, ui: null };

  var CSS = ''
    + '.jsq-back{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(20,24,32,.55);z-index:9998;'
    + 'display:flex;align-items:flex-start;justify-content:center;padding:8vh 4vw;}'
    + '.jsq-panel{width:100%;max-width:720px;max-height:80vh;display:flex;flex-direction:column;'
    + 'background:#fff;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.28);overflow:hidden;'
    + 'font:16px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:#1f2328;}'
    + '.jsq-input{width:100%;box-sizing:border-box;border:0;border-bottom:1px solid #e5e7eb;'
    + 'padding:14px 16px;font-size:17px;outline:none;background:#fff;color:inherit;}'
    + '.jsq-list{list-style:none;margin:0;padding:6px;overflow:auto;flex:1 1 auto;}'
    + '.jsq-item{padding:9px 12px;border-radius:6px;cursor:pointer;}'
    + '.jsq-item[aria-selected="true"]{background:#eef2ff;}'
    + '.jsq-title{font-weight:600;font-size:15px;}'
    + '.jsq-snip{color:#57606a;font-size:13px;margin-top:2px;overflow:hidden;'
    + 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}'
    + '.jsq-empty{padding:16px;color:#57606a;font-size:14px;}'
    + '.jsq-foot{padding:8px 12px;border-top:1px solid #eee;color:#8b949e;font-size:12px;'
    + 'display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;}'
    + '.jsq-btn{position:fixed;right:16px;bottom:16px;z-index:9997;border:1px solid #d0d7de;'
    + 'background:#fff;color:#57606a;border-radius:999px;padding:7px 13px;font-size:13px;'
    + 'cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.12);}'
    + 'mark.jsq-hit{background:#fff3b0;color:inherit;padding:0 1px;border-radius:2px;}'
    + 'body.jsq-arrive mark.jsq-hit{outline:2px solid #f0c000;outline-offset:2px;}'
    + '@media (max-width:640px){.jsq-back{padding:0;}.jsq-panel{max-width:100%;height:100vh;max-height:100vh;'
    + 'border-radius:0;}.jsq-btn{bottom:12px;right:12px;}}';

  function injectCss() {
    if (document.getElementById('jsq-style')) { return; }
    var style = document.createElement('style');
    style.id = 'jsq-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function ensureIndex() {
    if (state.items) { return Promise.resolve(state.items); }
    if (!state.pending) {
      state.pending = fetch(INDEX_URL, { credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) { throw new Error('search.json HTTP ' + r.status); }
          return r.json();
        })
        .then(function (data) {
          state.items = Array.isArray(data) ? data.filter(function (x) {
            return x && x.url && (x.title || x.text);
          }) : [];
          return state.items;
        })
        .catch(function (err) {
          state.pending = null;
          throw err;
        });
    }
    return state.pending;
  }

  function countOcc(hay, needle) {
    var n = 0;
    var i = hay.indexOf(needle);
    while (i !== -1) {
      n++;
      i = hay.indexOf(needle, i + needle.length);
    }
    return n;
  }

  function search(query) {
    var terms = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!terms.length || !state.items) { return []; }
    var out = [];
    state.items.forEach(function (item) {
      var title = String(item.title || '').toLowerCase();
      var text = String(item.text || '').toLowerCase();
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var term = terms[i];
        var inTitle = title.indexOf(term);
        var inText = text.indexOf(term);
        if (inTitle === -1 && inText === -1) { return; }
        if (inTitle !== -1) { score += 100 - Math.min(50, inTitle); }
        if (inText !== -1) { score += Math.min(60, countOcc(text, term) * 4); }
        if (item.url === '/' && inText !== -1) { score += 5; }
      }
      out.push({ item: item, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 12);
  }

  function snippetOf(text, terms) {
    var plain = String(text || '').replace(/\s+/g, ' ');
    var low = plain.toLowerCase();
    var best = -1;
    terms.forEach(function (t) {
      var i = low.indexOf(t);
      if (i !== -1 && (best === -1 || i < best)) { best = i; }
    });
    if (best === -1) { return plain.slice(0, 100); }
    var start = Math.max(0, best - 40);
    var end = Math.min(plain.length, best + 110);
    return (start > 0 ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : '');
  }

  function appendHighlighted(parent, text, terms) {
    var low = text.toLowerCase();
    var pos = 0;
    while (pos < text.length) {
      var bestIdx = -1;
      var bestLen = 0;
      terms.forEach(function (t) {
        var i = low.indexOf(t, pos);
        if (i !== -1 && (bestIdx === -1 || i < bestIdx)) {
          bestIdx = i;
          bestLen = t.length;
        }
      });
      if (bestIdx === -1) {
        parent.appendChild(document.createTextNode(text.slice(pos)));
        return;
      }
      if (bestIdx > pos) { parent.appendChild(document.createTextNode(text.slice(pos, bestIdx))); }
      var mark = document.createElement('mark');
      mark.textContent = text.slice(bestIdx, bestIdx + bestLen);
      parent.appendChild(mark);
      pos = bestIdx + bestLen;
    }
  }

  function makeUI() {
    var panel = document.createElement('div');
    panel.className = 'jsq-panel';

    var input = document.createElement('input');
    input.className = 'jsq-input';
    input.type = 'search';
    input.autocomplete = 'off';
    input.placeholder = '搜索全站内容（Ctrl+K）';
    input.setAttribute('aria-label', '搜索全站内容');

    var list = document.createElement('ul');
    list.className = 'jsq-list';
    list.setAttribute('role', 'listbox');

    var foot = document.createElement('div');
    foot.className = 'jsq-foot';
    var hint = document.createElement('span');
    hint.textContent = '↑↓ 选择 · Enter 跳转 · Esc 关闭';
    var count = document.createElement('span');
    count.className = 'jsq-count';
    foot.appendChild(hint);
    foot.appendChild(count);

    panel.appendChild(input);
    panel.appendChild(list);
    panel.appendChild(foot);
    return { panel: panel, input: input, list: list, count: count };
  }

  function render(ui, terms) {
    ui.list.textContent = '';
    ui.count.textContent = state.results.length ? ('共 ' + state.results.length + ' 条（取前 12）') : '';
    if (!terms.length) {
      var hintLi = document.createElement('li');
      hintLi.className = 'jsq-empty';
      hintLi.textContent = '输入关键词，中英文都可以；多个词用空格分隔。';
      ui.list.appendChild(hintLi);
      return;
    }
    if (!state.results.length) {
      var emptyLi = document.createElement('li');
      emptyLi.className = 'jsq-empty';
      emptyLi.textContent = '没有匹配。试试更短的词，或者只保留一个关键词。';
      ui.list.appendChild(emptyLi);
      return;
    }
    state.results.forEach(function (hit, idx) {
      var li = document.createElement('li');
      li.className = 'jsq-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', idx === state.active ? 'true' : 'false');
      var title = document.createElement('div');
      title.className = 'jsq-title';
      appendHighlighted(title, hit.item.title || hit.item.url, terms);
      var snip = document.createElement('div');
      snip.className = 'jsq-snip';
      appendHighlighted(snip, snippetOf(hit.item.text, terms), terms);
      li.appendChild(title);
      li.appendChild(snip);
      li.addEventListener('mousedown', function (e) {
        e.preventDefault();
        go(hit.item.url, ui.input.value);
      });
      ui.list.appendChild(li);
    });
    var active = ui.list.children[state.active];
    if (active && active.scrollIntoView) { active.scrollIntoView({ block: 'nearest' }); }
  }

  function go(url, query) {
    try { sessionStorage.setItem(STORE_KEY, query); } catch (e) { /* 隐私模式下忽略 */ }
    window.location.href = url;
  }

  function run(ui) {
    var query = ui.input.value;
    var terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    state.results = state.items ? search(query) : [];
    state.active = state.results.length ? 0 : -1;
    render(ui, terms);
  }

  function bind(ui, opts) {
    var timer = null;

    ui.input.addEventListener('compositionstart', function () { state.composing = true; });
    ui.input.addEventListener('compositionend', function () {
      state.composing = false;
      run(ui);
    });
    ui.input.addEventListener('input', function () {
      if (state.composing) { return; }
      clearTimeout(timer);
      timer = setTimeout(function () { run(ui); }, 90);
    });
    ui.input.addEventListener('keydown', function (e) {
      if (state.composing) { return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!state.results.length) { return; }
        var step = e.key === 'ArrowDown' ? 1 : -1;
        state.active = (state.active + step + state.results.length) % state.results.length;
        render(ui, ui.input.value.toLowerCase().trim().split(/\s+/).filter(Boolean));
      } else if (e.key === 'Enter') {
        if (state.active >= 0 && state.results[state.active]) {
          e.preventDefault();
          go(state.results[state.active].item.url, ui.input.value);
        }
      } else if (e.key === 'Escape' && opts.close) {
        e.preventDefault();
        opts.close();
      }
    });

    if (opts.focus) {
      setTimeout(function () { ui.input.focus(); }, 30);
    }
  }

  function openOverlay() {
    if (state.overlay) { return; }
    injectCss();
    var ui = makeUI();
    var back = document.createElement('div');
    back.className = 'jsq-back';
    back.appendChild(ui.panel);
    back.addEventListener('mousedown', function (e) {
      if (e.target === back) { closeOverlay(); }
    });
    document.body.appendChild(back);
    state.overlay = back;
    state.ui = ui;
    bind(ui, { close: closeOverlay, focus: true });
    render(ui, []);
    ensureIndex().then(function () {
      if (ui.input.value.trim()) { run(ui); }
    }).catch(function () {
      ui.count.textContent = '索引加载失败：稍后刷新再试';
    });
  }

  function closeOverlay() {
    if (!state.overlay) { return; }
    state.overlay.parentNode.removeChild(state.overlay);
    state.overlay = null;
    state.ui = null;
    state.results = [];
    state.active = -1;
  }

  function inline() {
    var host = document.getElementById('jsq-inline');
    if (!host) { return false; }
    injectCss();
    var ui = makeUI();
    ui.panel.style.maxHeight = 'none';
    host.appendChild(ui.panel);
    bind(ui, { close: null, focus: true });
    render(ui, []);
    ensureIndex().then(function () {
      if (ui.input.value.trim()) { run(ui); }
    }).catch(function () {
      ui.count.textContent = '索引加载失败：稍后刷新再试';
      var li = document.createElement('li');
      li.className = 'jsq-empty';
      li.textContent = '无法加载 /search.json。';
      ui.list.appendChild(li);
    });
    return true;
  }

  function hotkeys() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      var typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (state.overlay) { closeOverlay(); } else { openOverlay(); }
        return;
      }
      if (e.key === '/' && !typing && !state.overlay) {
        e.preventDefault();
        openOverlay();
        return;
      }
      if (e.key === 'Escape' && state.overlay) { closeOverlay(); }
    });
  }

  function arrive() {
    var query;
    try { query = sessionStorage.getItem(STORE_KEY); } catch (e) { return; }
    if (!query) { return; }
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    if (/^\/search\/?$/.test(window.location.pathname)) { return; }
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { return; }
    var tries = 0;
    function attempt() {
      if (markFirst(terms) || tries >= 8) { return; }
      tries++;
      setTimeout(attempt, 120);
    }
    setTimeout(attempt, 60);
  }

  function markFirst(terms) {
    if (!document.body || !document.createTreeWalker) { return true; }
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentNode;
        if (!parent) { return NodeFilter.FILTER_REJECT; }
        var name = parent.nodeName;
        if (name === 'SCRIPT' || name === 'STYLE' || name === 'MARK' || name === 'INPUT' ||
            name === 'TEXTAREA' || name === 'NOSCRIPT') { return NodeFilter.FILTER_REJECT; }
        var value = node.nodeValue;
        if (!value || !value.trim()) { return NodeFilter.FILTER_REJECT; }
        var low = value.toLowerCase();
        for (var i = 0; i < terms.length; i++) {
          if (low.indexOf(terms[i]) !== -1) { return NodeFilter.FILTER_ACCEPT; }
        }
        return NodeFilter.FILTER_REJECT;
      }
    });
    var node = walker.nextNode();
    if (!node) { return false; }
    var text = node.nodeValue;
    var low = text.toLowerCase();
    var at = -1;
    var len = 0;
    terms.forEach(function (t) {
      var i = low.indexOf(t);
      if (i !== -1 && (at === -1 || i < at)) { at = i; len = t.length; }
    });
    if (at === -1) { return false; }
    var range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + len);
    var mark = document.createElement('mark');
    mark.className = 'jsq-hit';
    try {
      range.surroundContents(mark);
    } catch (e) {
      return true;
    }
    if (mark.scrollIntoView) { mark.scrollIntoView({ block: 'center' }); }
    document.body.classList.add('jsq-arrive');
    setTimeout(function () { document.body.classList.remove('jsq-arrive'); }, 1600);
    return true;
  }

  function floatingButton() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jsq-btn';
    btn.textContent = '搜索 Ctrl+K';
    btn.addEventListener('click', openOverlay);
    document.body.appendChild(btn);
  }

  function init() {
    var isInline = inline();
    hotkeys();
    if (!isInline) { floatingButton(); }
    arrive();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
