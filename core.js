/*
 * APA core: turns what someone typed into the form into CSL-JSON, formats it with
 * citeproc-js and the community APA 7 style, and applies the few APA rules the
 * style file leaves to the data. No page, no network: the tests run this directly.
 */
var APA = (function () {
  'use strict';
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SEASONS = { spring: 1, summer: 2, autumn: 3, fall: 3, winter: 4 };

  // ------------------------------------------------------------------ source types
  // f: the fields the form shows for this type. Labels and hints live in the page.
  var TYPES = {
    journal: { label: 'Journal article', csl: 'article-journal', f: ['authors', 'date', 'title', 'container', 'volume', 'issue', 'pages', 'articleNumber', 'doi', 'url'] },
    book: { label: 'Book', csl: 'book', f: ['authors', 'editors', 'date', 'title', 'edition', 'publisher', 'doi', 'url'] },
    chapter: { label: 'Chapter in an edited book', csl: 'chapter', f: ['authors', 'date', 'title', 'editors', 'container', 'edition', 'pages', 'publisher', 'doi', 'url'] },
    webpage: { label: 'Web page', csl: 'webpage', f: ['authors', 'date', 'title', 'container', 'url', 'accessed'] },
    news: { label: 'Newspaper article', csl: 'article-newspaper', f: ['authors', 'date', 'title', 'container', 'pages', 'url'] },
    magazine: { label: 'Magazine article', csl: 'article-magazine', f: ['authors', 'date', 'title', 'container', 'volume', 'issue', 'pages', 'doi', 'url'] },
    report: { label: 'Report or government document', csl: 'report', f: ['authors', 'date', 'title', 'reportType', 'reportNumber', 'publisher', 'doi', 'url'] },
    thesis: { label: 'Dissertation or thesis', csl: 'thesis', f: ['authors', 'date', 'title', 'thesisType', 'publisher', 'archive', 'url'] },
    conference: { label: 'Conference presentation', csl: 'speech', f: ['authors', 'date', 'title', 'presentationType', 'event', 'place', 'url'] },
    video: { label: 'Online video', csl: 'motion_picture', f: ['authors', 'date', 'title', 'platform', 'url'] },
    post: { label: 'Social media post', csl: 'post', f: ['authors', 'handle', 'date', 'title', 'postType', 'attachment', 'platform', 'url'] },
    dataset: { label: 'Data set', csl: 'dataset', f: ['authors', 'date', 'title', 'version', 'publisher', 'doi', 'url'] },
    entry: { label: 'Dictionary or encyclopedia entry', csl: 'entry-encyclopedia', f: ['authors', 'date', 'title', 'editors', 'container', 'publisher', 'url', 'accessed'] },
    ai: { label: 'AI-generated content', csl: 'software', f: ['authors', 'date', 'title', 'version', 'aiDescription', 'url'] }
  };
  var TEXT_KEYS = ['authors', 'editors', 'handle', 'date', 'title', 'description', 'container', 'volume', 'issue', 'pages', 'articleNumber', 'edition', 'publisher',
    'reportType', 'reportNumber', 'thesisType', 'archive', 'presentationType', 'event', 'place', 'platform', 'postType', 'attachment', 'version', 'aiDescription', 'doi', 'url', 'accessed', 'note'];

  // ------------------------------------------------------------------ small helpers
  function clean(s) { return String(s == null ? '' : s).replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim(); }
  function lines(s) { return String(s == null ? '' : s).split(/\n+/).map(clean).filter(Boolean); }
  function words(s) { return clean(s) ? clean(s).split(' ').length : 0; }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  // One name per line. "Surname, Given names" is a person; anything without a comma
  // is a group or organization, printed as written.
  var SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;
  function parseNames(text) {
    return lines(text).map(function (l) {
      var parts = l.split(',').map(clean).filter(Boolean);
      if (parts.length < 2) return { literal: l };
      var n = { family: parts[0], given: parts[1] };
      if (parts[2] && SUFFIX.test(parts[2])) n.suffix = parts[2];
      return n;
    });
  }
  function looksLikePerson(line) {
    var w = clean(line).split(' ');
    return line.indexOf(',') === -1 && w.length >= 2 && w.length <= 4 && w.every(function (x) { return /^[A-Z][a-z'’.-]+$|^[A-Z]\.$/.test(x); });
  }

  // Dates in any common form. Returns { csl, level } or null for "no date".
  function monthOf(s) {
    var k = String(s).toLowerCase().replace(/\.$/, '');
    for (var i = 0; i < 12; i++) if (MONTHS[i] === k || (k.length >= 3 && MONTHS[i].indexOf(k) === 0)) return i + 1;
    return 0;
  }
  function parseDate(raw) {
    var s = clean(raw).replace(/[–—]/g, '-');
    var m, y, mo, d, d2, mo2;
    if (!s || /^n\.?\s*d\.?$/i.test(s)) return null;
    if (/^in press$/i.test(s)) return { csl: { literal: 'in press' }, level: 'press' };
    if ((m = s.match(/^(\d{4})$/))) return { csl: { 'date-parts': [[+m[1]]] }, level: 'year' };
    if ((m = s.match(/^(spring|summer|autumn|fall|winter)\s*,?\s*(\d{4})$/i))) return { csl: { 'date-parts': [[+m[2]]], season: SEASONS[m[1].toLowerCase()] }, level: 'season' };
    if ((m = s.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/))) { y = +m[1]; mo = +m[2]; d = m[3] ? +m[3] : 0; }
    else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) { mo = +m[1]; d = +m[2]; y = +m[3]; }
    else if ((m = s.match(/^(\d{4}),?\s+([A-Za-z]+\.?)\s*(\d{1,2})?(?:\s*-\s*(\d{1,2}))?$/))) { y = +m[1]; mo = monthOf(m[2]); d = m[3] ? +m[3] : 0; d2 = m[4] ? +m[4] : 0; }
    else if ((m = s.match(/^([A-Za-z]+\.?)\s+(\d{1,2})(?:\s*-\s*(?:([A-Za-z]+\.?)\s+)?(\d{1,2}))?,?\s+(\d{4})$/))) { mo = monthOf(m[1]); d = +m[2]; mo2 = m[3] ? monthOf(m[3]) : 0; d2 = m[4] ? +m[4] : 0; y = +m[5]; }
    else if ((m = s.match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([A-Za-z]+\.?),?\s+(\d{4})$/))) { d = +m[1]; d2 = m[2] ? +m[2] : 0; mo = monthOf(m[3]); y = +m[4]; }
    else if ((m = s.match(/^([A-Za-z]+\.?),?\s+(\d{4})$/))) { mo = monthOf(m[1]); y = +m[2]; d = 0; }
    else return { csl: { literal: s }, level: 'raw' };
    if (!mo || mo > 12 || (d && d > 31) || (d2 && d2 > 31)) return { csl: { literal: s }, level: 'raw' };
    var a = [y, mo]; if (d) a.push(d);
    var parts = [a];
    if (d2) parts.push([y, mo2 || mo, d2]);
    return { csl: { 'date-parts': parts }, level: d ? (d2 ? 'range' : 'day') : 'month' };
  }
  function dateText(raw) {
    var p = parseDate(raw);
    if (!p) return '';
    if (p.level === 'raw' || p.level === 'press') return clean(raw);
    var a = p.csl['date-parts'][0];
    if (p.level === 'year') return String(a[0]);
    if (p.level === 'season') return clean(raw);
    return MONTH_NAMES[a[1] - 1] + (a[2] ? ' ' + a[2] + ',' : '') + ' ' + a[0];
  }

  function normDoi(raw) {
    var s = clean(raw);
    var m = s.match(/(?:doi\.org\/|^doi:\s*|^)(10\.\d{4,9}\/\S+)$/i);
    return m ? m[1].replace(/[.,;]$/, '') : '';
  }
  function edNumber(raw) {
    var m = clean(raw).match(/^(\d+)/);
    if (m) return m[1];
    var w = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 }[clean(raw).toLowerCase().split(' ')[0]];
    return w ? String(w) : clean(raw);
  }
  function sameName(a, b) { return clean(a).toLowerCase().replace(/^the /, '') === clean(b).toLowerCase().replace(/^the /, ''); }

  // ------------------------------------------------------------------ form -> CSL-JSON
  function toCSL(st, id) {
    var t = TYPES[st.type] || TYPES.journal;
    var on = {};
    t.f.forEach(function (k) { on[k] = true; });
    var v = function (k) { return on[k] ? clean(st[k]) : ''; };
    var it = { id: id || 'item', type: t.csl };
    var authors = on.authors ? parseNames(st.authors) : [];
    var editors = on.editors ? parseNames(st.editors) : [];
    if (authors.length) it.author = authors;
    if (editors.length) it.editor = editors;
    var d = parseDate(st.date);
    if (d) it.issued = d.csl;
    var title = v('title'), desc = clean(st.description);
    if (title) it.title = title;
    else if (desc) it.genre = desc;
    if (v('container')) it['container-title'] = v('container');
    if (v('volume')) it.volume = v('volume');
    if (v('issue')) it.issue = v('issue');
    if (v('pages')) it.page = v('pages').replace(/^pp?\.\s*/i, '');
    if (v('articleNumber')) it.number = v('articleNumber').replace(/^article\s*/i, '');
    if (v('edition') && edNumber(v('edition')) !== '1') it.edition = edNumber(v('edition'));
    if (v('publisher')) it.publisher = v('publisher');
    if (on.reportType || on.reportNumber) {
      var rn = v('reportNumber').replace(/^no\.\s*/i, '');
      if (v('reportType')) it.genre = v('reportType');
      // A hyphen in a report number would be read as a range ("Nos. 18–2059").
      if (rn) it.number = /[-–]/.test(rn) ? 'No. ' + rn : rn;
    }
    if (on.thesisType) {
      it.genre = v('thesisType') || 'Doctoral dissertation';
      if (v('archive')) it.archive = v('archive');
      // A thesis in no database or repository is unpublished: [Unpublished master's thesis].
      else if (!v('url') && !/^unpublished/i.test(it.genre)) it.genre = 'Unpublished ' + it.genre.charAt(0).toLowerCase() + it.genre.slice(1);
    }
    if (on.presentationType) { it.genre = v('presentationType') || 'Conference presentation'; if (v('event')) it['event-title'] = v('event'); if (v('place')) it['event-place'] = v('place'); }
    if (st.type === 'video') { it.genre = 'Video'; if (v('platform')) it.publisher = v('platform'); }
    if (st.type === 'post') {
      // An attachment comes first in its own brackets: [Image attached] [Tweet].
      var pt = v('postType') || 'Post';
      it.genre = v('attachment') ? v('attachment') + '] [' + pt : pt;
      if (v('platform')) it['container-title'] = v('platform');
    }
    if (on.version && v('version')) it.version = v('version').replace(/^v(ersion)?\.?\s*/i, '');
    if (st.type === 'ai') it.genre = v('aiDescription') || 'Large language model';
    var doi = on.doi ? normDoi(st.doi) : '';
    if (doi) it.DOI = doi;
    else if (v('url')) it.URL = v('url').replace(/^(?!https?:\/\/)(www\.)/i, 'https://$1');
    var acc = on.accessed ? parseDate(st.accessed) : null;
    if (acc && acc.csl['date-parts']) it.accessed = acc.csl;

    // APA leaves out a publisher or site name that repeats a group author.
    var soleOrg = authors.length === 1 && authors[0].literal ? authors[0].literal : '';
    if (soleOrg && it.publisher && sameName(soleOrg, it.publisher) && st.type !== 'video') delete it.publisher;
    if (soleOrg && it['container-title'] && st.type === 'webpage' && sameName(soleOrg, it['container-title'])) delete it['container-title'];
    return it;
  }

  // ------------------------------------------------------------------ formatting
  var STYLE = '', LOCALE = '';
  function setup(style, locale) { STYLE = style; LOCALE = locale; engine = null; }
  var engine = null, store = {};
  function getEngine() {
    if (!engine) {
      if (typeof CSL === 'undefined') throw new Error('citeproc-js is not loaded');
      engine = new CSL.Engine({ retrieveLocale: function () { return LOCALE; }, retrieveItem: function (id) { return store[id]; } }, STYLE, 'en-US');
    }
    return engine;
  }

  // Fixes the style file cannot make from the data alone.
  function after(item, st, html) {
    var out = html;
    // "Mar 14 version" reads as the APA blog gives it, not "Version Mar 14 version".
    if (item.version && /\bversion$/i.test(item.version)) out = out.split('(Version ' + item.version).join('(' + item.version);
    // A social media handle follows the name: Gates, B. [@BillGates].
    // Without a retrieval date the style still prints "Retrieved" before the URL.
    out = out.replace(/Retrieved (https?:\/\/)/, '$1');
    var h = clean(st.handle).replace(/^@?/, '@');
    if (st.type === 'post' && h !== '@' && item.author && item.author.length === 1) {
      var org = !!item.author[0].literal;
      out = out.replace(/^(.*?) \((\d{4}|n\.d\.)/, function (all, name, yr) { return (org ? name.replace(/\.$/, '') : name) + ' [' + h + ']. (' + yr; });
    }
    return out;
  }
  function stripTags(html) {
    return html.replace(/<[^>]+>/g, '').replace(/&#38;/g, '&').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#60;/g, '<').replace(/&#62;/g, '>');
  }
  function toMarkdown(html) { return stripTags(html.replace(/<\/?i>/g, '*')); }

  // entries: [{ id, st }]. Returns references sorted as APA sorts them, with a/b years
  // where one author has two works in a year, and an in-text maker for each source.
  function render(entries) {
    var eng = getEngine();
    store = {};
    // citeproc-js caches each item by id, so an edited source gets a new engine id:
    // the source's own id plus a hash of its content.
    var items = {}, key = {}, back = {};
    entries.forEach(function (e) {
      var it = toCSL(e.st, e.id), k = e.id + '~' + hash(JSON.stringify(it));
      it.id = k; items[e.id] = it; key[e.id] = k; back[k] = e.id; store[k] = it;
    });
    var ids = entries.map(function (e) { return key[e.id]; }).filter(function (k) { return hasContent(store[k]); });
    eng.updateItems(ids);
    var refs = {}, order = [];
    if (ids.length) {
      eng.setOutputFormat('html');
      var bib = eng.makeBibliography();
      bib[0].entry_ids.forEach(function (eid, n) {
        var id = back[eid[0]], st = entries.filter(function (e) { return e.id === id; })[0].st;
        var html = after(items[id], st, bib[1][n].replace(/^\s*<div class="csl-entry">|<\/div>\s*$/g, '').trim());
        refs[id] = { html: html, text: stripTags(html), md: toMarkdown(html) };
        order.push(id);
      });
    }
    function cite(id, opt) {
      opt = opt || {};
      if (!refs[id]) return null;
      var base = { id: key[id] }, sfx = '', loc = clean(opt.locator);
      if (loc) {
        if (opt.locType === 'page') { base.locator = loc.replace(/^pp?\.\s*/i, ''); base.label = 'page'; }
        else if (opt.locType === 'para') { base.locator = loc.replace(/^paras?\.\s*/i, ''); base.label = 'paragraph'; }
        else if (opt.locType === 'section') sfx = ', ' + loc.replace(/\s+section$/i, '') + ' section';
        else sfx = ', ' + loc;
      }
      if (sfx) base.suffix = sfx;
      // makeCitationCluster, unlike a preview, keeps the 2004a/2004b year suffixes.
      function one(extra) {
        var ci = Object.assign({}, base, extra || {});
        if (ci['author-only']) { delete ci.locator; delete ci.label; delete ci.suffix; }
        eng.setOutputFormat('html');
        return eng.makeCitationCluster([ci]);
      }
      // As cited in: (Allport, 1937, as cited in Nicholson, 2003) and Allport (1937, as cited in Nicholson, 2003).
      var orig = clean(opt.original), oy = clean(opt.originalYear);
      var paren = one(opt.secondary ? { prefix: (orig ? orig + ', ' : '') + (oy ? oy + ', ' : '') + 'as cited in ' } : null);
      var who = one({ 'author-only': true });
      // APA spells out "and" between two names in a narrative citation: Doe and Rivera (2022).
      var names = store[key[id]].author || store[key[id]].editor || [];
      if (names.length === 2) {
        var last = names[1].family || names[1].literal || '';
        var esc = last.replace(/&/g, '&#38;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        who = who.replace(new RegExp(' &#38; (' + esc + ')$'), ' and $1');
      }
      var rest = one({ 'suppress-author': true });
      if (!names.length) {
        // No author: the title stands in, in title case and keeping its italics or quotation marks.
        eng.setOutputFormat('html');
        var bare = eng.makeCitationCluster([{ id: key[id] }]).replace(/^\(|\)$/g, '');
        // The comma before the year can sit inside closing quotation marks: ("Title," 2020).
        var m = bare.match(/^([\s\S]*)(,\u201D?) [^,]*$/);
        if (m && m[1]) { var T = titleCaseWords(m[1]); paren = paren.split(m[1]).join(T); who = T + (m[2].length > 1 ? '\u201D' : ''); }
      }
      var narrative = opt.secondary
        ? (orig ? orig + ' ' : '') + one({ prefix: (oy ? oy + ', ' : '') + 'as cited in ' })
        : who + ' ' + rest;
      return { paren: paren, narrative: narrative, parenText: stripTags(paren), narrativeText: stripTags(narrative) };
    }
    function group(list) {
      var cis = list.filter(function (id) { return refs[id]; }).map(function (id) { return { id: key[id] }; });
      if (!cis.length) return '';
      eng.setOutputFormat('html');
      return eng.makeCitationCluster(cis);
    }
    return { refs: refs, order: order, cite: cite, group: group, items: items };
  }
  // APA title case capitalizes every word of four or more letters (6.17); citeproc leaves some lowercase.
  function titleCaseWords(html) {
    return html.replace(/(^|[\s\u201C"(\-\/>])([a-z])(?=[a-z\u2019']{3})/g, function (all, pre, c) { return pre + c.toUpperCase(); });
  }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function hasContent(it) { return !!(it && (it.title || it.genre || it.author || it.editor || it['container-title'] || it.URL || it.DOI)); }

  // ------------------------------------------------------------------ sentence case
  var SMALL = /^(a|an|and|as|at|but|by|for|from|in|into|nor|of|on|or|over|per|so|the|to|up|via|vs\.?|with|yet)$/i;
  function looksTitleCase(s) {
    var w = clean(s).split(' '), caps = 0, n = 0;
    w.forEach(function (x, i) {
      if (i === 0 || /[:?!]$/.test(w[i - 1] || '')) return;
      if (/^[a-z]/i.test(x) && x.length > 3 && !/^[A-Z0-9]{2,}$/.test(x)) { n++; if (/^[A-Z]/.test(x)) caps++; }
    });
    return n >= 2 && caps / n > 0.6;
  }
  // Lowercases every word that is not first, not after a colon, not an acronym and not
  // mixed case. Proper nouns get lowercased too, which is why the page asks to check.
  function sentenceCase(s) {
    var w = clean(s).split(' ');
    return w.map(function (x, i) {
      var start = i === 0 || /[:?!.]$/.test(w[i - 1]);
      if (/^[A-Z0-9]{2,}[s]?$/.test(x.replace(/[^A-Za-z0-9]/g, '')) || /[a-z][A-Z]/.test(x) || /\d/.test(x)) return x;
      var lead = x.match(/^[^A-Za-z]*/)[0], core = x.slice(lead.length);
      if (!core) return x;
      core = start ? core.charAt(0).toUpperCase() + core.slice(1) : core.charAt(0).toLowerCase() + core.slice(1);
      return lead + core;
    }).join(' ');
  }

  // ------------------------------------------------------------------ checks
  var DATABASE_HOSTS = /ebscohost\.com|proquest\.com|gale\.com|galegroup\.com|infotrac|lexisnexis|nexisuni|search\.ebsco|ezproxy|libproxy|\.idm\.oclc\.org|login\.|db\.|openurl/i;
  var CHANGING = { webpage: 1, entry: 1, dataset: 1 };
  function checks(st, opt) {
    opt = opt || {};
    var t = TYPES[st.type] || TYPES.journal, on = {}, out = [];
    t.f.forEach(function (k) { on[k] = true; });
    function add(level, msg, key) { out.push({ level: level, msg: msg, key: key || '' }); }
    var authors = on.authors ? lines(st.authors) : [], editors = on.editors ? lines(st.editors) : [];
    var title = clean(st.title), desc = clean(st.description);
    var empty = !authors.length && !title && !desc && !clean(st.container) && !clean(st.url) && !clean(st.doi);
    if (empty) return out;
    if (!title && !desc) add('fix', 'No title. A work without one takes a short description in square brackets instead: fill in "Description" under the title.', 'title');
    authors.concat(editors).forEach(function (l) { if (looksLikePerson(l)) add('check', '"' + l + '" looks like a person written first name first. Write people as Surname, Given names; a name without a comma is treated as a group.', 'authors'); });
    if (!authors.length && st.type === 'entry' && clean(st.publisher)) add('note', 'No author, so the publisher takes the author position, as APA does for dictionaries such as Merriam-Webster.', 'authors');
    else if (!authors.length && !editors.length) add('note', 'No author, so the title moves to the author position. If a group or organization wrote it, give that as the author instead.', 'authors');
    var d = parseDate(st.date);
    if (!clean(st.date)) add('note', 'No date: the reference shows (n.d.). Use it only when the source really has none.', 'date');
    else if (d && d.level === 'raw') add('check', 'The date was not recognized and is printed as typed. Try 2019, October 31, 2019, or 10/31/2019.', 'date');
    if (title && st.type !== 'post' && st.type !== 'ai' && looksTitleCase(title)) add('check', 'APA writes the titles of works in sentence case: capitalize only the first word, the first word after a colon, and proper nouns. Use Make sentence case, then put back any proper nouns.', 'title');
    if (on.container && clean(st.container) && /^[a-z]/.test(clean(st.container)) && /^(journal|news|magazine)$/.test(st.type)) add('check', 'Journal, newspaper, and magazine names keep their own capitalization, usually title case.', 'container');
    if (st.type === 'chapter' && clean(st.container) && (/^[a-z]/.test(clean(st.container)) || looksTitleCase(st.container))) add('check', 'The book title is in sentence case, like any book title: capitalize the first word, the first word after a colon, and proper nouns.', 'container');
    if (st.type === 'journal' && !normDoi(st.doi) && !clean(st.url)) add('note', 'No DOI. Most journal articles have one; look on the article page. Without a DOI, leave the link out if you found the article in a library database.', 'doi');
    if (on.doi && clean(st.doi) && !normDoi(st.doi)) add('fix', 'That does not look like a DOI. A DOI starts with 10. and contains a slash, such as 10.1037/ppm0000185.', 'doi');
    if (on.url && DATABASE_HOSTS.test(clean(st.url))) add('check', 'That looks like a library database link. Readers cannot open it, so APA leaves it out: use the DOI, or no link at all.', 'url');
    if (clean(st.accessed) && !CHANGING[st.type]) add('note', 'A retrieval date belongs only on pages that are designed to change. This type normally has none, so it is left out.', 'accessed');
    if (CHANGING[st.type] && st.type !== 'dataset' && on.accessed && !clean(st.accessed) && !parseDate(st.date)) add('note', 'If this page is designed to change and is not archived, such as a dictionary entry or a live statistic, add the date you looked at it under Retrieved. Otherwise leave it out.', 'accessed');
    if (/^(webpage|video|post|dataset|ai)$/.test(st.type) && !clean(st.url) && !normDoi(st.doi)) add('fix', 'This kind of source needs its URL so a reader can find it.', 'url');
    if (st.type === 'post' && words(title) > 20) add('check', 'APA gives the first 20 words of a post as its title. Cut it there.', 'title');
    if (st.type === 'ai' && !clean(st.version)) add('check', 'Give the model\'s version or the date of the version you used, for example Mar 14 version.', 'version');
    if (st.type === 'ai') add('note', 'Quote or describe the prompt you used in your paper, and check your instructor\'s policy on AI use.', '');
    if (st.type === 'chapter' && !editors.length) add('check', 'A chapter in an edited book names the book\'s editors after "In". Add them under Editors of the book.', 'editors');
    if (st.type === 'thesis' && !clean(st.publisher)) add('fix', 'Give the university that awarded the degree.', 'publisher');
    if (authors.length > 20) add('note', authors.length + ' authors: APA lists the first 19, an ellipsis, and the last author.', 'authors');
    if (opt.quote && !clean(opt.locator)) add('check', 'A direct quotation needs a page number, or a paragraph number or section name if there are no pages.', 'locator');
    var order = { fix: 0, check: 1, note: 2 };
    out.sort(function (a, b) { return order[a.level] - order[b.level]; });
    return out;
  }

  // ------------------------------------------------------------------ list files and exports
  function listFile(name, saved, refsText) {
    return JSON.stringify({
      app: 'APA Citation Generator', format: 1, name: name || '', savedAt: new Date().toISOString(),
      sources: saved.map(function (x) {
        var fields = { type: x.st.type };
        TEXT_KEYS.forEach(function (k) { if (clean(x.st[k])) fields[k] = x.st[k]; });
        return { id: x.id, reference: (refsText && refsText[x.id]) || '', fields: fields };
      })
    }, null, 2);
  }
  function parseListFile(text) {
    var j;
    try { j = JSON.parse(text); } catch (e) { return { error: 'That file is not a list file: it could not be read as JSON.' }; }
    if (!j || !Array.isArray(j.sources)) return { error: 'That file has no list of sources in it.' };
    var items = [];
    j.sources.forEach(function (s, n) {
      var f = s && (s.fields || s.st);
      if (!f || typeof f !== 'object') return;
      var st = { type: TYPES[f.type] ? f.type : 'journal' };
      TEXT_KEYS.forEach(function (k) { st[k] = typeof f[k] === 'string' ? f[k] : (Array.isArray(f[k]) ? f[k].join('\n') : ''); });
      items.push({ id: typeof s.id === 'string' && s.id ? s.id : 'src-' + Date.now() + '-' + n, st: st });
    });
    return { name: typeof j.name === 'string' ? j.name : '', items: items };
  }
  function mdText(name, mds) {
    return (name ? '# ' + name + '\n\n' : '') + '## References\n\n' + mds.join('\n\n') + '\n';
  }

  // A minimal Word file: "References" centered in bold, then each entry double-spaced
  // with a half-inch hanging indent, Times New Roman 12, italics kept.
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  function zip(files) {
    var parts = [], central = [], off = 0;
    function u16(n) { return [n & 255, (n >>> 8) & 255]; }
    function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = utf8(f.name), data = utf8(f.data), crc = crc32(data);
      var head = [].concat([0x50, 0x4b, 3, 4], u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push(new Uint8Array([].concat([0x50, 0x4b, 1, 2], u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), name);
      off += head.length + name.length + data.length;
    });
    var csize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var end = new Uint8Array([].concat([0x50, 0x4b, 5, 6], u16(0), u16(0), u16(files.length), u16(files.length), u32(csize), u32(off), u16(0)));
    var all = parts.concat(central, [end]), len = all.reduce(function (a, b) { return a + b.length; }, 0), out = new Uint8Array(len), p = 0;
    all.forEach(function (b) { out.set(b, p); p += b.length; });
    return out;
  }
  function xesc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function runsXml(html) {
    var out = [], re = /<i>(.*?)<\/i>|([^<]+)|<[^>]+>/g, m;
    while ((m = re.exec(html))) {
      if (m[1] != null) out.push('<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">' + xesc(stripTags(m[1])) + '</w:t></w:r>');
      else if (m[2] != null) out.push('<w:r><w:t xml:space="preserve">' + xesc(stripTags(m[2])) + '</w:t></w:r>');
    }
    return out.join('');
  }
  function docxBytes(htmls) {
    var W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    var body = '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:line="480" w:lineRule="auto" w:after="0"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>References</w:t></w:r></w:p>'
      + htmls.map(function (h) { return '<w:p><w:pPr><w:spacing w:line="480" w:lineRule="auto" w:after="0"/><w:ind w:left="720" w:hanging="720"/></w:pPr>' + runsXml(h) + '</w:p>'; }).join('');
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + W + '><w:body>' + body
      + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + W + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
    return zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'word/document.xml', data: doc },
      { name: 'word/styles.xml', data: styles }
    ]);
  }

  return {
    TYPES: TYPES, TEXT_KEYS: TEXT_KEYS, setup: setup, toCSL: toCSL, render: render, checks: checks,
    parseNames: parseNames, parseDate: parseDate, dateText: dateText, normDoi: normDoi, sentenceCase: sentenceCase, looksTitleCase: looksTitleCase,
    listFile: listFile, parseListFile: parseListFile, mdText: mdText, docxBytes: docxBytes, stripTags: stripTags, toMarkdown: toMarkdown
  };
})();
if (typeof module !== 'undefined') module.exports = APA;
