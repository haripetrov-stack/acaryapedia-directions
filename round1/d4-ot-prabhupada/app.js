/* Acaryapedia, direction 4. Enhancement only: the page reads in full without this file.
   1. The spine: the whole page shrunk to the height of the screen as an amber thread with one knot per
      chapter. Scroll is the playhead; passed chapters keep their knot; knots are links.
   2. Title leaf: once lifted it leaves the tab order (visibility) so keyboard focus never lands on a leaf you cannot see.
   3. Cite this verse, prototype forms, search filter. */
(function () {
  'use strict';
  var doc = document, win = window;
  var rm = win.matchMedia('(prefers-reduced-motion: reduce)');
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };

  /* ---------------------------------------------------------- spine -- */
  var spine = doc.querySelector('.spine');
  var knots = [];
  var folio = doc.querySelector('.folio');
  var track, drawn, head;
  function addKnot(el, label, at, href) {
    var a = doc.createElement('a');
    a.className = 'knot';
    a.href = href;
    a.setAttribute('aria-label', label);
    a.title = label;
    var rec = { el: el, a: a, at: at, y: 0, label: label };
    a.addEventListener('click', function (e) {
      e.preventDefault();
      win.scrollTo({ top: rec.y, behavior: rm.matches ? 'auto' : 'smooth' });
      if (el.id && history.replaceState) history.replaceState(null, '', '#' + el.id);
    });
    spine.appendChild(a);
    knots.push(rec);
  }
  if (spine) {
    track = doc.createElement('div'); track.className = 'spine__track';
    drawn = doc.createElement('div'); drawn.className = 'spine__drawn';
    head = doc.createElement('div'); head.className = 'spine__head';
    spine.appendChild(track); spine.appendChild(drawn);
    Array.prototype.forEach.call(doc.querySelectorAll('[data-knot], [data-knots]'), function (el) {
      var href = '#' + (el.id || '');
      if (el.hasAttribute('data-knot')) addKnot(el, el.getAttribute('data-knot'), parseFloat(el.getAttribute('data-knot-at')) || 0, href);
      if (el.hasAttribute('data-knots')) {
        el.getAttribute('data-knots').split('|').forEach(function (part) {
          var bits = part.split('@');
          addKnot(el, bits[0], parseFloat(bits[1]) || 0, href);
        });
      }
    });
    spine.appendChild(head);
    spine.hidden = false;
  }

  var maxY = 1, vh = 1, padPx = 0, trackH = 1;
  function measure() {
    vh = win.innerHeight;
    maxY = Math.max(doc.documentElement.scrollHeight - vh, 1);
    if (!spine) return;
    padPx = track.offsetTop;
    trackH = Math.max(track.offsetHeight, 1);
    knots.forEach(function (k) {
      var r = k.el.getBoundingClientRect();
      var top = r.top + win.scrollY;
      k.y = clamp(Math.round(top + k.at * Math.max(r.height - vh, 0)), 0, maxY);
      k.a.style.top = (padPx + (k.y / maxY) * trackH) + 'px';
    });
    paint();
  }
  function paint() {
    if (!spine) return;
    var y = win.scrollY || 0;
    var f = clamp(y / maxY, 0, 1);
    drawn.style.transform = 'scaleY(' + f.toFixed(4) + ')';
    head.style.top = (padPx + f * trackH) + 'px';
    var current = null;
    knots.forEach(function (k) {
      k.a.classList.toggle('is-passed', y >= k.y - 2);
      if (y + vh * 0.35 >= k.y) current = k;
      k.a.removeAttribute('aria-current');
    });
    if (current) current.a.setAttribute('aria-current', 'location');
    if (folio) folio.textContent = current ? current.label : '';
  }

  /* ------------------------------------------------- title leaf focus -- */
  var act = doc.getElementById('book');
  var leaf = doc.getElementById('title-leaf');
  function leafState() {
    if (!act || !leaf || !act.classList.contains('sc-act--pinned') || rm.matches) return;
    var p = parseFloat(act.style.getPropertyValue('--sc-p')) || 0;
    leaf.classList.toggle('is-lifted', p > 0.43);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    win.requestAnimationFrame(function () { ticking = false; paint(); leafState(); });
  }
  win.addEventListener('scroll', onScroll, { passive: true });
  win.addEventListener('resize', function () { measure(); leafState(); });
  win.addEventListener('load', function () { measure(); leafState(); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { measure(); leafState(); });
  if (win.ResizeObserver) { new ResizeObserver(function () { measure(); }).observe(doc.body); }
  measure(); leafState();

  /* ------------------------------------------- Prabhupada side: a column on a computer, a fold on a phone -- */
  var fold = doc.querySelector('details[data-fold]');
  if (fold) {
    var wide = win.matchMedia('(min-width: 960px)');
    var sum = fold.querySelector('summary');
    var applyFold = function () {
      fold.open = wide.matches;
      if (sum) sum.tabIndex = wide.matches ? -1 : 0;
    };
    applyFold();
    if (wide.addEventListener) wide.addEventListener('change', applyFold); else if (wide.addListener) wide.addListener(applyFold);
    if (sum) {
      sum.addEventListener('click', function (e) { if (wide.matches) e.preventDefault(); });
      sum.addEventListener('keydown', function (e) { if (wide.matches && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); });
    }
  }

  /* ----------------------------------------------- cite this verse -- */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-copy]'), function (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var src = doc.getElementById(btn.getAttribute('data-copy'));
      if (!src) return;
      var text = src.textContent.trim();
      var done = function () { var old = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = old; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function () {}); }
      else {
        var r = doc.createRange(); r.selectNodeContents(src); var s = win.getSelection(); s.removeAllRanges(); s.addRange(r);
        try { doc.execCommand('copy'); done(); } catch (e) {}
      }
    });
  });

  /* -------------------------------------------- prototype newsletter -- */
  Array.prototype.forEach.call(doc.querySelectorAll('form[data-proto-form]'), function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var m = f.querySelector('.news-done');
      if (!m) { m = doc.createElement('p'); m.className = 'news-done'; m.setAttribute('role', 'status'); f.appendChild(m); }
      m.textContent = 'Prototype: nothing was sent. In the real site this would add you to the new-book notices.';
    });
  });

  /* ----------------------------------------------------- search page -- */
  var results = doc.getElementById('results');
  if (results) {
    var norm = function (s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); };
    var q = new URLSearchParams(win.location.search).get('q') || '';
    var input = doc.getElementById('q');
    if (input) input.value = q;
    var note = doc.getElementById('result-note');
    function run(value) {
      var n = norm(value), shown = 0;
      Array.prototype.forEach.call(results.querySelectorAll('li[data-text]'), function (li) {
        var hit = !n || norm(li.getAttribute('data-text')).indexOf(n) !== -1;
        li.hidden = !hit; if (hit) shown++;
      });
      if (note) note.textContent = !n ? 'All 11 texts of the Upadeśāmṛta are released. Type a word to narrow them down.' :
        (shown ? shown + (shown === 1 ? ' text matches.' : ' texts match.') : 'No match among the released texts. Only the Upadeśāmṛta is released so far; other works follow in stages.');
    }
    run(q);
    if (input) input.addEventListener('input', function () { run(input.value); });
  }
})();
