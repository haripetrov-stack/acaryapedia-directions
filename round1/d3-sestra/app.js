/* Enhancements only: the page reads and works without this file. */
(function () {
  var d = document, bar = d.querySelector('.bar'), tg = d.querySelector('.menu-toggle');
  if (bar && tg) {
    tg.addEventListener('click', function () {
      var on = bar.classList.toggle('open');
      tg.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }

  var copy = d.getElementById('copy'), txt = d.getElementById('cite-text'), msg = d.getElementById('copied');
  if (copy && txt) {
    copy.addEventListener('click', function () {
      var s = txt.innerText + '\n' + (d.getElementById('cite-text2') || { innerText: '' }).innerText;
      var done = function () { if (msg) { msg.textContent = 'Citation copied.'; } };
      if (navigator.clipboard) { navigator.clipboard.writeText(s).then(done, done); } else { done(); }
    });
  }

  var all = d.querySelectorAll('[data-all]');
  Array.prototype.forEach.call(all, function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('data-all') === 'open';
      Array.prototype.forEach.call(d.querySelectorAll('.L-comm details.item'), function (x) { x.open = open; });
    });
  });

  var news = d.getElementById('news-form');
  if (news) {
    news.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = d.getElementById('news-msg');
      if (s) { s.textContent = 'Thank you. This preview does not send anything.'; }
    });
  }

  var echo = d.getElementById('qecho');
  if (echo) {
    var q = new URLSearchParams(location.search).get('q');
    if (q) { echo.textContent = q; }
  }
})();
