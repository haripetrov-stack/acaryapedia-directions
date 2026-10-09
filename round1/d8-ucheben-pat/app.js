/* Study Path: progress kept only in this browser, plus diacritic-free filtering of the lesson map.
   Without this file every page still reads in full. */
(function () {
  'use strict';
  var KEY = 'acaryapedia.path.upadesamrta';
  var TOTAL = 11;
  var memory = null;
  var storageOk = true;

  function readDone() {
    if (memory) { return memory.slice(); }
    try {
      var raw = window.localStorage.getItem(KEY);
      var obj = raw ? JSON.parse(raw) : null;
      if (obj && Object.prototype.toString.call(obj.done) === '[object Array]') {
        return obj.done.filter(function (n) { return n >= 1 && n <= TOTAL; });
      }
    } catch (e) { storageOk = false; }
    return [];
  }

  function writeDone(list) {
    memory = list.slice();
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ done: list }));
      storageOk = true;
    } catch (e) { storageOk = false; }
  }

  function has(list, n) { return list.indexOf(n) !== -1; }
  function firstOpen(list) {
    for (var i = 1; i <= TOTAL; i++) { if (!has(list, i)) { return i; } }
    return 0;
  }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function lessonNo() {
    var el = document.querySelector('[data-lesson]');
    return el ? parseInt(el.getAttribute('data-lesson'), 10) : 0;
  }

  function paint() {
    var done = readDone();
    var here = lessonNo();
    qsa('.segs').forEach(function (ol) {
      qsa('li', ol).forEach(function (li, i) {
        var n = i + 1;
        li.classList.toggle('done', has(done, n));
        li.classList.toggle('here', n === here);
      });
    });
    qsa('[data-progress-text]').forEach(function (el) {
      el.textContent = done.length + ' of ' + TOTAL + ' lessons done';
    });
    var next = firstOpen(done);
    var start = document.getElementById('start');
    if (start) {
      if (!next) { start.textContent = 'Review lesson 1'; start.setAttribute('href', 'verse.html'); }
      else if (next === 1 && !done.length) { start.textContent = 'Start lesson 1'; start.setAttribute('href', 'verse.html'); }
      else { start.textContent = 'Continue with lesson ' + next; start.setAttribute('href', next === 1 ? 'verse.html' : '#lesson-' + next); }
    }
    qsa('.stop').forEach(function (li) {
      var n = parseInt(li.getAttribute('data-n'), 10);
      var isDone = has(done, n);
      li.classList.toggle('done', isDone);
      li.classList.toggle('next', n === next && !isDone);
      var tag = li.querySelector('.state-tag');
      if (tag) { tag.textContent = isDone ? ', done' : (n === next ? ', next' : ''); }
    });
    var btn = document.getElementById('done-btn');
    if (btn && here) {
      var isDone = has(done, here);
      btn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
      btn.textContent = isDone ? 'Lesson ' + here + ' is done. Undo' : 'Mark lesson ' + here + ' as done';
      var msg = document.getElementById('done-msg');
      if (msg) { msg.textContent = 'Lesson ' + here + ' of ' + TOTAL + (isDone ? ', done' : ', not marked yet'); }
    }
    var warn = document.getElementById('store-warn');
    if (warn) { warn.hidden = storageOk; }
  }

  function init() {
    paint();

    var btn = document.getElementById('done-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        var here = lessonNo();
        var done = readDone();
        if (has(done, here)) { done.splice(done.indexOf(here), 1); } else { done.push(here); done.sort(function (a, b) { return a - b; }); }
        writeDone(done);
        paint();
      });
    }

    var reset = document.getElementById('reset');
    if (reset) {
      reset.addEventListener('click', function () { writeDone([]); paint(); });
    }

    var copy = document.getElementById('copy-link');
    if (copy) {
      copy.addEventListener('click', function () {
        var text = copy.getAttribute('data-copy');
        var note = document.getElementById('copy-msg');
        var ok = function () { if (note) { note.textContent = 'Copied'; } };
        var fail = function () { if (note) { note.textContent = 'Select the text and copy it'; } };
        try { navigator.clipboard.writeText(text).then(ok, fail); } catch (e) { fail(); }
      });
    }
    var copyCite = document.getElementById('copy-cite');
    if (copyCite) {
      copyCite.addEventListener('click', function () {
        var text = document.getElementById('cite-text').textContent.trim();
        var note = document.getElementById('copy-cite-msg');
        var ok = function () { if (note) { note.textContent = 'Copied'; } };
        var fail = function () { if (note) { note.textContent = 'Select the text and copy it'; } };
        try { navigator.clipboard.writeText(text).then(ok, fail); } catch (e) { fail(); }
      });
    }

    var news = document.getElementById('news-form');
    if (news) {
      news.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var out = document.getElementById('news-msg');
        if (out) { out.textContent = 'Prototype: nothing was sent.'; }
      });
    }

    initSearch();
    initSpy();
  }

  /* Search without diacritics: "krsna" finds "kṛṣṇa". On the index it filters the lesson map; elsewhere the form goes to search.html. */
  function fold(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-‐‑']/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function initSearch() {
    var map = document.getElementById('map');
    var forms = qsa('form[role="search"]');
    if (!map || !forms.length || !String.prototype.normalize) { return; }
    var status = document.getElementById('map-status');
    var stops = qsa('.stop', map);
    function apply(q) {
      var f = fold(q);
      var hits = 0;
      stops.forEach(function (li) {
        var match = !f || (li.getAttribute('data-search') || '').indexOf(f) !== -1;
        li.classList.toggle('dim', !match);
        if (match) { hits++; }
      });
      if (status) {
        status.textContent = f ? (hits ? hits + ' of ' + TOTAL + ' lessons contain “' + q.trim() + '” (diacritics are ignored)' : 'No lesson contains “' + q.trim() + '”. Try fewer letters.') : '';
      }
    }
    forms.forEach(function (form) {
      var input = form.querySelector('input[type="search"]');
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        apply(input.value);
        map.scrollIntoView();
      });
      input.addEventListener('input', function () { apply(input.value); });
    });
  }

  /* Rail on the lesson page: mark the section being read. */
  function initSpy() {
    var links = qsa('.stations a');
    if (!links.length || !('IntersectionObserver' in window)) { return; }
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.removeAttribute('aria-current'); });
          var a = byId[en.target.id];
          if (a) { a.setAttribute('aria-current', 'true'); }
        }
      });
    }, { rootMargin: '-10% 0px -70% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { io.observe(el); }
    });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
