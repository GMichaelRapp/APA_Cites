(function () {
  'use strict';
  var A = APA;
  function $(id) { return document.getElementById(id); }
  A.setup(window.APA_STYLE, window.APA_LOCALE);

  // ------------------------------------------------------------------ what each type asks for
  var PERSON_HINT = 'One per line. People as Surname, Given names (Jackson, Lynne M.). A group or organization as written (World Health Organization). Initials are worked out for you.';
  var LABELS = {
    authors: { video: 'Person or channel that posted it', post: 'Person or group that posted it', ai: 'Company that made the model', webpage: 'Author or organization', report: 'Author or agency', dataset: 'Author or organization' },
    container: { journal: 'Journal', webpage: 'Site name', news: 'Newspaper', magazine: 'Magazine', chapter: 'Title of the book', entry: 'Dictionary or encyclopedia' },
    publisher: { thesis: 'University that awarded the degree', report: 'Publisher', dataset: 'Publisher', entry: 'Publisher', book: 'Publisher', chapter: 'Publisher' },
    title: { post: 'Words of the post (up to the first 20)', ai: 'Name of the model or tool', chapter: 'Title of the chapter', entry: 'Title of the entry', journal: 'Title of the article', news: 'Title of the article', magazine: 'Title of the article', webpage: 'Title of the page', video: 'Title of the video' },
    platform: { video: 'Where it was posted', post: 'Platform' },
    version: { ai: 'Version', dataset: 'Version' },
    editors: { chapter: 'Editors of the book', book: 'Editors (if the book has editors instead of authors)', entry: 'Editors of the reference work' }
  };
  var HINTS = {
    title: { _: 'Sentence case: capitalize only the first word, the first word after a colon, and proper nouns.', post: 'Copy the post\'s own words exactly, emoji and hashtags included, up to the first 20 words.', ai: 'The model\'s name as its maker gives it, such as ChatGPT.' },
    container: { _: 'Keep the publication\'s own capitalization.', webpage: 'Leave blank if it is the same as the author.', chapter: 'Sentence case, like any book title.', entry: 'The name of the dictionary or encyclopedia, in sentence case.' },
    publisher: { _: 'Leave blank if the publisher is the same as the author.', thesis: '', report: 'Leave blank if the author is also the publisher.' },
    url: { _: 'Only if there is no DOI. Leave out library database links.', webpage: '', video: '', post: '', ai: 'The page where people use the model, such as https://chat.openai.com/chat.' },
    date: { _: 'Any common form: 2019, October 31, 2019, 10/31/2019, Spring 2020, in press. Blank gives (n.d.).', journal: 'The year is enough for a journal article.', book: 'The year is enough for a book.', chapter: 'The year is enough for a book chapter.', conference: 'For a multi-day event, a range: August 8-11, 2019.' },
    authors: { _: PERSON_HINT, video: 'The person or channel name exactly as it appears where the video was posted.', post: 'The real name if known, Surname, Given names. Put the @handle in Handle.', ai: 'The company or organization that made the model, such as OpenAI.' },
    editors: { _: '', chapter: 'Shown after "In": In R. F. Subotnik & F. C. Worrell (Eds.).' }
  };
  function pick(table, type) { return table && (has(table, type) ? table[type] : table._); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  // Examples use placeholder names and an example.org address. They show the form only.
  var SAMPLES = {
    journal: { authors: 'Doe, Jane A.\nRivera, Luis', date: '2022', title: 'Reading habits of first-year college students: A mixed-methods study', container: 'Journal of Example Studies', volume: '14', issue: '2', pages: '115-131', doi: '10.1234/example.2022.0042' },
    book: { authors: 'Doe, Jane A.', date: '2021', title: 'Writing with sources: A practical guide', edition: '3rd', publisher: 'Example University Press' },
    chapter: { authors: 'Rivera, Luis', date: '2020', title: 'Citing sources in the digital age', editors: 'Doe, Jane A.\nKim, Soo-Ah', container: 'Research writing across the disciplines', pages: '45-62', publisher: 'Example University Press' },
    webpage: { authors: 'Example Health Institute', date: 'March 3, 2023', title: 'How to read a nutrition label', url: 'https://www.example.org/nutrition-labels' },
    news: { authors: 'Doe, Jane A.', date: 'June 14, 2024', title: 'City council approves new library hours', container: 'The Example Tribune', url: 'https://www.example.com/2024/06/14/library-hours' },
    magazine: { authors: 'Rivera, Luis', date: 'May 2023', title: 'The quiet return of handwriting', container: 'Example Monthly', volume: '41', issue: '5', pages: '22-27' },
    report: { authors: 'Example Department of Education', date: '2022', title: 'Community college completion rates, 2015–2020', reportType: 'Report', reportNumber: 'ED-2022-07', url: 'https://www.example.gov/reports/completion-2022' },
    thesis: { authors: 'Doe, Jane A.', date: '2019', title: 'Peer tutoring and persistence in first-year composition', thesisType: 'Doctoral dissertation', publisher: 'Example State University', archive: 'ProQuest Dissertations and Theses Global' },
    conference: { authors: 'Doe, Jane A.\nRivera, Luis', date: 'April 4-6, 2024', title: 'Teaching citation as a habit, not a format', presentationType: 'Paper presentation', event: 'Example Conference on College Writing', place: 'Albuquerque, NM, United States' },
    video: { authors: 'Example Writing Center', date: 'August 28, 2023', title: 'How to write an annotated bibliography', platform: 'YouTube', url: 'https://www.youtube.com/watch?v=EXAMPLE0000' },
    post: { authors: 'Example Library', handle: '@ExampleLibrary', date: 'September 7, 2024', title: 'Extended hours start Monday: open until midnight through finals week', postType: 'Post', platform: 'X', url: 'https://x.com/ExampleLibrary/status/1234567890' },
    dataset: { authors: 'Example Research Center', date: '2023', title: 'Student media use survey, wave 3', version: '2', url: 'https://www.example.org/data/media-use-wave-3' },
    entry: { authors: 'Example Encyclopedia Editors', title: 'Citation', container: 'Example encyclopedia of research methods', url: 'https://www.example.org/encyclopedia/citation', accessed: 'October 12, 2026' },
    ai: { authors: 'OpenAI', date: '2023', title: 'ChatGPT', version: 'Mar 14 version', url: 'https://chat.openai.com/chat' }
  };

  var TIPS = [
    ['#h-type', 'The type decides which details APA asks for and how the entry is put together. Pick the one that matches what you actually read: an article you read in a journal is a journal article even if you found it through a website.'],
    ['#h-who', 'APA lists up to 20 authors. In-text citations name one or two authors; three or more become the first author and et al. from the first citation on.'],
    ['#h-when', 'The date the work was published. Journal articles and books take the year only; newspapers, web pages, videos, and posts take the full date. No date at all gives (n.d.).'],
    ['#h-what', 'APA puts titles of works in sentence case. Titles of standalone works such as books, reports, and videos are italic; parts of something larger, such as articles and chapters, are not.'],
    ['#h-where', 'The source element: the journal, book, site, or publisher that holds the work. Journal and newspaper names keep their usual capitals and are italic; for a journal, the volume is italic and the issue is not.'],
    ['#h-link', 'APA ends the entry with a DOI or URL so readers can find the source. A DOI is preferred whenever one exists. A retrieval date is added only for pages meant to change, such as an undated dictionary entry or a live statistic.'],
    ['#h-intext', 'Every source in the reference list needs at least one in-text citation. Quotations must give a page, paragraph, or section; for paraphrases APA encourages it.'],
    ['#lab-ref', 'Goes in the reference list at the end of the paper, double-spaced with a half-inch hanging indent. Copy with italics keeps the formatting in Word and Google Docs.'],
    ['#lab-intext', 'Parenthetical: the citation sits in parentheses at the end of the sentence, before the period. Narrative: the author is part of your sentence, with the year right after the name. Use the past tense to introduce sources: Doe (2022) found.'],
    ['#lab-checks', 'Fix means something is missing or wrong. Check means look again. Note is a reminder or a rule worth knowing.'],
    ['#lab-list', 'Add each source as you go. The list sorts itself alphabetically by author, and adds 2022a and 2022b when one author has two works from the same year.'],
    ['#lab-file', 'Saves every source, with all its fields, to a .json file on your device. Open it here later, on any computer, to keep working. Nothing is uploaded.'],
    ['label[for="authors"]', PERSON_HINT],
    ['label[for="title"]', 'Copy the title from the work itself, then put it in sentence case. Keep capitals on proper nouns, acronyms, and the first word after a colon.'],
    ['label[for="doi"]', 'A DOI (digital object identifier) is a permanent link. It usually appears on the first page of an article or on the publisher\'s page, and starts with 10.']
  ];

  // ------------------------------------------------------------------ state
  var K_DRAFT = 'apa-cite-draft-v1', K_LIST = 'apa-cite-list-v1', K_THEME = 'apa-cite-theme-v1';
  var saved = [], editingId = null, picked = {}, statusTimer = null, lastRender = null, usingSample = true, currentId = '__current';
  function sameSource(a, b) { return a.type === b.type && A.TEXT_KEYS.every(function (k) { return String(a[k] || '').trim() === String(b[k] || '').trim(); }); }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function currentType() { var r = document.querySelector('input[name="type"]:checked'); return r ? r.value : 'journal'; }
  function read() {
    var st = { type: currentType() };
    A.TEXT_KEYS.forEach(function (k) { var el = $(k); st[k] = el ? el.value : ''; });
    return st;
  }
  function write(st) {
    var r = $('type-' + (A.TYPES[st.type] ? st.type : 'journal')); if (r) r.checked = true;
    A.TEXT_KEYS.forEach(function (k) {
      var el = $(k); if (!el) return;
      if (el.tagName === 'SELECT') el.value = st[k] || el.options[0].value; else el.value = st[k] || '';
    });
  }
  function blank(type) { var st = { type: type }; A.TEXT_KEYS.forEach(function (k) { st[k] = ''; }); return st; }
  function sample(type) { return Object.assign(blank(type), SAMPLES[type] || {}); }
  function intextOpts() {
    var t = $('locType').value;
    return { locType: t === 'time' ? 'other' : t, locator: t ? $('locator').value : '', quote: $('quote').checked, secondary: $('secondary').checked, original: $('original').value, originalYear: $('originalYear').value };
  }

  // ------------------------------------------------------------------ paint
  function dress() {
    var type = currentType(), t = A.TYPES[type], on = {};
    t.f.forEach(function (k) { on[k] = true; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-f]'), function (el) { el.hidden = !on[el.getAttribute('data-f')]; });
    ['s-where'].forEach(function (id) { var any = Array.prototype.some.call($(id).querySelectorAll('[data-f]'), function (el) { return !el.hidden; }); $(id).hidden = !any; });
    Array.prototype.forEach.call(document.querySelectorAll('#s-where .row'), function (row) { row.hidden = !Array.prototype.some.call(row.querySelectorAll('[data-f]'), function (el) { return !el.hidden; }); });
    function setText(id, v) { if ($(id)) $(id).textContent = v; }
    setText('authorsLabel', pick(LABELS.authors, type) || 'Authors');
    setText('containerLabel', pick(LABELS.container, type) || 'Published in');
    setText('publisherLabel', pick(LABELS.publisher, type) || 'Publisher');
    setText('titleLabel', pick(LABELS.title, type) || 'Title');
    setText('platformLabel', pick(LABELS.platform, type) || 'Platform');
    setText('versionLabel', pick(LABELS.version, type) || 'Version');
    setText('editorsLabel', pick(LABELS.editors, type) || 'Editors');
    ['title', 'container', 'publisher', 'url', 'date', 'authors', 'editors'].forEach(function (k) { setText(k + 'Hint', pick(HINTS[k], type) || ''); });
    $('authors').placeholder = type === 'ai' ? 'OpenAI' : type === 'video' ? 'Example Writing Center' : 'Surname, Given names (one per line)';
    $('version').placeholder = type === 'ai' ? 'Mar 14 version' : '2';
    $('platform').placeholder = type === 'video' ? 'YouTube' : 'X';
    $('publisher').placeholder = type === 'thesis' ? 'University of Arizona' : 'Example University Press';
    $('container').placeholder = { journal: 'Journal of Example Studies', webpage: 'Example Health Institute', news: 'The New York Times', magazine: 'Scientific American', chapter: 'Title of the edited book', entry: 'APA dictionary of psychology' }[type] || '';
  }
  function setStatus(msg, bad) {
    var s = $('status'); s.textContent = msg; s.className = 'status' + (bad ? ' bad' : '');
    clearTimeout(statusTimer); if (!bad) statusTimer = setTimeout(function () { s.textContent = ''; }, 2600);
  }
  function render() {
    var st = read(), opts = intextOpts();
    $('locWrap').hidden = !$('locType').value;
    $('locatorLabel').textContent = { page: 'Page or page range', para: 'Paragraph number', section: 'Section heading', time: 'Timestamp', other: 'What to give' }[$('locType').value] || '';
    $('locator').placeholder = { page: '45 or 45-47', para: '5', section: 'Osteoarthritis', time: '1:02:15', other: 'Table 2' }[$('locType').value] || '';
    $('origWrap').hidden = !$('secondary').checked;
    $('caseRow').hidden = !(st.title && st.type !== 'post' && st.type !== 'ai' && A.looksTitleCase(st.title));
    // If the form holds a source that is already in the list, it is that source, not a
    // second work by the same author (which would wrongly earn 2018a and 2018b).
    var same = editingId ? null : saved.filter(function (x) { return sameSource(x.st, st); })[0];
    var cur = same ? same.id : '__current';
    var entries = saved.filter(function (x) { return x.id !== editingId; }).map(function (x) { return { id: x.id, st: x.st }; });
    if (!same) entries.push({ id: '__current', st: st });
    var r;
    try { r = A.render(entries); } catch (e) { r = null; setStatus('Something went wrong formatting this source: ' + e.message, true); }
    lastRender = r; currentId = cur;
    var ref = r && r.refs[cur], c = ref ? r.cite(cur, opts) : null;
    var el = $('ref');
    if (ref) { el.className = 'ref'; el.innerHTML = ref.html; } else { el.className = 'ref empty'; el.textContent = 'Fill in a few details and the reference appears here.'; }
    $('paren').innerHTML = c ? c.paren : ''; $('narr').innerHTML = c ? c.narrative : '';
    ['copyRef', 'copyRefPlain', 'copyParen', 'copyNarr', 'addBtn'].forEach(function (id) { $(id).disabled = !ref; });
    $('intextHint').textContent = !c ? '' : opts.secondary ? 'Only the source you actually read goes in the reference list. The original author appears only in the citation.'
      : (st.authors && A.parseNames(st.authors).length >= 3) ? 'Three or more authors: the first author and et al., from the first citation on.'
      : 'In a narrative citation the year follows the name. A page number can go there or at the end of the sentence: Doe (2022) found ... (p. 118).';
    var ul = $('checks'); ul.textContent = '';
    var cs = A.checks(st, opts);
    cs.forEach(function (x) {
      var li = document.createElement('li'), tag = document.createElement('span'), msg = document.createElement('span');
      tag.className = 'tag ' + x.level; tag.textContent = x.level; msg.textContent = x.msg;
      li.appendChild(tag); li.appendChild(msg); ul.appendChild(li);
    });
    $('allclear').hidden = !ref || cs.some(function (x) { return x.level !== 'note'; });
    $('addBtn').textContent = editingId ? 'Update in my list' : same ? 'Already in my list' : 'Add to my list';
    if (same) $('addBtn').disabled = true;
    renderSaved();
    store(K_DRAFT, { st: st, sample: usingSample });
  }
  function renderSaved() {
    var r = lastRender, ul = $('saved');
    ul.textContent = '';
    var order = r ? r.order.filter(function (id) { return id !== '__current'; }) : [];
    saved.forEach(function (x) { if (order.indexOf(x.id) === -1) order.push(x.id); });
    order.forEach(function (id) {
      var item = saved.filter(function (x) { return x.id === id; })[0]; if (!item) return;
      var li = document.createElement('li'), box = document.createElement('input'), txt = document.createElement('span'), row = document.createElement('div');
      box.type = 'checkbox'; box.checked = !!picked[id]; box.setAttribute('aria-label', 'Tick to cite together');
      box.addEventListener('change', function () { picked[id] = box.checked; paintGroup(); });
      txt.className = 'txt';
      if (r && r.refs[id]) txt.innerHTML = r.refs[id].html; else txt.textContent = item.id === editingId ? '(open in the form)' : '(empty source)';
      row.className = 'actions';
      [['Edit', function () { editingId = id; usingSample = false; write(item.st); dress(); render(); $('authors').focus(); }],
       ['Remove', function () { saved = saved.filter(function (x) { return x.id !== id; }); delete picked[id]; if (editingId === id) editingId = null; store(K_LIST, saved); render(); }]
      ].forEach(function (a) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn quiet small'; b.textContent = a[0]; b.addEventListener('click', a[1]); row.appendChild(b); });
      li.appendChild(box); li.appendChild(txt); li.appendChild(row); ul.appendChild(li);
    });
    $('savedCount').textContent = saved.length ? '(' + saved.length + ')' : '';
    $('savedEmpty').hidden = saved.length > 0;
    $('savedTools').hidden = saved.length === 0;
    $('saveFile').disabled = saved.length === 0;
    paintGroup();
  }
  function paintGroup() {
    var ids = saved.map(function (x) { return x.id; }).filter(function (id) { return picked[id]; });
    $('group').innerHTML = ids.length >= 2 && lastRender ? lastRender.group(ids) : '<span class="hint">Tick two or more sources.</span>';
    $('copyGroup').disabled = ids.length < 2;
  }
  function listRefs() {
    var r = lastRender; if (!r) return [];
    return r.order.filter(function (id) { return id !== '__current' && saved.some(function (x) { return x.id === id; }); }).map(function (id) { return r.refs[id]; });
  }

  // ------------------------------------------------------------------ clipboard
  function byHand(text) { var b = $('fallbackBox'); b.hidden = false; b.value = text; b.focus(); b.select(); setStatus('The clipboard is blocked here. The text is selected below: press Ctrl+C or Cmd+C.', true); }
  function copyText(text, ok) { $('fallbackBox').hidden = true; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { setStatus(ok); }, function () { byHand(text); }); else byHand(text); }
  function copyRich(html, text, ok) {
    $('fallbackBox').hidden = true;
    try {
      if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob(['<span>' + html + '</span>'], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(function () { setStatus(ok); }, function () { copyText(text, ok); });
        return;
      }
    } catch (e) {}
    copyText(text, ok);
  }

  // ------------------------------------------------------------------ files
  var inViewer = !!(window.claude && typeof window.claude.use === 'function'), dl = Promise.resolve(null);
  if (inViewer) { try { dl = Promise.resolve(window.claude.use('downloads')).catch(function () { return null; }); } catch (e) {} }
  function fileSay(msg, bad) { var s = $('fileMsg'); s.textContent = msg; s.className = 'filemsg' + (bad ? ' bad' : ''); }
  function giveFile(name, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    if (inViewer) return dl.then(function (d) { return d ? d.save({ filename: name, data: blob }).then(function () { return true; }, function () { return false; }) : false; });
    try { var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); return Promise.resolve(true); }
    catch (e) { return Promise.resolve(false); }
  }
  function saveListFile() {
    var refs = {}; if (lastRender) Object.keys(lastRender.refs).forEach(function (id) { refs[id] = lastRender.refs[id].text; });
    giveFile('apa-reference-list.json', A.listFile('', saved, refs), 'application/json').then(function (ok) { fileSay(ok ? 'Saved apa-reference-list.json.' + (inViewer ? '' : ' Look in your downloads folder.') : 'The file could not be saved from this view.', !ok); });
  }
  function openListFile(text, name) {
    var res = A.parseListFile(text);
    if (res.error) { fileSay(res.error, true); return; }
    var have = {}, added = 0; saved.forEach(function (x) { have[x.id] = 1; });
    res.items.forEach(function (x) { if (!have[x.id]) { saved.push(x); added++; } });
    store(K_LIST, saved); render();
    fileSay('Opened ' + name + ': ' + added + ' source' + (added === 1 ? '' : 's') + ' added' + (added < res.items.length ? ', ' + (res.items.length - added) + ' already in your list' : '') + '.');
  }

  // ------------------------------------------------------------------ build and wire
  (function () {
    var box = $('types');
    Object.keys(A.TYPES).forEach(function (k) {
      var lab = document.createElement('label'); lab.className = 'chip';
      var inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'type'; inp.value = k; inp.id = 'type-' + k;
      var sp = document.createElement('span'); sp.textContent = A.TYPES[k].label;
      lab.appendChild(inp); lab.appendChild(sp); box.appendChild(lab);
      inp.addEventListener('change', function () { if (usingSample) write(sample(k)); dress(); render(); });
    });
  })();
  var pending = null;   // typing redraws at most every 60 ms, which keeps long lists smooth
  $('f').addEventListener('input', function (e) { if (e.target.name !== 'type' && A.TEXT_KEYS.indexOf(e.target.id) !== -1) usingSample = false; clearTimeout(pending); pending = setTimeout(render, 60); });
  $('f').addEventListener('change', function (e) { if (e.target.name !== 'type') render(); });
  $('f').addEventListener('submit', function (e) { e.preventDefault(); });
  $('date').addEventListener('blur', function () { var t = A.dateText($('date').value), p = A.parseDate($('date').value); if (p && p.level !== 'raw' && p.level !== 'range' && t) { $('date').value = t; render(); } });
  $('todayBtn').addEventListener('click', function () { var d = new Date(); $('accessed').value = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); usingSample = false; render(); });
  $('caseBtn').addEventListener('click', function () { $('title').value = A.sentenceCase($('title').value); usingSample = false; render(); $('title').focus(); });
  $('clearBtn').addEventListener('click', function () { usingSample = false; editingId = null; write(blank(currentType())); dress(); render(); $('authors').focus(); });
  $('sampleBtn').addEventListener('click', function () { usingSample = true; editingId = null; write(sample(currentType())); dress(); render(); });
  $('copyRef').addEventListener('click', function () { var r = lastRender.refs[currentId]; copyRich(r.html, r.text, 'Reference copied with italics.'); });
  $('copyRefPlain').addEventListener('click', function () { copyText(lastRender.refs[currentId].text, 'Reference copied as plain text.'); });
  $('copyParen').addEventListener('click', function () { var c = lastRender.cite(currentId, intextOpts()); copyRich(c.paren, c.parenText, 'Parenthetical citation copied.'); });
  $('copyNarr').addEventListener('click', function () { var c = lastRender.cite(currentId, intextOpts()); copyRich(c.narrative, c.narrativeText, 'Narrative citation copied.'); });
  $('addBtn').addEventListener('click', function () {
    var st = read();
    if (editingId) { saved.forEach(function (x) { if (x.id === editingId) x.st = st; }); editingId = null; setStatus('Updated in your list.'); }
    else { saved.push({ id: 'src-' + Date.now() + '-' + Math.floor(Math.random() * 1e6), st: st }); setStatus('Added to your list.'); }
    store(K_LIST, saved); render();
  });
  $('copyList').addEventListener('click', function () { var refs = listRefs(); copyRich(refs.map(function (r) { return '<p>' + r.html + '</p>'; }).join(''), refs.map(function (r) { return r.text; }).join('\n'), 'Reference list copied, ' + refs.length + ' entries in APA order.'); });
  $('copyGroup').addEventListener('click', function () { var h = $('group').innerHTML; copyRich(h, A.stripTags(h), 'Citation copied.'); });
  $('expDocx').addEventListener('click', function () { var refs = listRefs(); giveFile('references.docx', new Blob([A.docxBytes(refs.map(function (r) { return r.html; }))], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).then(function (ok) { fileSay(ok ? 'Exported references.docx.' : 'The file could not be saved from this view.', !ok); }); });
  $('expMd').addEventListener('click', function () { var refs = listRefs(); giveFile('references.md', A.mdText('', refs.map(function (r) { return r.md; })), 'text/markdown').then(function (ok) { fileSay(ok ? 'Exported references.md.' : 'The file could not be saved from this view.', !ok); }); });
  var clearArmed = false;
  $('clearList').addEventListener('click', function () {
    var b = $('clearList');
    if (!clearArmed) { clearArmed = true; b.textContent = 'Click again to empty the list'; setTimeout(function () { clearArmed = false; b.textContent = 'Empty the list'; }, 4000); return; }
    clearArmed = false; b.textContent = 'Empty the list'; saved = []; picked = {}; editingId = null; store(K_LIST, saved); render();
  });
  $('saveFile').addEventListener('click', saveListFile);
  $('openFile').addEventListener('click', function () { $('pickFile').click(); });
  $('pickFile').addEventListener('change', function () { var f = $('pickFile').files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { $('pickFile').value = ''; openListFile(String(rd.result), f.name); }; rd.readAsText(f); });

  // theme
  ['themeAuto', 'themeLight', 'themeDark'].forEach(function (id) {
    $(id).addEventListener('change', function () { var v = $(id).value; store(K_THEME, v); if (v === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', v); });
  });

  // tips
  var tipBox = document.createElement('div'), tipFor = null, tipPinned = false;
  tipBox.className = 'tipbox'; tipBox.id = 'tipBox'; tipBox.setAttribute('role', 'tooltip'); tipBox.hidden = true;
  document.body.appendChild(tipBox);
  TIPS.forEach(function (t) {
    var el = document.querySelector(t[0]); if (!el) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'tip'; b.textContent = '?'; b.tabIndex = -1; b.dataset.tip = t[1];
    b.setAttribute('aria-label', 'About ' + el.textContent.trim().replace(/\s*\(\d+\)$/, '')); b.setAttribute('aria-expanded', 'false');
    if (el.tagName === 'H2') { el.appendChild(b); return; }
    var row = document.createElement(el.parentNode.classList.contains('eyebrow') ? 'span' : 'div'); row.className = 'labrow';
    el.parentNode.insertBefore(row, el); row.appendChild(el); row.appendChild(b);
  });
  function placeTip() {
    if (!tipFor) return;
    var r = tipFor.getBoundingClientRect(), w = tipBox.offsetWidth, h = tipBox.offsetHeight, vw = document.documentElement.clientWidth;
    if (r.bottom < 0 || r.top > innerHeight) { hideTip(); return; }
    var top = r.top - h - 8; if (top < 8) top = r.bottom + 8;
    tipBox.style.left = Math.max(12, Math.min(r.left + r.width / 2 - w / 2, vw - w - 12)) + 'px'; tipBox.style.top = top + 'px';
  }
  function showTip(b, pin) { if (tipFor && tipFor !== b) hideTip(); tipBox.textContent = b.dataset.tip; tipBox.hidden = false; tipFor = b; tipPinned = !!pin; b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-describedby', 'tipBox'); placeTip(); }
  function hideTip() { if (!tipFor) return; tipFor.setAttribute('aria-expanded', 'false'); tipFor.removeAttribute('aria-describedby'); tipFor = null; tipPinned = false; tipBox.hidden = true; }
  function tipOf(e) { return e.target && e.target.closest ? e.target.closest('.tip') : null; }
  document.addEventListener('mouseover', function (e) { var b = tipOf(e); if (b && tipFor !== b) showTip(b, false); });
  document.addEventListener('mouseout', function (e) { var b = tipOf(e); if (b && tipFor === b && !tipPinned) hideTip(); });
  document.addEventListener('click', function (e) { var b = tipOf(e); if (!b) { hideTip(); return; } e.preventDefault(); if (tipFor === b && tipPinned) hideTip(); else showTip(b, true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', placeTip, true); window.addEventListener('resize', placeTip);

  // boot
  var th = load(K_THEME); if (th === 'light' || th === 'dark') $(th === 'light' ? 'themeLight' : 'themeDark').checked = true;
  var list = load(K_LIST); if (Array.isArray(list)) saved = list.filter(function (x) { return x && x.st && A.TYPES[x.st.type]; });
  var draft = load(K_DRAFT);
  if (draft && draft.st && A.TYPES[draft.st.type]) { usingSample = !!draft.sample; write(draft.st); } else { usingSample = true; write(sample('journal')); }
  dress(); render();
})();
