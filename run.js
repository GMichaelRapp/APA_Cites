#!/usr/bin/env node
/*
 * Tests for the APA Citation Generator. Run from the repository root:  node Tests/run.js
 * Needs Node 18 or later and nothing else. It loads index.html, runs the embedded
 * citeproc-js engine, APA style, and the page's own core, and checks known inputs
 * against the reference forms APA publishes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = (id) => { const m = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>')); if (!m) throw new Error('No <script id="' + id + '"> in index.html'); return m[1]; };
global.window = {};
const CSL = new Function(grab('citeproc') + ';return CSL;')();
global.CSL = CSL;
new Function(grab('styledata'))();
const A = new Function('CSL', grab('core') + ';return APA;')(CSL);
A.setup(window.APA_STYLE, window.APA_LOCALE);

let failed = 0, passed = 0;
function eq(got, want, label) {
  if (got === want) { passed++; return; }
  failed++; console.log('FAIL  ' + label + '\n  got : ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
}
const ref = (st) => { const r = A.render([{ id: 'x', st }]); return r.refs.x ? r.refs.x.text : '(nothing)'; };

// ---- 1. Reference-list entries, as APA publishes them (italics not shown) ----
const FIXTURES = [
 ['journal', {type:'journal', authors:'Grady, J. S.\nHer, M.\nMoreno, G.\nPerez, C.\nYelinek, J.', date:'2019', title:'Emotions in storybooks: A comparison of storybooks that represent ethnic and racial groups in the United States', container:'Psychology of Popular Media Culture', volume:'8', issue:'3', pages:'207-217', doi:'https://doi.org/10.1037/ppm0000185'},
  'Grady, J. S., Her, M., Moreno, G., Perez, C., & Yelinek, J. (2019). Emotions in storybooks: A comparison of storybooks that represent ethnic and racial groups in the United States. Psychology of Popular Media Culture, 8(3), 207–217. https://doi.org/10.1037/ppm0000185'],
 ['book', {type:'book', authors:'Jackson, Lynne M.', date:'2019', title:'The psychology of prejudice: From attitudes to social action', edition:'2nd', publisher:'American Psychological Association', doi:'10.1037/0000168-000'},
  'Jackson, L. M. (2019). The psychology of prejudice: From attitudes to social action (2nd ed.). American Psychological Association. https://doi.org/10.1037/0000168-000'],
 ['edited book', {type:'book', editors:'Hacker Hughes, Jamie', date:'2017', title:'Military veteran psychological health and social care: Contemporary approaches', publisher:'Routledge', doi:'10.4324/9781315215303'},
  'Hacker Hughes, J. (Ed.). (2017). Military veteran psychological health and social care: Contemporary approaches. Routledge. https://doi.org/10.4324/9781315215303'],
 ['chapter', {type:'chapter', authors:'Aron, L.\nBotella, M.\nLubart, T.', date:'2019', title:'Culinary arts: Talent and their development', editors:'Subotnik, R. F.\nOlszewski-Kubilius, P.\nWorrell, F. C.', container:'The psychology of high performance: Developing human potential into domain-specific talent', pages:'345–359', publisher:'American Psychological Association', doi:'10.1037/0000120-016'},
  'Aron, L., Botella, M., & Lubart, T. (2019). Culinary arts: Talent and their development. In R. F. Subotnik, P. Olszewski-Kubilius, & F. C. Worrell (Eds.), The psychology of high performance: Developing human potential into domain-specific talent (pp. 345–359). American Psychological Association. https://doi.org/10.1037/0000120-016'],
 ['web page', {type:'webpage', authors:'Bologna, Caroline', date:'October 31, 2019', title:'Why some people with anxiety love watching horror movies', container:'HuffPost', url:'https://www.huffpost.com/entry/anxiety-love-watching-horror-movies_l_5d277587e4b02a5a5d57b59e'},
  'Bologna, C. (2019, October 31). Why some people with anxiety love watching horror movies. HuffPost. https://www.huffpost.com/entry/anxiety-love-watching-horror-movies_l_5d277587e4b02a5a5d57b59e'],
 ['web page, group author, retrieval date', {type:'webpage', authors:'U.S. Census Bureau', title:'U.S. and world population clock', container:'U.S. Department of Commerce', url:'https://www.census.gov/popclock/', accessed:'7/3/2019'},
  'U.S. Census Bureau. (n.d.). U.S. and world population clock. U.S. Department of Commerce. Retrieved July 3, 2019, from https://www.census.gov/popclock/'],
 ['web page, site name repeats the author', {type:'webpage', authors:'World Health Organization', date:'2018-05-24', title:'The top 10 causes of death', container:'World Health Organization', url:'https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death'},
  'World Health Organization. (2018, May 24). The top 10 causes of death. https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death'],
 ['newspaper', {type:'news', authors:'Carey, Benedict', date:'March 22, 2019', title:'Can we get better at forgetting?', container:'The New York Times', url:'https://www.nytimes.com/2019/03/22/health/memory-forgetting-psychology.html'},
  'Carey, B. (2019, March 22). Can we get better at forgetting? The New York Times. https://www.nytimes.com/2019/03/22/health/memory-forgetting-psychology.html'],
 ['magazine', {type:'magazine', authors:'Bergeson, S.', date:'January 4, 2019', title:'Really cool neutral plasmas', container:'Science', volume:'363', issue:'6422', pages:'33-34', doi:'10.1126/science.aau7988'},
  'Bergeson, S. (2019, January 4). Really cool neutral plasmas. Science, 363(6422), 33–34. https://doi.org/10.1126/science.aau7988'],
 ['report', {type:'report', authors:'National Cancer Institute', date:'2019', title:'Taking time: Support for people with cancer', reportType:'NIH Publication', reportNumber:'18-2059', publisher:'U.S. Department of Health and Human Services, National Institutes of Health', url:'https://www.cancer.gov/publications/patient-education/takingtime.pdf'},
  'National Cancer Institute. (2019). Taking time: Support for people with cancer (NIH Publication No. 18-2059). U.S. Department of Health and Human Services, National Institutes of Health. https://www.cancer.gov/publications/patient-education/takingtime.pdf'],
 ['report, publisher repeats the author', {type:'report', authors:'American Psychological Association', date:'2020', title:'Same group as author and publisher', publisher:'American Psychological Association'},
  'American Psychological Association. (2020). Same group as author and publisher.'],
 ['dissertation', {type:'thesis', authors:'Zambrano-Vazquez, Laura', date:'2016', title:'The interaction of state and trait worry on response monitoring in those with worry and obsessive-compulsive symptoms', thesisType:'Doctoral dissertation', publisher:'University of Arizona', archive:'UA Campus Repository', url:'https://repository.arizona.edu/handle/10150/620615'},
  'Zambrano-Vazquez, L. (2016). The interaction of state and trait worry on response monitoring in those with worry and obsessive-compulsive symptoms [Doctoral dissertation, University of Arizona]. UA Campus Repository. https://repository.arizona.edu/handle/10150/620615'],
 ['conference presentation', {type:'conference', authors:'Evans, A. C.\nGarbarino, J.\nBocanegra, E.\nKinscherff, R. T.\nMárquez-Greene, N.', date:'August 8-11, 2019', title:'Gun violence: An event on the power of community', presentationType:'Conference presentation', event:'APA 2019 Convention', place:'Chicago, IL, United States', url:'https://convention.apa.org/2019-video'},
  'Evans, A. C., Garbarino, J., Bocanegra, E., Kinscherff, R. T., & Márquez-Greene, N. (2019, August 8–11). Gun violence: An event on the power of community [Conference presentation]. APA 2019 Convention, Chicago, IL, United States. https://convention.apa.org/2019-video'],
 ['online video', {type:'video', authors:'Harvard University', date:'August 28, 2019', title:'Soft robotic gripper for jellyfish', platform:'YouTube', url:'https://www.youtube.com/watch?v=guRoWTYfxMs'},
  'Harvard University. (2019, August 28). Soft robotic gripper for jellyfish [Video]. YouTube. https://www.youtube.com/watch?v=guRoWTYfxMs'],
 ['social media post with handle', {type:'post', authors:'Gates, Bill', handle:'BillGates', date:'September 7, 2019', title:'Today, I’m in Kenya', postType:'Tweet', platform:'Twitter', url:'https://twitter.com/BillGates/status/1'},
  'Gates, B. [@BillGates]. (2019, September 7). Today, I’m in Kenya [Tweet]. Twitter. https://twitter.com/BillGates/status/1'],
 ['social media post, group with handle and an image', {type:'post', authors:'National Geographic', handle:'@NatGeo', date:'January 12, 2020', title:'Scientists have found a way to tell how old a tree is', postType:'Tweet', attachment:'Image attached', platform:'Twitter', url:'https://twitter.com/NatGeo/status/2'},
  'National Geographic [@NatGeo]. (2020, January 12). Scientists have found a way to tell how old a tree is [Image attached] [Tweet]. Twitter. https://twitter.com/NatGeo/status/2'],
 ['data set', {type:'dataset', authors:'Pew Research Center', date:'2018', title:'American trends panel Wave 26', url:'https://www.pewsocialtrends.org/dataset/american-trends-panel-wave-26/'},
  'Pew Research Center. (2018). American trends panel Wave 26 [Data set]. https://www.pewsocialtrends.org/dataset/american-trends-panel-wave-26/'],
 ['AI-generated content', {type:'ai', authors:'OpenAI', date:'2023', title:'ChatGPT', version:'Mar 14 version', url:'https://chat.openai.com/chat'},
  'OpenAI. (2023). ChatGPT (Mar 14 version) [Large language model]. https://chat.openai.com/chat'],
 ['dictionary entry', {type:'entry', authors:'American Psychological Association', title:'Positive transference', container:'APA dictionary of psychology', url:'https://dictionary.apa.org/positive-transference', accessed:'August 31, 2019'},
  'American Psychological Association. (n.d.). Positive transference. In APA dictionary of psychology. Retrieved August 31, 2019, from https://dictionary.apa.org/positive-transference'],
];
FIXTURES.forEach(([name, st, want]) => eq(ref(st), want, 'reference: ' + name));

// ---- 2. In-text citations ----
const E = [
  { id: 'a', st: { type: 'journal', authors: 'Bullock, Richard\nBrody, Michal\nWeinberg, Francine', date: '2017', title: 'One', container: 'J' } },
  { id: 'b', st: { type: 'book', authors: 'Smith, John', date: '2004', title: 'Alpha', publisher: 'P' } },
  { id: 'c', st: { type: 'book', authors: 'Smith, John', date: '2004', title: 'Beta', publisher: 'P' } },
  { id: 'd', st: { type: 'book', authors: 'Myers, Ann', date: '2000', title: 'Gamma', publisher: 'P' } },
  { id: 'e', st: { type: 'webpage', authors: 'Getz, Ann', date: '2006', title: 'Arthritis', container: 'Site', url: 'https://example.org' } },
  { id: 'f', st: { type: 'book', authors: 'Nicholson, Ian', date: '2003', title: 'Inventing personality', publisher: 'P' } },
  { id: 'g', st: { type: 'book', authors: 'Doe, Jane\nRivera, Luis', date: '2022', title: 'Two authors', publisher: 'P' } },
  { id: 'h', st: { type: 'book', authors: 'Johnson, L.', date: '2019', description: 'Medical examination paperwork from 09 November 2019', publisher: 'Presbyterian Hospital' } },
];
const R = A.render(E);
const c = (id, o) => { const x = R.cite(id, o); return x.parenText + ' | ' + x.narrativeText; };
eq(c('a', { locType: 'page', locator: '115' }), '(Bullock et al., 2017, p. 115) | Bullock et al. (2017, p. 115)', 'in-text: three authors take et al. from the first citation');
eq(c('a', { locType: 'page', locator: '12-14' }), '(Bullock et al., 2017, pp. 12–14) | Bullock et al. (2017, pp. 12–14)', 'in-text: a page range');
eq(c('g'), '(Doe & Rivera, 2022) | Doe and Rivera (2022)', 'in-text: two authors, & in parentheses and "and" in a sentence');
eq(c('b') + ' / ' + c('c'), '(Smith, 2004a) | Smith (2004a) / (Smith, 2004b) | Smith (2004b)', 'in-text: same author, same year get a and b');
eq(c('d', { locType: 'para', locator: '5' }), '(Myers, 2000, para. 5) | Myers (2000, para. 5)', 'in-text: paragraph number');
eq(c('e', { locType: 'section', locator: 'Osteoarthritis' }), '(Getz, 2006, Osteoarthritis section) | Getz (2006, Osteoarthritis section)', 'in-text: section name');
eq(c('f', { secondary: true, original: 'Allport', originalYear: '1937' }), "(Allport, 1937, as cited in Nicholson, 2003) | Allport (1937, as cited in Nicholson, 2003)", 'in-text: secondary source');
eq(c('f', { secondary: true, original: 'Allport' }), "(Allport, as cited in Nicholson, 2003) | Allport (as cited in Nicholson, 2003)", 'in-text: secondary source, year unknown');
eq(A.stripTags(R.group(['d', 'b'])), '(Myers, 2000; Smith, 2004a)', 'in-text: several works, in alphabetical order');
eq(R.refs.h.text, 'Johnson, L. (2019). [Medical examination paperwork from 09 November 2019]. Presbyterian Hospital.', 'reference: untitled work gets a bracketed description');
eq(R.order.join(','), 'a,g,e,h,d,f,b,c', 'reference list: alphabetical by first author, then a before b');

// ---- 2b. Sources with no author, undated pages, unpublished theses ----
const N = A.render([
  { id: 'n1', st: { type: 'book', date: '2020', title: 'Book without author', publisher: 'P' } },
  { id: 'n2', st: { type: 'journal', date: '2021', title: 'Article without author', container: 'J', volume: '1', pages: '1-2' } },
  { id: 'n3', st: { type: 'webpage', authors: 'Yu, A.', title: 'Alpha', url: 'https://example.org/a' } },
  { id: 'n4', st: { type: 'thesis', authors: 'Roe, Jane A.', date: '2019', title: 'Unpublished work', thesisType: "Master's thesis", publisher: 'Example State University' } },
]);
const cn = (id) => { const x = N.cite(id, {}); return x.paren + ' | ' + x.narrative; };
eq(cn('n1'), '(<i>Book Without Author</i>, 2020) | <i>Book Without Author</i> (2020)', 'in-text: no author, a book title stays italic and every word of four letters or more is capitalized');
eq(cn('n2'), '(\u201CArticle Without Author,\u201D 2021) | \u201CArticle Without Author\u201D (2021)', 'in-text: no author, an article title in quotation marks');
eq(N.refs.n3.text, 'Yu, A. (n.d.). Alpha. https://example.org/a', 'reference: undated page with no retrieval date prints the URL alone');
eq(N.refs.n4.text, 'Roe, J. A. (2019). Unpublished work [Unpublished master\u2019s thesis]. Example State University.', 'reference: a thesis in no database is unpublished');

// ---- 3. Helpers: names, dates, DOIs, sentence case ----
eq(JSON.stringify(A.parseNames('Evans, A. C., Jr.\nWorld Health Organization')), '[{"family":"Evans","given":"A. C.","suffix":"Jr."},{"literal":"World Health Organization"}]', 'names: person with suffix, and a group');
['2019|2019', 'October 31, 2019|October 31, 2019', '31 October 2019|October 31, 2019', '10/31/2019|October 31, 2019', '2019-10-31|October 31, 2019', 'Oct. 2019|October 2019', 'Spring 2020|Spring 2020'].forEach((p) => { const [i, o] = p.split('|'); eq(A.dateText(i), o, 'date: ' + i); });
eq(A.parseDate('n.d.'), null, 'date: n.d. means no date');
eq(JSON.stringify(A.parseDate('August 8-11, 2019').csl), '{"date-parts":[[2019,8,8],[2019,8,11]]}', 'date: a range of days');
eq(A.normDoi('https://doi.org/10.1037/ppm0000185'), '10.1037/ppm0000185', 'doi: from a link');
eq(A.normDoi('doi:10.1037/ppm0000185.'), '10.1037/ppm0000185', 'doi: from doi: form');
eq(A.sentenceCase('The Flawed Logic of Democratic Peace Theory: A Study of NATO and the EU'), 'The flawed logic of democratic peace theory: A study of NATO and the EU', 'sentence case: keeps acronyms and the word after a colon');
eq(A.looksTitleCase('The Flawed Logic of Democratic Peace Theory') && !A.looksTitleCase('The flawed logic of democratic peace theory'), true, 'sentence case: title case is detected');

// ---- 4. Checks ----
const msgs = (st, o) => A.checks(st, o).map((x) => x.level + ':' + x.msg.slice(0, 32)).join(' | ');
const flagged = (st, start, o) => A.checks(st, o).some((x) => x.msg.startsWith(start));
eq(flagged({ type: 'journal', authors: 'Jane Doe', title: 't' }, '"Jane Doe" looks like a person'), true, 'checks: first-name-first person');
eq(flagged({ type: 'journal', authors: 'Doe, Jane', title: 'A Study Of Things In The World' }, 'APA writes the titles of works in sentence case'), true, 'checks: title case title');
eq(flagged({ type: 'journal', authors: 'Doe, Jane', title: 't', url: 'https://search.ebscohost.com/login.aspx?x=1' }, 'That looks like a library database link'), true, 'checks: database link');
eq(flagged({ type: 'journal', authors: 'Doe, Jane', title: 't', doi: '12345' }, 'That does not look like a DOI'), true, 'checks: bad DOI');
eq(flagged({ type: 'webpage', authors: 'Doe, Jane', title: 't' }, 'This kind of source needs its URL'), true, 'checks: web page without a URL');
eq(flagged({ type: 'webpage', authors: 'Doe, Jane', title: 't', url: 'https://example.org' }, 'If this page is designed to change'), true, 'checks: undated web page gets a note about retrieval dates');
eq(flagged({ type: 'post', authors: 'Doe, Jane', title: 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone', url: 'https://x.com/a' }, 'APA gives the first 20 words'), true, 'checks: long post');
eq(flagged({ type: 'journal', authors: 'Doe, Jane', title: 't', date: '2020' }, 'A direct quotation needs a page', { quote: true }), true, 'checks: quotation without a locator');
eq(flagged({ type: 'chapter', authors: 'Doe, Jane', title: 't', date: '2020' }, 'A chapter in an edited book names'), true, 'checks: chapter without editors');
eq(msgs({ type: 'journal' }), '', 'checks: an empty form raises nothing');

// ---- 5. Files ----
const saved = [{ id: 's1', st: Object.assign({ type: 'book' }, { authors: 'Doe, Jane', title: 'T', date: '2020', publisher: 'P' }) }];
const back = A.parseListFile(A.listFile('My paper', saved, { s1: 'Doe, J. (2020). T. P.' }));
eq(back.items.length + ':' + back.items[0].st.authors + ':' + back.name, '1:Doe, Jane:My paper', 'list file: saves and reopens');
eq(!!A.parseListFile('not json').error && !!A.parseListFile('{"x":1}').error, true, 'list file: refuses what is not a list file');
const docx = A.docxBytes(['Doe, J. (2020). <i>T</i>. P.']);
eq(docx[0] === 0x50 && docx[1] === 0x4b && docx.length > 1000, true, 'export: Word file is a zip archive');
eq(A.mdText('', ['Doe, J. (2020). *T*. P.']), '## References\n\nDoe, J. (2020). *T*. P.\n', 'export: Markdown');

console.log(failed ? `
${failed} failed, ${passed} passed` : `All ${passed} checks passed.`);
process.exit(failed ? 1 : 0);
