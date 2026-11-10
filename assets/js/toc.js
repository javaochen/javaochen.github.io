/* 右侧目录（TOC）：抓取正文 h1–h3，生成固定侧边栏，点击跳转、滚动高亮。
 *
 * 只读页面结构，不改文档；由 _includes/head-custom.html 引入。
 * 窄屏（<1300px）自动隐藏；可收录的标题少于 2 个时不显示。
 * 站点标题（primer 布局里链接到首页的那个 h1）会被跳过。
 */
(function () {
  'use strict';

  var CONTENT = '.markdown-body';
  var HEADINGS = 'h1, h2, h3';
  var MIN_ITEMS = 2;
  var WIDTH = 250;
  var BREAKPOINT = 1300;
  var OFFSET = 90;

  var CSS = ''
    + '.toc-side{position:fixed;top:0;right:0;bottom:0;width:' + WIDTH + 'px;'
    + 'box-sizing:border-box;overflow-y:auto;padding:24px 14px 24px 6px;'
    + 'border-left:1px solid #e1e4e8;background:#fff;font-size:13px;line-height:1.55;'
    + 'z-index:100;color:#57606a;}'
    + '.toc-side-title{font-weight:600;font-size:11px;letter-spacing:.05em;'
    + 'text-transform:uppercase;color:#8b949e;margin:0 8px 8px;}'
    + '.toc-side ul{list-style:none;margin:0;padding:0;}'
    + '.toc-side li{margin:0;}'
    + '.toc-side a{display:block;padding:3px 8px;border-left:2px solid transparent;'
    + 'border-radius:0 3px 3px 0;color:#57606a;text-decoration:none;'
    + 'overflow-wrap:anywhere;}'
    + '.toc-side a:hover{color:#0969da;background:#f6f8fa;}'
    + '.toc-side a.toc-active{color:#0969da;background:#ddf4ff;'
    + 'border-left-color:#0969da;font-weight:600;}'
    + '.toc-side a.toc-h1{font-weight:600;color:#1f2328;}'
    + '.toc-side a.toc-h2{padding-left:16px;}'
    + '.toc-side a.toc-h3{padding-left:32px;}'
    + '@media (max-width:' + (BREAKPOINT - 1) + 'px){.toc-side{display:none;}}'
    + '@media (min-width:' + BREAKPOINT + 'px){body.toc-on{padding-right:' + WIDTH + 'px;}}';

  function injectCss() {
    if (document.getElementById('toc-style')) { return; }
    var style = document.createElement('style');
    style.id = 'toc-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function isSiteTitle(h) {
    if (h.tagName !== 'H1') { return false; }
    var a = h.querySelector('a');
    if (!a) { return false; }
    var href = a.getAttribute('href') || '';
    return href === '/' || /^https?:\/\/[^\/]+\/?$/.test(href);
  }

  function collect() {
    var content = document.querySelector(CONTENT);
    if (!content) { return []; }
    var nodes = content.querySelectorAll(HEADINGS);
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var h = nodes[i];
      if (isSiteTitle(h)) { continue; }
      var id = h.id;
      if (!id) {
        id = 'toc-' + out.length;
        h.id = id;
      }
      out.push({
        el: h,
        id: id,
        level: h.tagName.charAt(1),
        text: h.textContent.replace(/\s+/g, ' ').trim()
      });
    }
    return out;
  }

  var items = [];
  var links = {};
  var currentId = null;

  function setActive(id) {
    if (id === currentId) { return; }
    if (currentId && links[currentId]) { links[currentId].classList.remove('toc-active'); }
    currentId = id;
    if (id && links[id]) { links[id].classList.add('toc-active'); }
  }

  function updateActive() {
    var active = null;
    for (var i = 0; i < items.length; i++) {
      var rect = items[i].el.getBoundingClientRect();
      if (rect.top <= OFFSET) { active = items[i]; } else { break; }
    }
    if (!active) { active = items[0]; }
    if (active) { setActive(active.id); }
  }

  function onScroll() {
    if (onScroll.ticking) { return; }
    onScroll.ticking = true;
    window.requestAnimationFrame(function () {
      updateActive();
      onScroll.ticking = false;
    });
  }

  function build() {
    injectCss();
    var nav = document.createElement('nav');
    nav.className = 'toc-side';
    nav.setAttribute('aria-label', '页面目录');

    var title = document.createElement('div');
    title.className = 'toc-side-title';
    title.textContent = '目录';
    nav.appendChild(title);

    var ul = document.createElement('ul');
    items.forEach(function (item) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'toc-h' + item.level;
      a.href = '#' + item.id;
      a.textContent = item.text;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = item.el;
        if (target.scrollIntoView) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (target.offsetTop !== undefined) {
          window.scrollTo(0, target.offsetTop);
        }
        try {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '#' + item.id);
          }
        } catch (err) { /* file:// 等环境忽略 */ }
        setActive(item.id);
      });
      links[item.id] = a;
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);
    document.body.appendChild(nav);
    document.body.classList.add('toc-on');
  }

  function init() {
    items = collect();
    if (items.length < MIN_ITEMS) { return; }
    build();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    var hash = window.location.hash.slice(1);
    if (hash && links[hash]) {
      setActive(hash);
    } else {
      updateActive();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
