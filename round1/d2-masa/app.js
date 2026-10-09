/* Study Desk: progressive enhancement only. Everything on the pages is readable without this file. */
(function () {
  'use strict';
  var root = document.documentElement;
  var desk = document.getElementById('desk');
  var wide = window.matchMedia('(min-width:1100px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var PANES = ['original', 'translations', 'commentaries', 'connections'];

  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage may be blocked */ } }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- toast (used for the prototype notices) ---------- */
  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 5200);
  }

  /* ---------- search forms: no results page in this round ---------- */
  $$('form[role="search"]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (f.querySelector('input[type="search"]') || {}).value || '';
      toast(q ? 'Search results are a screen of round 2. You searched for: ' + q : 'Type a word or a verse line to search.');
    });
  });

  /* ---------- newsletter (form only, nothing is sent) ---------- */
  var news = $('.news');
  if (news) {
    news.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', news);
      var input = $('input[type="email"]', news);
      if (!input.checkValidity()) { input.reportValidity(); return; }
      msg.textContent = 'Thank you. This is a prototype, so nothing was sent.';
    });
  }

  /* ---------- copy buttons ---------- */
  $$('[data-copy]').forEach(function (b) {
    var label = b.textContent;
    b.addEventListener('click', function () {
      var src = $(b.getAttribute('data-copy'));
      if (!src) { return; }
      var text = src.tagName === 'A' ? src.href : src.textContent.trim();
      function done() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = label; }, 1600); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  });
  function fallbackCopy(text) {
    var t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) { /* nothing else to try */ }
    document.body.removeChild(t);
  }

  /* ---------- cite popover: Escape or an outside click closes it ---------- */
  var citeBtn = $('.cite-btn');
  var citePop = $('#cite-pop');
  if (citeBtn && citePop) {
    var setCite = function (open) {
      citePop.classList.toggle('is-open', open);
      citeBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    citeBtn.addEventListener('click', function (e) { e.stopPropagation(); setCite(!citePop.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && citePop.classList.contains('is-open')) { setCite(false); citeBtn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (citePop.classList.contains('is-open') && !citePop.contains(e.target)) { setCite(false); }
    });
  }

  /* ---------- home page: pick a text, the Connections sheet follows ---------- */
  var spread = $('.spread');
  if (spread) {
    var rows = $$('tbody tr[data-n]', spread);
    var cviews = $$('.cv');
    var narrow = window.matchMedia('(max-width:899px)');
    var pickText = function (n, scroll) {
      rows.forEach(function (r) {
        var on = r.getAttribute('data-n') === String(n);
        r.classList.toggle('is-sel', on);
        $('a.pick', r).setAttribute('aria-current', on ? 'true' : 'false');
      });
      cviews.forEach(function (v) { v.hidden = v.getAttribute('data-n') !== String(n); });
      var body = $('#connections .pane-b');
      if (body) { body.scrollTop = 0; }
      if (scroll && narrow.matches) {
        $('#connections').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
      }
    };
    spread.addEventListener('click', function (e) {
      var tr = e.target.closest('tbody tr[data-n]');
      if (!tr) { return; }
      e.preventDefault();
      pickText(tr.getAttribute('data-n'), true);
    });
    $$('.cv .chips a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var cv = a.closest('.cv');
        var id = a.getAttribute('data-filter');
        $$('[data-grp]', cv).forEach(function (g) { g.hidden = id !== 'all' && g.id !== id; });
        $$('.chips a', cv).forEach(function (c) { c.setAttribute('aria-current', c === a ? 'true' : 'false'); });
      });
    });
    $$('.cv a[href="#"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); }); });
  }

  if (!desk) { return; }

  /* ---------- script and IAST layers ---------- */
  function setScript(s) {
    root.setAttribute('data-script', s);
    save('acp-script', s);
    $$('button[data-script]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-script') === s ? 'true' : 'false'); });
  }
  $$('button[data-script]').forEach(function (b) {
    b.addEventListener('click', function () { setScript(b.getAttribute('data-script')); });
  });
  setScript(root.getAttribute('data-script') === 'deva' ? 'deva' : 'beng');
  var iastBtn = $('button[data-iast]');
  function setIast(on) {
    if (on) { root.removeAttribute('data-iast'); } else { root.setAttribute('data-iast', 'off'); }
    save('acp-iast', on ? '1' : '0');
    if (iastBtn) { iastBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }
  if (iastBtn) {
    iastBtn.addEventListener('click', function () { setIast(iastBtn.getAttribute('aria-pressed') !== 'true'); });
    setIast(root.getAttribute('data-iast') !== 'off');
  }

  /* ---------- columns (wide) and views (narrow) ---------- */
  var texts = null;
  var state = { on: { original: true, translations: true, commentaries: true, connections: true }, view: 'original' };
  var verse = $('#verse');
  var connPane = $('#connections');

  function apply(opts) {
    var btns = $$('.views button[data-pane]');
    if (wide.matches) {
      PANES.forEach(function (p) { desk.classList.toggle('off-' + p, !state.on[p]); });
      btns.forEach(function (b) { b.setAttribute('aria-pressed', state.on[b.getAttribute('data-pane')] ? 'true' : 'false'); });
      $$('.pane-b').forEach(function (n) { n.setAttribute('tabindex', '0'); });
    } else {
      PANES.forEach(function (p) { desk.classList.remove('off-' + p); });
      desk.setAttribute('data-view', state.view);
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pane') === state.view ? 'true' : 'false'); });
      $$('.pane-b').forEach(function (n) { n.removeAttribute('tabindex'); });
    }
    var connOpen = wide.matches ? state.on.connections : state.view === 'connections';
    if (verse) { verse.classList.toggle('is-selected', wide.matches ? state.on.connections : true); }
    $$('[data-open-conn]').forEach(function (b) { b.setAttribute('aria-expanded', connOpen ? 'true' : 'false'); });
    if (opts && opts.animate && connOpen && connPane && !reduce.matches) {
      connPane.classList.remove('is-opening');
      void connPane.offsetWidth;
      connPane.classList.add('is-opening');
    }
    if (typeof measure === 'function' && texts) { requestAnimationFrame(measure); }
  }

  function showPane(name, opts) {
    if (wide.matches) { state.on[name] = true; } else { state.view = name; }
    apply(opts);
  }
  function toggleOrSwitch(name) {
    if (wide.matches) {
      var count = PANES.filter(function (p) { return state.on[p]; }).length;
      if (state.on[name] && count === 1) { return; }
      state.on[name] = !state.on[name];
      apply({ animate: name === 'connections' });
    } else {
      state.view = name;
      apply();
      var views = $('.views');
      var top = desk.getBoundingClientRect().top + window.pageYOffset - (views ? views.offsetHeight : 0);
      if (window.pageYOffset > top) { window.scrollTo(0, top); }
    }
  }
  $$('.views button[data-pane]').forEach(function (b) {
    b.addEventListener('click', function () { toggleOrSwitch(b.getAttribute('data-pane')); });
  });
  wide.addEventListener ? wide.addEventListener('change', function () { apply(); }) : wide.addListener(function () { apply(); });

  $$('[data-open-conn]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      showPane('connections', { animate: true });
      var h = $('#h-conn');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: !wide.matches ? false : true }); }
    });
  });
  var closeBtn = $('[data-close-conn]');
  function closeConnections() {
    if (!wide.matches) { return; }
    state.on.connections = false;
    apply();
    var opener = $('[data-open-conn]');
    if (opener) { opener.focus(); }
  }
  if (closeBtn) { closeBtn.addEventListener('click', closeConnections); }
  if (connPane) {
    connPane.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeConnections(); } });
  }
  if (verse) {
    verse.addEventListener('click', function () {
      if (!wide.matches) { return; }
      var sel = window.getSelection && window.getSelection().toString();
      if (sel) { return; }
      state.on.connections = !state.on.connections;
      apply({ animate: true });
    });
  }

  /* ---------- filter chips in the connections sheet ---------- */
  var chips = $$('.chips a');
  chips.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var id = a.getAttribute('data-filter');
      $$('[data-grp]', connPane).forEach(function (g) { g.hidden = id !== 'all' && g.id !== id; });
      chips.forEach(function (c) { c.setAttribute('aria-current', c === a ? 'true' : 'false'); });
      var body = $('.pane-b', connPane);
      if (body) { body.scrollTop = 0; }
    });
  });

  /* ---------- jump to a record from anywhere on the desk ---------- */
  function flash(el) {
    el.classList.remove('is-hit');
    void el.offsetWidth;
    el.classList.add('is-hit');
    setTimeout(function () { el.classList.remove('is-hit'); }, 2100);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-filter')) { return; }
    var id = a.getAttribute('href').slice(1);
    if (!id) { return; }
    var target = document.getElementById(id);
    if (!target || !desk.contains(target)) { return; }
    e.preventDefault();
    var pane = target.closest('.pane');
    if (pane) {
      var name = pane.id;
      if (PANES.indexOf(name) > -1) { showPane(name); }
    }
    if (target.tagName === 'DETAILS') { target.open = true; }
    var body = pane && $('.pane-b', pane);
    var behavior = reduce.matches ? 'auto' : 'smooth';
    if (wide.matches && body && body.contains(target) && target !== pane) {
      var delta = target.getBoundingClientRect().top - body.getBoundingClientRect().top;
      body.scrollTo({ top: body.scrollTop + delta - 8, behavior: behavior });
    } else {
      target.scrollIntoView({ behavior: behavior, block: 'start' });
    }
    if (target !== pane) { flash(target); }
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- long commentaries: short by default, full on request ---------- */
  texts = $$('.ctext[data-clamp]');
  texts.forEach(function (t, i) {
    t.id = t.id || 'ct' + i;
    t.classList.add('is-clamped');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'more'; b.textContent = 'Read in full';
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', t.id);
    t.parentNode.insertBefore(b, t.nextSibling);
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      t.classList.toggle('is-clamped', open);
      b.setAttribute('aria-expanded', open ? 'false' : 'true');
      b.textContent = open ? 'Read in full' : 'Show less';
      syncExpandAll();
    });
  });
  function measure() {
    texts.forEach(function (t) {
      var b = t.nextSibling;
      if (!b || b.className !== 'more') { return; }
      if (t.getClientRects().length === 0) { return; }
      var expanded = b.getAttribute('aria-expanded') === 'true';
      if (expanded) { return; }
      t.classList.add('is-clamped');
      var overflow = t.scrollHeight - t.clientHeight > 8;
      if (!overflow) { t.classList.remove('is-clamped'); }
      b.hidden = !overflow;
    });
  }
  var expandAll = $('[data-expand]');
  function syncExpandAll() {
    if (!expandAll) { return; }
    var more = $$('.more').filter(function (b) { return !b.hidden; });
    var allOpen = more.length > 0 && more.every(function (b) { return b.getAttribute('aria-expanded') === 'true'; });
    expandAll.textContent = allOpen ? 'Collapse all' : 'Expand all';
  }
  if (expandAll) {
    expandAll.addEventListener('click', function () {
      var more = $$('.more').filter(function (b) { return !b.hidden; });
      var allOpen = more.every(function (b) { return b.getAttribute('aria-expanded') === 'true'; });
      more.forEach(function (b) { if ((b.getAttribute('aria-expanded') === 'true') === allOpen) { b.click(); } });
    });
  }
  measure();
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(measure); }
  window.addEventListener('load', measure);
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(measure, 150); });

  apply();
})();
