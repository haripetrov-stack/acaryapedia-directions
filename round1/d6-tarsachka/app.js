/* Acaryapedia, direction 6 "Ask the library".
   Part 1 (core): folding of Latin, Bengali and Devanagari text to plain letters, search, result markup.
   It also runs in Node, where _build.js uses it to write the static example into the HTML.
   Part 2 (page): live search on index.html and search.html, highlighting and copy button on verse.html.
   Everything the pages show without JavaScript is already in the HTML; this file only improves it. */
(function (root) {
  'use strict';

  /* ---------- 1. Folding: "vāco vegaṁ", "वाचो वेगं" and "বাচো বেগং" all become "vacovegam" ---------- */

  var CONS = { 0x15: 'k', 0x16: 'kh', 0x17: 'g', 0x18: 'gh', 0x19: 'n', 0x1A: 'c', 0x1B: 'ch', 0x1C: 'j', 0x1D: 'jh', 0x1E: 'n',
    0x1F: 't', 0x20: 'th', 0x21: 'd', 0x22: 'dh', 0x23: 'n', 0x24: 't', 0x25: 'th', 0x26: 'd', 0x27: 'dh', 0x28: 'n', 0x29: 'n',
    0x2A: 'p', 0x2B: 'ph', 0x2C: 'b', 0x2D: 'bh', 0x2E: 'm', 0x2F: 'y', 0x30: 'r', 0x31: 'r', 0x32: 'l', 0x33: 'l', 0x34: 'l',
    0x35: 'v', 0x36: 's', 0x37: 's', 0x38: 's', 0x39: 'h', 0x5C: 'r', 0x5D: 'rh', 0x5F: 'y' };
  var NUKTA = { 0x21: 'r', 0x22: 'rh', 0x2F: 'y' };
  var INDEP = { 0x04: 'a', 0x05: 'a', 0x06: 'a', 0x07: 'i', 0x08: 'i', 0x09: 'u', 0x0A: 'u', 0x0B: 'r', 0x0C: 'l', 0x0D: 'e', 0x0E: 'e',
    0x0F: 'e', 0x10: 'ai', 0x11: 'o', 0x12: 'o', 0x13: 'o', 0x14: 'au', 0x60: 'r', 0x61: 'l', 0x50: 'om' };
  var MATRA = { 0x3E: 'a', 0x3F: 'i', 0x40: 'i', 0x41: 'u', 0x42: 'u', 0x43: 'r', 0x44: 'r', 0x45: 'e', 0x46: 'e', 0x47: 'e',
    0x48: 'ai', 0x49: 'o', 0x4A: 'o', 0x4B: 'o', 0x4C: 'au', 0x62: 'l', 0x63: 'l' };
  var SIGN = { 0x01: 'm', 0x02: 'm', 0x03: 'h' };

  /* Bengali sits in the Devanagari layout shifted by 0x80, so one table serves both scripts. */
  function brahmicIndex(c) {
    if (c >= 0x900 && c <= 0x97F) return (c === 0x964 || c === 0x965) ? -1 : c - 0x900;
    if (c >= 0x980 && c <= 0x9FF) return c - 0x980;
    return -1;
  }

  /* Returns { s, a, b, w, st }: s is the folded text (a-z, 0-9, with b written as v), a[k] and b[k] are where
     letter k starts and ends in the original text, w[k] is the word it belongs to (a hyphen does not end a word)
     and st[k] is true when it begins a word or a part of a compound. */
  function foldText(text) {
    var s = '', a = [], b = [], w = [], st = [], i = 0, n = text.length, cur = 0, soft = false, hard = true;
    function push(str, from, to) {
      if (soft) { cur++; soft = false; }
      var first = hard; hard = false;
      for (var k = 0; k < str.length; k++) { s += str[k] === 'b' ? 'v' : str[k]; a.push(from); b.push(to); w.push(cur); st.push(first && k === 0); }
    }
    while (i < n) {
      var c = text.charCodeAt(i), idx = brahmicIndex(c);
      if (idx >= 0) {
        if (idx === 0x4E && c >= 0x980) { push('t', i, i + 1); i++; continue; }   /* Bengali khanda ta has no inherent vowel */
        if (CONS[idx] !== undefined) {
          var r = CONS[idx], j = i + 1, ni;
          ni = j < n ? brahmicIndex(text.charCodeAt(j)) : -1;
          if (ni === 0x3C) { if (NUKTA[idx]) r = NUKTA[idx]; j++; ni = j < n ? brahmicIndex(text.charCodeAt(j)) : -1; }
          if (ni === 0x4D) { j++; push(r, i, j); }
          else if (MATRA[ni] !== undefined) { push(r, i, j); push(MATRA[ni], j, j + 1); j++; }
          else { push(r, i, j); push('a', i, j); }
          i = j; continue;
        }
        if (INDEP[idx] !== undefined) push(INDEP[idx], i, i + 1);
        else if (MATRA[idx] !== undefined) push(MATRA[idx], i, i + 1);
        else if (SIGN[idx] !== undefined) push(SIGN[idx], i, i + 1);
        else if (idx >= 0x66 && idx <= 0x6F) push(String(idx - 0x66), i, i + 1);
        i++; continue;
      }
      if (c >= 0x300 && c <= 0x36F) { if (b.length) b[b.length - 1] = i + 1; i++; continue; }
      var d = text.charAt(i).normalize('NFD');
      for (var m = 0; m < d.length; m++) {
        var x = d.charAt(m), xc = d.charCodeAt(m);
        if (xc >= 0x300 && xc <= 0x36F) { if (b.length) b[b.length - 1] = i + 1; continue; }
        if (/[A-Za-z0-9]/.test(x)) push(x.toLowerCase(), i, i + 1);
        else if (/[\u2010-\u2015-]/.test(x)) hard = true;
        else if (!/['\u2019\u200c\u200d]/.test(x)) { soft = true; hard = true; }
      }
      i++;
    }
    return { s: s, a: a, b: b, w: w, st: st };
  }

  var MARK = /\p{M}/u;
  function isVirama(ch) { var c = ch.charCodeAt(0); return c === 0x94D || c === 0x9CD; }

  /* Widen a range so that it never cuts through a syllable or a conjunct consonant. */
  function snap(text, s, e) {
    while (s > 0 && (MARK.test(text.charAt(s)) || isVirama(text.charAt(s - 1)))) s--;
    var guard = 0;
    while (e < text.length && guard++ < 12 && (MARK.test(text.charAt(e)) || isVirama(text.charAt(e - 1)))) e++;
    return [s, e];
  }

  /* Next place at or after `from` where the folded query occurs. opt.noSpan: inside one word; opt.start: at the start of a word. */
  function nextOcc(f, qs, from, opt) {
    var p;
    while ((p = f.s.indexOf(qs, from)) !== -1) {
      if (opt && ((opt.noSpan && f.w[p] !== f.w[p + qs.length - 1]) || (opt.start && !f.st[p]))) { from = p + 1; continue; }
      return p;
    }
    return -1;
  }

  function wordEnd(f, q) {
    while (q + 1 < f.s.length && f.w[q + 1] === f.w[q] && !f.st[q + 1]) q++;
    return q;
  }

  /* All places where the folded query occurs in a folded text, as [start, end) in the original text. */
  function findRanges(text, f, qs, opt) {
    var out = [], from = 0, p;
    if (!qs) return out;
    while ((p = nextOcc(f, qs, from, opt)) !== -1) {
      var r = snap(text, f.a[p], f.b[opt && opt.extend ? wordEnd(f, p + qs.length - 1) : p + qs.length - 1]);
      if (out.length && r[0] < out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], r[1]);
      else out.push(r);
      from = p + qs.length;
    }
    return out;
  }

  /* Several words that occur close to each other, in order, in other grammatical forms ("vāco vegaṁ" finds "vācaḥ ... vegaṁ").
     Each word is cut to a stem first, because Sanskrit endings change with sandhi. */
  var ENDING = /(asya|ena|ah|am|an|at|ad|o|a|e|i|u|h|m|n|t|d|s)$/;
  function stem(w) { var s = w.replace(ENDING, ''); return s.length >= 3 ? s : w; }
  var GAP = 30;

  /* A stem counts when it begins a word and the word goes on for at most two more letters (three for a stem of four or more),
     so "vac" finds "vācaḥ" but not "vacana". */
  function nextStem(f, st, from) {
    var p;
    while ((p = f.s.indexOf(st, from)) !== -1) {
      var last = p + st.length - 1;
      if (f.st[p] && f.w[p] === f.w[last] && wordEnd(f, last) - last <= (st.length >= 4 ? 3 : 2)) return p;
      from = p + 1;
    }
    return -1;
  }

  function findNear(text, f, stems) {
    var out = [], from = 0;
    if (stems.length < 2) return out;
    for (;;) {
      var p = nextStem(f, stems[0], from);
      if (p === -1) break;
      var chain = [[p, p + stems[0].length]], end = p + stems[0].length, ok = true;
      for (var i = 1; i < stems.length && ok; i++) {
        var q = nextStem(f, stems[i], end);
        if (q === -1 || q - end > GAP) ok = false;
        else { chain.push([q, q + stems[i].length]); end = q + stems[i].length; }
      }
      if (ok) {
        chain.forEach(function (c) { out.push(snap(text, f.a[c[0]], f.b[wordEnd(f, c[1] - 1)])); });
        from = wordEnd(f, end - 1) + 1;
      } else from = p + 1;
    }
    return out.sort(function (x, y) { return x[0] - y[0]; });
  }

  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function markUp(text, ranges, from, to) {
    var out = '', pos = from;
    for (var k = 0; k < ranges.length; k++) {
      var s = Math.max(ranges[k][0], from), e = Math.min(ranges[k][1], to);
      if (e <= s) continue;
      out += esc(text.slice(pos, s)) + '<mark>' + esc(text.slice(s, e)) + '</mark>';
      pos = e;
    }
    return out + esc(text.slice(pos, to));
  }

  /* A window of text around the first match, cut at spaces, with every match inside it marked. */
  function excerpt(text, ranges, before, after) {
    var s = ranges[0][0], e = ranges[0][1], from = Math.max(0, s - before), to = Math.min(text.length, e + after), k;
    if (from > 0) { k = text.indexOf(' ', from); from = (k !== -1 && k < s) ? k + 1 : from; }
    if (to < text.length) { k = text.lastIndexOf(' ', to); to = (k > e) ? k : to; }
    return (from > 0 ? '… ' : '') + markUp(text, ranges, from, to) + (to < text.length ? ' …' : '');
  }

  /* ---------- 2. The library in memory ---------- */

  var NFC = function (t) { return (t || '').normalize('NFC'); };

  function splitTitle(t) {
    var p = NFC(t).split(' — ');
    var rest = (p[1] || '').replace(/\s*\(([^()]*)\)\s*$/, function (m, lang) { return ', ' + lang; });
    return { title: p[0], by: rest.replace(/^, /, '') };
  }

  function prepare(upa, site) {
    var db = { work: upa.work, workAuthor: NFC(upa.author), verses: [], authors: [], works: [] };
    upa.verses.forEach(function (v) {
      var o = { n: v.number, id: v.id, scripts: {}, comms: [], cites: [] };
      [['iast', v.iast], ['deva', v.sanskrit_deva], ['beng', v.sanskrit_beng]].forEach(function (p) {
        var lines = p[1].map(NFC), text = lines.join('\n');
        o.scripts[p[0]] = { lines: lines, text: text, f: foldText(text) };
      });
      v.commentaries.forEach(function (c, k) {
        var t = splitTitle(c.title), text = NFC(c.text);
        o.comms.push({ k: k + 1, title: t.title, by: t.by, text: text, f: foldText(text),
          lang: /\(Sanskrit\)/.test(c.title) ? 'sa-Beng' : 'bn' });
      });
      v.quoted_by_prabhupada.forEach(function (q) {
        if (/^https:\/\/vanisource\.org\//.test(q.href)) o.cites.push({ label: NFC(q.label), href: q.href, f: foldText(NFC(q.label)) });
      });
      db.verses.push(o);
    });
    if (site) {
      site.authors.forEach(function (a) {
        var name = NFC(a.name);
        db.authors.push({ slug: a.slug, name: name, f: foldText(name), intro: NFC(a.intro), count: a.works.length });
        a.works.forEach(function (w) { db.works.push({ title: NFC(w.title), author: name, f: foldText(NFC(w.title)) }); });
      });
    }
    return db;
  }

  /* ---------- 3. Search ---------- */

  function lineWindows(sc, ranges) {
    var lines = [], off = 0;
    sc.lines.forEach(function (l, i) {
      var end = off + l.length, hit = ranges.filter(function (r) { return r[0] < end && r[1] > off; });
      lines.push({ i: i, off: off, text: l, ranges: hit.map(function (r) { return [Math.max(r[0], off) - off, Math.min(r[1], end) - off]; }) });
      off = end + 1;
    });
    return lines;
  }

  var SCRIPTS = ['iast', 'deva', 'beng'];

  function verseHit(v, per, near) {
    var show = {}, sets = {};
    SCRIPTS.forEach(function (k) {
      sets[k] = lineWindows(v.scripts[k], per[k]);
      sets[k].forEach(function (w) { if (w.ranges.length) show[w.i] = true; });
    });
    return { kind: 'verse', near: near, v: v, sets: sets, lines: Object.keys(show).map(Number).sort(function (x, y) { return x - y; }),
      found: near ? [] : per.iast.map(function (r) { return v.scripts.iast.text.slice(r[0], r[1]); }) };
  }

  function words(q) {
    return q.split(/[\s\-‐-―]+/).map(function (w) { return foldText(w).s; }).filter(Boolean);
  }

  function search(db, q) {
    var qs = foldText(q).s;
    if (qs.length < 3) return { q: q, qs: qs, short: true, total: 0 };
    var ws = words(q), stems = ws.length > 1 ? ws.map(stem) : [];
    var loose = stems.length > 1 && stems.every(function (s) { return s.length >= 3; });
    var opt = ws.length === 1 ? { noSpan: true } : null;
    var res = { q: q, qs: qs, authors: [], works: [], verses: [], comms: [], near: [], cites: [], total: 0 };
    var host = foldText(db.workAuthor).s;
    db.authors.forEach(function (a) { if (nextOcc(a.f, qs, 0, opt) !== -1) { a.hasWork = a.f.s === host; res.authors.push(a); } });
    db.works.forEach(function (w) {
      if (nextOcc(w.f, qs, 0, opt) !== -1) res.works.push({ title: w.title, author: w.author, published: foldText(db.work).s === w.f.s });
    });
    db.verses.forEach(function (v) {
      var exact = {}, any = false;
      SCRIPTS.forEach(function (k) { exact[k] = findRanges(v.scripts[k].text, v.scripts[k].f, qs, opt); any = any || exact[k].length > 0; });
      if (any) res.verses.push(verseHit(v, exact, false));
      else if (loose) {
        var rel = {}, anyRel = false;
        SCRIPTS.forEach(function (k) { rel[k] = findNear(v.scripts[k].text, v.scripts[k].f, stems); anyRel = anyRel || rel[k].length > 0; });
        if (anyRel) res.near.push(verseHit(v, rel, true));
      }
      v.comms.forEach(function (c) {
        var r = findRanges(c.text, c.f, qs, opt);
        if (r.length) res.comms.push({ kind: 'comm', v: v, c: c, ranges: r });
        else if (loose) {
          r = findNear(c.text, c.f, stems);
          if (r.length) res.near.push({ kind: 'comm', near: true, v: v, c: c, ranges: r });
        }
      });
      v.cites.forEach(function (c) {
        if (nextOcc(c.f, qs, 0, opt) !== -1) res.cites.push({ v: v, c: c, ranges: findRanges(c.label, c.f, qs, opt) });
      });
    });
    res.total = res.authors.length + res.works.length + res.verses.length + res.comms.length + res.near.length + res.cites.length;
    return res;
  }

  /* ---------- 4. Result markup (the same function writes the static example and the live results) ---------- */

  var STATUS = {
    unv: ['s-unv', 'unverified text'],
    ocr: ['s-ocr', 'uncorrected OCR'],
    ver: ['s-ver', 'verified against print']
  };
  function status(k) { return '<span class="status ' + STATUS[k][0] + '"><i aria-hidden="true"></i>' + STATUS[k][1] + '</span>'; }
  var NUMBER = new Intl.NumberFormat('en');
  var WORK = 'Upadeśāmṛta';

  function verseHref(v, q, frag) {
    return v.n === 1 ? 'verse.html' + (q ? '?q=' + encodeURIComponent(q) : '') + (frag || '') : '#';
  }
  function plural(n, one, many) { return NUMBER.format(n) + ' ' + (n === 1 ? one : many); }

  var SCRIPT_LABEL = { iast: ['IAST', 'sa-Latn'], deva: ['Devanagari', 'sa-Deva'], beng: ['Bengali script', 'sa-Beng'] };

  function hitVerse(h, q) {
    var rows = '';
    SCRIPTS.forEach(function (k) {
      h.lines.forEach(function (i) {
        var w = h.sets[k][i];
        rows += '<p class="vline"><span class="scr">' + (h.lines[0] === i ? SCRIPT_LABEL[k][0] : '') + '</span>' +
          '<span class="vtext ' + k + '" lang="' + SCRIPT_LABEL[k][1] + '">' + markUp(w.text, w.ranges, 0, w.text.length) + '</span></p>';
      });
    });
    return '<li class="hit t-verse"><div class="spine"><a class="cite" href="' + verseHref(h.v, q) + '"><i>' + WORK + '</i> ' + h.v.n + '</a>' +
      '<span class="what">The verse itself</span>' + status('unv') + '</div>' +
      '<div class="said">' + rows + '<p class="open"><a href="' + verseHref(h.v, q) + '">Read text ' + h.v.n + ' with all its commentaries</a></p></div></li>';
  }

  function hitComm(h, q) {
    var ex = excerpt(h.c.text, h.ranges, 70, 150);
    return '<li class="hit t-comm"><div class="spine"><a class="cite" href="' + verseHref(h.v, q, '#c' + h.c.k) + '"><i>' + WORK + '</i> ' + h.v.n + '</a>' +
      '<span class="what"><i>' + esc(h.c.title) + '</i>' + (h.c.by ? ' by ' + esc(h.c.by) : '') + '</span>' + status('ocr') + '</div>' +
      '<div class="said"><p class="excerpt" lang="' + h.c.lang + '">' + ex + '</p>' +
      (!h.near && h.ranges.length > 1 ? '<p class="more">' + (h.ranges.length - 1) + ' more in this commentary</p>' : '') + '</div></li>';
  }

  function hitAuthor(a) {
    return '<li class="hit t-author"><div class="spine"><a class="cite" href="#">' + esc(a.name) + '</a><span class="what">Author</span></div>' +
      '<div class="said"><p class="excerpt">' + esc(a.intro) + '</p><p class="more">' + plural(a.count, 'work', 'works') + ' in the catalogue' +
      (a.hasWork ? '. In the library now: <a href="verse.html"><i>' + WORK + '</i></a>, eleven verses with their commentaries.' : '.') + '</p></div></li>';
  }

  function hitWork(w) {
    return '<li class="hit t-work"><div class="spine"><a class="cite" href="' + (w.published ? 'verse.html' : '#') + '"><i>' + esc(w.title) + '</i></a><span class="what">Work by ' + esc(w.author) + '</span></div>' +
      '<div class="said"><p class="excerpt">' + (w.published ? 'In the library: eleven verses with their commentaries.' : 'In the catalogue. It will be published in a later stage.') + '</p></div></li>';
  }

  function hitCite(h) {
    return '<li class="hit t-cite"><div class="spine"><a class="cite" href="' + verseHref(h.v, '') + '"><i>' + WORK + '</i> ' + h.v.n + '</a><span class="what">Quoted by Śrīla Prabhupāda in</span></div>' +
      '<div class="said"><p class="excerpt"><a href="' + esc(h.c.href) + '">' + markUp(h.c.label, h.ranges, 0, h.c.label.length) + '</a> on Vanisource</p></div></li>';
  }

  function hitAny(q) { return function (h) { return h.kind === 'verse' ? hitVerse(h, q) : hitComm(h, q); }; }

  function group(title, items, render, cap, noun) {
    if (!items.length) return '';
    var head = items.slice(0, cap).map(render).join(''), tail = items.slice(cap).map(render).join('');
    return '<div class="group"><h3>' + title + '</h3><ol class="hits">' + head + '</ol>' +
      (tail ? '<details class="rest"><summary>Show ' + plural(items.length - cap, 'more ' + noun, 'more ' + noun + 's') + '</summary><ol class="hits">' + tail + '</ol></details>' : '') + '</div>';
  }

  function plainLatin(f) { return f === f.normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function resultsHTML(res) {
    var q = res.q;
    if (res.short) return '<p class="empty">Type at least three letters. Diacritics are optional.</p>';
    if (!res.total) {
      return '<p class="empty">Nothing in the library matches “' + esc(q) + '”. Check the spelling or type fewer letters. ' +
        'Diacritics are optional, so “krsna” finds “kṛṣṇa”.</p>';
    }
    var parts = [], found = [];
    res.verses.forEach(function (h) { h.found.forEach(function (f) { if (found.indexOf(f) === -1) found.push(f); }); });
    var nv = res.verses.length + res.near.filter(function (h) { return h.kind === 'verse'; }).length;
    var nc = res.comms.length + res.near.filter(function (h) { return h.kind === 'comm'; }).length;
    var pass = nv + nc, sum = '<p class="summary">', work = '<i>' + WORK + '</i>';
    if (nv && nc) sum += plural(pass, 'passage', 'passages') + ' in ' + work + ': ' + plural(nv, 'verse', 'verses') + ' and ' + plural(nc, 'commentary passage', 'commentary passages') + '.';
    else if (nc) sum += plural(nc, 'passage', 'passages') + ' in ' + work + ', all in commentaries.';
    else if (nv) sum += plural(nv, 'verse', 'verses') + ' of ' + work + '.';
    else sum += plural(res.total, 'result', 'results') + '.';
    sum += '</p>';
    if (found.length) {
      var typedPlain = plainLatin(q.trim()), foundAccented = found.some(function (f) { return !plainLatin(f); });
      sum += '<p class="foundas">Found as <span lang="sa-Latn" class="it">' + found.map(esc).join(', ') + '</span>' +
        (typedPlain && foundAccented ? '. You typed it without diacritics.' : '.') + '</p>';
    }
    parts.push(sum);
    parts.push(group('Authors', res.authors, hitAuthor, 4, 'author'));
    parts.push(group('Works', res.works, hitWork, 4, 'work'));
    var exact = res.verses.concat(res.comms);
    parts.push(group(res.near.length ? 'The words as typed' : 'In the text', exact, hitAny(q), 6, 'passage'));
    parts.push(group('The same words in other forms', res.near, hitAny(q), 6, 'passage'));
    parts.push(group('Quoted by Śrīla Prabhupāda', res.cites, hitCite, 6, 'place'));
    return parts.join('');
  }

  /* ---------- 5. Highlighting inside a page (verse.html) ---------- */

  function highlight(scope, q) {
    var qs = foldText(q).s, count = 0;
    if (qs.length < 3) return 0;
    var ws = words(q), stems = ws.length > 1 ? ws.map(stem) : [], one = ws.length === 1;
    if (!stems.every(function (s) { return s.length >= 3; })) stems = [];
    scope.querySelectorAll('[data-hl]').forEach(function (box) {
      var walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, null), nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(function (node) {
        var text = node.nodeValue;
        if (!text.trim()) return;
        var f = foldText(text), ranges = findRanges(text, f, qs, one ? { noSpan: true } : null), near = false;
        if (!ranges.length && stems.length) { ranges = findNear(text, f, stems); near = true; }
        if (!ranges.length) return;
        var frag = document.createDocumentFragment(), pos = 0;
        ranges.forEach(function (r) {
          frag.appendChild(document.createTextNode(text.slice(pos, r[0])));
          var m = document.createElement('mark'); m.className = 'q'; m.textContent = text.slice(r[0], r[1]); frag.appendChild(m);
          pos = r[1];
        });
        frag.appendChild(document.createTextNode(text.slice(pos)));
        node.parentNode.replaceChild(frag, node);
        count += near ? Math.round(ranges.length / stems.length) : ranges.length;
      });
    });
    return count;
  }

  var core = { foldText: foldText, findRanges: findRanges, nextOcc: nextOcc, prepare: prepare, search: search, resultsHTML: resultsHTML, markUp: markUp,
    excerpt: excerpt, splitTitle: splitTitle, esc: esc, status: status, plural: plural };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  /* ---------- 6. Page behaviour (browser only) ---------- */

  var doc = document;
  var field = doc.getElementById('q'), form = field && field.form, holder = doc.getElementById('results'),
    statusLine = doc.getElementById('status'), db = null, loading = null;

  function getJSON(urls) {
    var next = urls.slice();
    function go() {
      if (!next.length) return Promise.reject(new Error('no data'));
      return fetch(next.shift()).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(go);
    }
    return go();
  }
  function load() {
    if (db) return Promise.resolve(db);
    if (!loading) {
      loading = Promise.all([
        getJSON(['data/upadesamrta.json', '../../sample/upadesamrta.json']),
        getJSON(['data/site.json', '../../sample/site.json']).catch(function () { return null; })
      ]).then(function (d) { db = prepare(d[0], d[1]); return db; });
    }
    return loading;
  }

  function run(q, push) {
    q = q.trim();
    if (!holder) return;
    load().then(function (data) {
      var res = search(data, q), head = holder.querySelector('h2');
      if (!q) { return; }
      holder.innerHTML = '<h2 id="res-h">' + (res.short ? 'Search' : (res.total ? 'Results for “' : 'Nothing found for “') + esc(q) + '”') + '</h2>' + resultsHTML(res);
      var ask = doc.querySelector('.ask'); if (ask) ask.classList.add('compact');
      if (statusLine) statusLine.textContent = res.short ? 'Type at least three letters.' : (res.total ? plural(res.total, 'result', 'results') : 'No results') + ' for ' + q + '.';
      if (push && window.history && history.replaceState) history.replaceState(null, '', '?q=' + encodeURIComponent(q));
      doc.title = (res.short ? 'Search' : q + ' - search') + ' - Acaryapedia';
    }).catch(function () {
      if (statusLine) statusLine.textContent = 'The sample data could not be loaded here. Press Search to open the results page.';
    });
  }

  if (field && holder) {
    field.addEventListener('focus', function () { load().catch(function () {}); }, { once: true });
    var last = '';
    field.addEventListener('input', function () { if (field.value.trim() !== last) { last = field.value.trim(); if (last.length >= 3) run(last, true); } });
    form.addEventListener('submit', function (e) {
      if (!db) return;
      e.preventDefault(); run(field.value, true);
    });
    doc.querySelectorAll('a[data-try]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); field.value = a.getAttribute('data-try'); last = field.value; run(field.value, true); field.focus(); });
    });
    var qp = new URLSearchParams(location.search).get('q');
    if (qp) { field.value = qp; last = qp; run(qp, false); }
    doc.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(doc.activeElement.tagName)) { e.preventDefault(); field.focus(); field.select(); }
    });
  }

  /* verse.html: marks and the "you searched for" line appear only when the reader comes from a search (?q=) */
  var trail = doc.getElementById('trail');
  if (trail) {
    var term = (new URLSearchParams(location.search).get('q') || '').trim();
    if (term) {
      var n = highlight(doc.getElementById('main'), term);
      trail.querySelectorAll('[data-q]').forEach(function (el) { el.hidden = false; });
      trail.querySelector('.lab').hidden = true;
      trail.querySelector('.term').textContent = term;
      trail.querySelector('.count').textContent = n ? plural(n, 'match', 'matches') + ' on this page.' : 'No match on this page.';
      trail.querySelector('a.back').setAttribute('href', 'search.html?q=' + encodeURIComponent(term));
      trail.querySelector('input[name=q]').value = term;
    }
  }

  doc.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var src = doc.getElementById(btn.getAttribute('data-copy')), text = src.textContent.trim();
      var done = function () { var old = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = old; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
      else { var r = doc.createRange(); r.selectNodeContents(src); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); done(); }
    });
  });

  /* newsletter: the prototype confirms on screen and sends nothing */
  doc.querySelectorAll('form[data-news]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = f.querySelector('.news-done'); if (out) { out.hidden = false; out.textContent = 'Thank you. This is a prototype, so nothing was sent.'; }
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
