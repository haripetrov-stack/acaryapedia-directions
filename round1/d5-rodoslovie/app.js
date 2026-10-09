/* Acaryapedia, direction 5. JavaScript only improves: the pages read complete without it.
   Part 1 runs everywhere (prototype forms, copy buttons, remembered layers, search echo).
   Part 2 runs only on index.html when motion is allowed (html.is-live): the pen, the ledger, the peak. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };

  /* ---- prototype forms: nothing is sent ---- */
  $$('form[data-proto]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = $('.form-note', f);
      if (note) note.textContent = 'Thank you. This is a prototype, so nothing was sent.';
    });
  });

  /* ---- search page: show what arrived in the address ---- */
  var echo = document.getElementById('echo');
  if (echo) {
    var q = new URLSearchParams(location.search).get('q');
    if (q) echo.textContent = 'You searched for: ' + q;
  }

  /* ---- copy buttons (verse page) ---- */
  $$('[data-copy], [data-copy-from]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy') || (document.getElementById(b.getAttribute('data-copy-from')) || {}).textContent || '';
      var label = b.textContent;
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = label; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text.trim()).then(done, function () {});
    });
  });

  /* ---- remembered layers (verse page); without this every layer is simply shown ---- */
  var toggles = $$('.layers input[type="checkbox"]');
  if (toggles.length) {
    try {
      var saved = JSON.parse(localStorage.getItem('acp-layers') || 'null');
      if (saved) toggles.forEach(function (t) { if (t.id in saved) t.checked = !!saved[t.id]; });
    } catch (e) { /* storage may be blocked: the layers stay shown */ }
    toggles.forEach(function (t) {
      t.addEventListener('change', function () {
        try {
          var s = {};
          toggles.forEach(function (x) { s[x.id] = x.checked; });
          localStorage.setItem('acp-layers', JSON.stringify(s));
        } catch (e) { /* ignore */ }
      });
    });
  }

  /* ================================================================ the line == */
  var trace = $('.trace');
  if (!trace || !doc.classList.contains('is-live')) return;

  var NODE_Y = 17;                       /* centre of a node below the top of its station, in px (see style.css) */
  var NIB_AT = 0.46;                     /* the pen sits at this height of the screen */
  var engine = window.ScrollCraft ? window.ScrollCraft.mount(document.body) : null; /* pins the peak */

  var items = $$('.station', trace).map(function (li) {
    return { el: li, path: $('.ink path', li), works: +li.getAttribute('data-works') || 0, short: li.getAttribute('data-short') || '', end: li.hasAttribute('data-end'), top: 0, h: 0, off: '', reached: null };
  });
  var hero = $('.hero');
  var lead = { path: $('.ink path', hero), off: '', start: 0, end: 1 };
  var real = items.filter(function (it) { return !it.end; });
  var nib = $('.nib', trace);
  var surface = $('.surface');
  var ledger = document.getElementById('ledger');
  var lNow = document.getElementById('l-now'), lSt = document.getElementById('l-st'), lN = document.getElementById('l-n'), lBar = document.getElementById('l-bar');
  var traceTop = 0, vh = innerHeight, current = -2, shown = 0, target = 0, counting = false, lastText = '';

  function measure() {
    vh = innerHeight;
    traceTop = trace.getBoundingClientRect().top + window.scrollY;
    items.forEach(function (it) { it.top = it.el.offsetTop; it.h = it.el.offsetHeight; });
    var heroTop = hero.getBoundingClientRect().top + window.scrollY;
    lead.start = heroTop + parseFloat(getComputedStyle(hero).paddingTop) - traceTop;   /* relative to the trace, so negative */
    lead.end = heroTop + hero.offsetHeight + NODE_Y - traceTop;
  }

  function paintCount() {
    var d = target - shown;
    if (Math.abs(d) < 0.5) shown = target; else shown += d * 0.28;
    lN.textContent = String(Math.round(shown));
    if (shown !== target) requestAnimationFrame(paintCount); else counting = false;
  }

  function updateLine() {
    var rel = window.scrollY + vh * NIB_AT - traceTop;
    var cur = -1, done = 0, k = 0;
    items.forEach(function (it, i) {
      var cy = it.top + NODE_Y;
      var reached = rel >= cy;
      if (reached !== it.reached) { it.el.classList.toggle('is-reached', reached); it.reached = reached; }
      if (reached && !it.end) { cur = k; done += it.works; }
      if (!it.end) k += 1;
      if (it.path) {
        var p = it.h > 0 ? clamp((rel - cy) / it.h, 0, 1) : 0;
        var off = (1 - p).toFixed(3);
        if (off !== it.off) { it.path.style.strokeDashoffset = off; it.off = off; }
      }
    });
    if (cur !== current) {
      var prev = real[current], now = real[cur];
      if (prev) prev.el.classList.remove('is-current');
      if (now) now.el.classList.add('is-current');
      current = cur;
      lNow.textContent = now ? now.short : 'The line starts below';
      lSt.textContent = String(cur + 1);
      lBar.style.transform = 'scaleX(' + ((cur + 1) / real.length).toFixed(4) + ')';
    }
    var lp = clamp((rel - lead.start) / Math.max(lead.end - lead.start, 1), 0, 1);
    var loff = (1 - lp).toFixed(3);
    if (loff !== lead.off) { lead.path.style.strokeDashoffset = loff; lead.off = loff; }
    target = done;
    if (!counting && shown !== target) { counting = true; requestAnimationFrame(paintCount); }
    var first = items[0].top + NODE_Y, last = items[items.length - 1].top + NODE_Y;
    nib.style.transform = 'translate3d(0,' + clamp(rel, lead.start, last).toFixed(1) + 'px,0)';
    nib.style.opacity = '1';
    var sr = surface.getBoundingClientRect();
    ledger.classList.toggle('is-on', cur >= 0 && sr.bottom > vh * 0.55);
  }

  /* ---- the peak: the whole line, every work as one tick ---- */
  var night = document.getElementById('whole');
  var ticks = night ? $$('.row__fringe i', night) : [];
  var rows = night ? $$('.row', night) : [];
  var starts = [], c = 0;
  rows.forEach(function (r) { starts.push(c); c += +r.getAttribute('data-n') || 0; });
  var tickV = ticks.map(function () { return -1; });
  var rowOn = rows.map(function () { return null; });
  var tInk = night ? $('.rt-ink', night) : null;
  var oN = document.getElementById('o-n'), oFoot = document.getElementById('o-foot');
  var oText = '', tOff = '';

  function updateNight() {
    if (!night || !ticks.length) return;
    var r = night.getBoundingClientRect();
    var travel = r.height - innerHeight;
    var p = travel > 0 ? clamp(-r.top / travel, 0, 1) : 0;
    var q = clamp((p - 0.04) / 0.8, 0, 1);
    var N = q * (ticks.length + 6);
    for (var k = 0; k < ticks.length; k++) {
      var v = clamp((N - k) / 6, 0, 1);
      if (v !== tickV[k] && (Math.abs(v - tickV[k]) > 0.02 || v === 0 || v === 1)) {
        tickV[k] = v;
        var s = ticks[k].style;
        s.transform = 'scaleY(' + (0.3 + 0.7 * v).toFixed(3) + ')';
        s.opacity = (0.35 + 0.65 * v).toFixed(2);
      }
    }
    var rowFloat = 0;
    rows.forEach(function (row, i) {
      var on = N > starts[i] + 0.2;
      if (on !== rowOn[i]) { row.classList.toggle('is-on', on); rowOn[i] = on; }
      var n = +row.getAttribute('data-n') || 1;
      if (N > starts[i]) rowFloat = i + clamp((N - starts[i]) / n, 0, 1);
    });
    var off = (1 - clamp(rowFloat / (rows.length - 1), 0, 1)).toFixed(3);
    if (tInk && off !== tOff) { tInk.style.strokeDashoffset = off; tOff = off; }
    var txt = String(Math.min(ticks.length, Math.floor(N)));
    if (txt !== oText) { oN.textContent = txt; oText = txt; }
    oFoot.classList.toggle('is-on', q >= 0.985);
  }

  var ticking = false;
  function frame() { ticking = false; updateLine(); updateNight(); }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function remeasure() { measure(); request(); }

  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', remeasure, { passive: true });
  document.addEventListener('toggle', remeasure, true);   /* opening a list of works changes the height */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  measure();
  frame();
})();
