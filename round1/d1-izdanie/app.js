/* Progressive enhancement only: the page reads in full without this file. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  function fold(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  /* remember which layers a reader switched off (kept only in this browser) */
  var boxes = [].slice.call(document.querySelectorAll('.layers input[type=checkbox]'));
  var KEY = 'acaryapedia-layers';
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) boxes.forEach(function (b) { if (b.id in saved) b.checked = !!saved[b.id]; });
  } catch (e) { /* storage blocked: defaults stay */ }
  boxes.forEach(function (b) {
    b.addEventListener('change', function () {
      try {
        var o = {};
        boxes.forEach(function (x) { o[x.id] = x.checked; });
        localStorage.setItem(KEY, JSON.stringify(o));
      } catch (e) { /* ignore */ }
    });
  });

  /* the 1942 print opens beside the text on wide screens; on a phone it stays closed until asked for */
  var fax = document.getElementById('fax');
  if (fax && window.matchMedia('(min-width: 960px)').matches) fax.open = true;
  [].slice.call(document.querySelectorAll('a[href="#fax"]')).forEach(function (a) {
    a.addEventListener('click', function () { if (fax) fax.open = true; });
  });

  /* copy buttons */
  [].slice.call(document.querySelectorAll('[data-copy]')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-copy'));
      if (!target) return;
      var text = target.innerText.trim();
      var old = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', old);
      var say = function (msg) {
        btn.textContent = msg;
        setTimeout(function () { btn.textContent = old; }, 2200);
      };
      var select = function () {
        var r = document.createRange();
        r.selectNodeContents(target);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        say('Selected: press Ctrl+C');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { say('Copied'); }, select);
      else select();
    });
  });

  /* collapse or expand every commentary */
  [].slice.call(document.querySelectorAll('[data-notes]')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('data-notes') === 'open';
      [].slice.call(document.querySelectorAll('.note')).forEach(function (n) { n.open = open; });
    });
  });

  /* forms are placeholders in the prototype: say so instead of sending */
  [].slice.call(document.querySelectorAll('form[data-proto]')).forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = f.querySelector('.fnote');
      if (out) { out.textContent = f.getAttribute('data-proto'); out.classList.add('ok'); }
    });
  });

  /* catalogue filter, with or without diacritics */
  var q = document.getElementById('q-home');
  var authors = [].slice.call(document.querySelectorAll('.author'));
  if (q && authors.length) {
    var status = document.getElementById('cat-status');
    var index = authors.map(function (a) {
      var works = [].slice.call(a.querySelectorAll('.works li'));
      return { el: a, name: fold(a.getAttribute('data-name')), works: works.map(function (li) { return { li: li, t: fold(li.textContent) }; }), wasOpen: a.open };
    });
    var apply = function () {
      var term = fold(q.value);
      var shown = 0, hits = 0;
      index.forEach(function (it) {
        if (!term) {
          it.el.hidden = false;
          it.works.forEach(function (w) { w.li.hidden = false; });
          shown++;
          return;
        }
        var nameHit = it.name.indexOf(term) > -1;
        var n = 0;
        it.works.forEach(function (w) {
          var hit = w.t.indexOf(term) > -1;
          w.li.hidden = !(nameHit || hit);
          if (hit) n++;
        });
        var visible = nameHit || n > 0;
        it.el.hidden = !visible;
        if (visible) { shown++; hits += n; it.el.open = true; }
      });
      if (status) {
        status.textContent = term
          ? (shown ? shown + (shown === 1 ? ' author' : ' authors') + (hits ? ' and ' + hits + (hits === 1 ? ' work' : ' works') : '') + ' match "' + q.value.trim() + '".'
                   : 'Nothing in the catalogue matches "' + q.value.trim() + '". Full-text search of the verses is on the search page.')
          : '';
      }
    };
    q.addEventListener('input', apply);
    var form = q.form;
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      apply();
      var cat = document.getElementById('catalogue');
      if (cat) cat.scrollIntoView();
    });
  } else {
    var any = document.querySelector('form[role=search]');
    if (any) any.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.querySelector('.search-note');
      if (note) note.textContent = 'The search page is not part of this prototype.';
    });
  }
})();
