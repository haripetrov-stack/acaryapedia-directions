/* Acaryapedia, direction 7 "Reading". Progressive enhancement only:
   without this file every verse and every layer is on the page, in one column. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage may be blocked */ } }
  };
  var dark = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

  /* ---------- appearance: night and text size ---------- */
  function isNight() {
    var t = root.dataset.theme;
    return t === 'dark' || (t !== 'light' && !!(dark && dark.matches));
  }
  function syncAppearance() {
    var btn = $('#theme-btn');
    if (btn) btn.setAttribute('aria-pressed', isNight() ? 'true' : 'false');
    var theme = root.dataset.theme || 'auto';
    $$('input[name="theme"]').forEach(function (i) { i.checked = i.value === theme; });
    var size = root.dataset.size || 'm';
    $$('input[name="size"]').forEach(function (i) { i.checked = i.value === size; });
  }
  function setTheme(t) {
    if (t === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = t;
    store.set('acp.theme', t);
    syncAppearance();
  }
  function setSize(s) {
    root.dataset.size = s;
    store.set('acp.size', s);
    syncAppearance();
  }
  var themeBtn = $('#theme-btn');
  if (themeBtn) themeBtn.addEventListener('click', function () { setTheme(isNight() ? 'light' : 'dark'); });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'theme') setTheme(t.value);
    else if (t.name === 'size') setSize(t.value);
  });
  if (dark && dark.addEventListener) dark.addEventListener('change', syncAppearance);
  syncAppearance();

  /* ---------- which forms of the verse show on the face ---------- */
  var LAYERS = [['beng', 'Bengali script'], ['iast', 'IAST transliteration'], ['deva', 'Devanagari, converted from IAST by script']];
  function getLayers() { return (root.dataset.layers || 'beng iast').split(' ').filter(Boolean); }
  function setLayers(list) {
    root.dataset.layers = list.join(' ');
    store.set('acp.layers', root.dataset.layers);
  }
  $$('[data-layerbox]').forEach(function (box) {
    var fs = document.createElement('fieldset');
    fs.className = 'layerbox';
    var lg = document.createElement('legend');
    lg.textContent = 'Show on the verse';
    fs.appendChild(lg);
    LAYERS.forEach(function (l) {
      var lab = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = l[0];
      cb.setAttribute('data-layer-toggle', '');
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(l[1]));
      fs.appendChild(lab);
    });
    box.appendChild(fs);
  });
  function syncLayerBoxes() {
    var on = getLayers();
    $$('[data-layer-toggle]').forEach(function (cb) { cb.checked = on.indexOf(cb.value) > -1; });
  }
  document.addEventListener('change', function (e) {
    var cb = e.target;
    if (!cb.hasAttribute || !cb.hasAttribute('data-layer-toggle')) return;
    var list = getLayers().filter(function (n) { return n !== cb.value; });
    if (cb.checked) list.push(cb.value);
    if (!list.length) { cb.checked = true; return; }
    setLayers(list);
    syncLayerBoxes();
  });
  syncLayerBoxes();

  /* ---------- sheets: one at a time, from below ---------- */
  var sheetOpen = null;
  var opener = null;
  var pushed = false;
  var scrim = $('.scrim');

  function focusables(sheet) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex="0"]', sheet)
      .filter(function (el) { return el.offsetParent !== null; });
  }
  var GLOBAL = { aa: 'sheet-aa', find: 'sheet-find' };
  function sheetId(layer) { return GLOBAL[layer] || 'v' + curNum() + '-' + layer; }
  function syncDock() {
    $$('[data-open]').forEach(function (b) {
      var target = sheetId(b.getAttribute('data-open'));
      b.setAttribute('aria-controls', target);
      b.setAttribute('aria-expanded', sheetOpen && sheetOpen.id === target ? 'true' : 'false');
    });
  }
  function openSheet(sheet, trigger) {
    if (!sheet) return;
    if (sheetOpen && sheetOpen !== sheet) closeSheet(true);
    sheet.classList.add('is-open');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    root.classList.add('sheet-open');
    sheetOpen = sheet;
    opener = trigger || document.activeElement;
    var body = $('.sheet-body', sheet);
    if (body) body.scrollTop = 0;
    var field = $('input[type="search"]', sheet);
    var h = $('h3', sheet);
    if (field) field.focus();
    else if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    try { history.pushState({ sheet: sheet.id }, '', location.href); pushed = true; } catch (e) { pushed = false; }
    syncDock();
  }
  function closeSheet(viaHistory) {
    if (!sheetOpen) return;
    var sheet = sheetOpen;
    sheet.classList.remove('is-open');
    sheet.removeAttribute('role');
    sheet.removeAttribute('aria-modal');
    root.classList.remove('sheet-open');
    sheetOpen = null;
    var back = opener;
    if (back && back.focus) back.focus({ preventScroll: true });
    opener = null;
    if (pushed) {
      pushed = false;
      if (!viaHistory) {
        refocus = back;
        try { history.back(); } catch (e) { refocus = null; }
      }
    }
    syncDock();
  }
  var refocus = null;
  window.addEventListener('popstate', function () {
    if (sheetOpen) closeSheet(true);
    if (refocus) {
      var el = refocus;
      refocus = null;
      /* the browser blurs the page after a history step, so give focus back once it has settled */
      window.setTimeout(function () { el.focus({ preventScroll: true }); }, 0);
    }
  });
  if (scrim) scrim.addEventListener('click', function () { closeSheet(false); });

  document.addEventListener('click', function (e) {
    var close = e.target.closest('.close');
    if (close) { closeSheet(false); return; }
    var trig = e.target.closest('[data-open]');
    if (!trig) return;
    if (trig.tagName === 'A') e.preventDefault();
    var sheet = document.getElementById(sheetId(trig.getAttribute('data-open')));
    if (sheetOpen && sheetOpen === sheet) closeSheet(false); else openSheet(sheet, trig);
  });

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      var find = $('details.find[open]');
      if (sheetOpen) { closeSheet(false); e.preventDefault(); return; }
      if (find) { find.open = false; $('summary', find).focus(); e.preventDefault(); }
      return;
    }
    if (sheetOpen && e.key === 'Tab') {
      var f = focusables(sheetOpen);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheetOpen.querySelector('h3'))) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      return;
    }
    if (sheetOpen || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (!verses.length) return;
    if (e.key === 'ArrowRight') show(curNum() + 1, 'next');
    else if (e.key === 'ArrowLeft') show(curNum() - 1, 'prev');
  });

  /* commentaries: first one open, the rest folded, so the sheet reads as a list */
  $$('.sheet[data-layer="comm"]').forEach(function (s) {
    $$('details.com', s).forEach(function (d, i) { if (i > 0) d.open = false; });
  });

  /* ---------- one verse at a time ---------- */
  var verses = $$('.verse');
  var N = verses.length;
  var ticks = $$('.ticks ol a');
  var live = $('#live');
  function curNum() {
    var c = parseInt(root.dataset.cur, 10);
    return c >= 1 && c <= N ? c : 1;
  }
  function paintTicks() {
    var cur = curNum();
    ticks.forEach(function (a, i) {
      a.classList.toggle('read', i + 1 <= cur);
      if (i + 1 === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    var prev = $('.step.prev'), next = $('.step.next');
    if (prev) prev.disabled = cur <= 1;
    if (next) next.disabled = cur >= N;
  }
  function updateDock(n) {
    var v = document.getElementById('v' + n);
    if (!v) return;
    var c = $('[data-dm="comm"]'), pl = $('[data-dm="prab"]');
    if (c) c.textContent = v.dataset.comm + ' texts';
    if (pl) pl.textContent = parseInt(v.dataset.places, 10) > 0 ? v.dataset.places + ' places' : 'translation';
  }
  function show(n, dir, quiet) {
    if (!N) return;
    n = Math.max(1, Math.min(N, n));
    if (n === curNum() && root.dataset.cur) { if (!quiet) return; }
    closeSheet(true);
    root.dataset.cur = String(n);
    paintTicks();
    updateDock(n);
    syncDock();
    document.title = 'Upadeśāmṛta, text ' + n + ' | Acaryapedia';
    if (live) live.textContent = 'Text ' + n + ' of ' + N;
    store.set('acp.last', String(n));
    if (!quiet) {
      try { history.replaceState(null, '', '#v' + n); } catch (e) { /* file: pages may refuse */ }
      window.scrollTo(0, 0);
      var v = document.getElementById('v' + n);
      if (v && dir) {
        v.classList.remove('enter-next', 'enter-prev');
        void v.offsetWidth;
        v.classList.add(dir === 'next' ? 'enter-next' : 'enter-prev');
      }
    }
  }
  if (N) {
    var m = /^#v(\d+)$/.exec(location.hash);
    var start = m ? parseInt(m[1], 10) : 1;
    show(start >= 1 && start <= N ? start : 1, null, true);
    /* a deep link such as #v9 should open the page from its top, not scrolled to the verse */
    if (location.hash) window.scrollTo(0, 0);
    window.addEventListener('load', function () { if (/^#v\d+$/.test(location.hash)) window.scrollTo(0, 0); });
    window.addEventListener('hashchange', function () {
      var h = /^#v(\d+)$/.exec(location.hash);
      if (h) { var n = parseInt(h[1], 10); show(n, n > curNum() ? 'next' : 'prev'); }
    });
    var prevBtn = $('.step.prev'), nextBtn = $('.step.next');
    if (prevBtn) prevBtn.addEventListener('click', function () { show(curNum() - 1, 'prev'); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(curNum() + 1, 'next'); });

    var area = $('.verses');
    var sx = 0, sy = 0, t0 = 0, tracking = false;
    area.addEventListener('touchstart', function (e) {
      if (sheetOpen || e.touches.length !== 1) { tracking = false; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now(); tracking = true;
    }, { passive: true });
    area.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 56 && Math.abs(dx) > 1.6 * Math.abs(dy) && Date.now() - t0 < 700) {
        show(curNum() + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
      }
    }, { passive: true });
  }

  /* ---------- home: the search icon scrolls to the field and focuses it ---------- */
  $$('a.findlink[href="#search"]').forEach(function (a) {
    a.addEventListener('click', function () {
      var f = $('#q-main');
      if (f) window.setTimeout(function () { f.focus({ preventScroll: true }); }, 0);
    });
  });

  /* ---------- copy the citation ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    var src = document.getElementById(b.getAttribute('data-copy'));
    var msg = b.parentNode.querySelector('.copied');
    var done = function (ok) { if (msg) msg.textContent = ok ? 'Citation copied.' : 'Select the citation and copy it.'; };
    if (src && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(src.textContent.trim()).then(function () { done(true); }, function () { done(false); });
    } else { done(false); }
  });

  /* ---------- newsletter form: prototype, nothing is sent ---------- */
  $$('form[data-news]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = f.parentNode.querySelector('.msg');
      if (msg) msg.textContent = 'Thank you. This is a prototype, so nothing was sent.';
      f.reset();
    });
  });

  /* ---------- home: verse of the day, chosen by the date ---------- */
  var data = $('#votd-data');
  if (data) {
    var list = [];
    try { list = JSON.parse(data.textContent); } catch (e) { list = []; }
    var now = new Date();
    var doy = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 864e5);
    var pick = list.length ? list[(doy - 1) % list.length] : null;
    var fillLines = function (el, lines) {
      el.textContent = '';
      el.classList.toggle('plain', lines.length !== 4);
      lines.forEach(function (t) { var s = document.createElement('span'); s.className = 'pada'; s.textContent = t; el.appendChild(s); });
    };
    if (pick) {
      fillLines($('#votd-beng'), pick.beng);
      fillLines($('#votd-iast'), pick.iast);
      $('#votd-where').textContent = 'Text ' + pick.n;
      var open = $('#votd-open');
      open.href = 'verse.html#v' + pick.n;
      open.textContent = 'Open text ' + pick.n;
      var t = $('#votd-date');
      t.dateTime = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
      t.textContent = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    }
    var last = parseInt(store.get('acp.last'), 10);
    var cont = $('#continue');
    if (cont && last > 1 && last <= list.length) {
      cont.href = 'verse.html#v' + last;
      cont.textContent = 'Continue with text ' + last;
      cont.hidden = false;
    }
  }
})();
