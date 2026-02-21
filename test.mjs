#!/usr/bin/env node
// test.mjs — Flight Name Formatter — Automated Test Runner
// Node.js 18+ required.  Usage: node test.mjs
//
// What this does:
//   1. Runs computeFields() logic tests against known examples from official pages.
//   2. Fetches every URL in References.md, checks HTTP status, and scans for
//      any "example" sentences — useful for spotting when airline guidance changes.
//
// IMPORTANT: Keep AIRLINES, sanitize(), and computeFields() in sync with index.html

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Core logic — keep in sync with index.html ────────────────────────────────

const AIRLINES = {
  mas:           { label: 'Malaysia Airlines' },
  airasia:       { label: 'AirAsia' },
  batikair:      { label: 'Batik Air',          dropMarker: true, duplicateSingle: true },
  firefly:       { label: 'Firefly' },
  qatar:         { label: 'Qatar Airways' },
  turkish:       { label: 'Turkish Airlines' },
  thai:          { label: 'Thai Airways' },
  ana:           { label: 'ANA',                threeFields: true },
  jal:           { label: 'Japan Airlines',     threeFields: true },
  china_airlines:{ label: 'China Airlines',     noSpaces: true, duplicateSingle: true },
  royal_brunei:  { label: 'Royal Brunei Airlines' },
  srilankan:     { label: 'SriLankan Airlines' },
  scoot:         { label: 'Scoot' },
  cebu_pacific:  { label: 'Cebu Pacific' },
  lion_air:      { label: 'Lion Air',           duplicateSingle: true },
  hk_express:    { label: 'HK Express' },
  air_india:     { label: 'Air India' },
  etihad:        { label: 'Etihad Airways' },
  saudia:        { label: 'Saudia' },
  oman_air:      { label: 'Oman Air' },
};

function sanitize(raw) {
  return raw
    .replace(/[@\-]/g, ' ')
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeFields(given, patronymic, surname, airline) {
  const isSingleName   = !surname && !patronymic;
  const surnameWithP   = patronymic && surname
    ? patronymic + ' ' + surname
    : (patronymic || surname);
  const effectiveSurname = airline.dropMarker ? surname : surnameWithP;

  const givenParts  = given.split(/\s+/).filter(Boolean);
  const firstName3  = givenParts[0] || '';
  const middleName3 = givenParts.slice(1).join(' ');

  let first = '', middle = '', last = '';
  if (isSingleName && airline.duplicateSingle) {
    first = given; last = given;
  } else if (airline.threeFields) {
    first = firstName3; middle = middleName3; last = effectiveSurname;
  } else {
    first = given; last = effectiveSurname;
  }

  if (airline.noSpaces) {
    first  = first.replace(/\s+/g, '');
    middle = middle.replace(/\s+/g, '');
    last   = last.replace(/\s+/g, '');
    if (isSingleName && airline.duplicateSingle) last = first;
  }

  return { first, middle, last };
}

// ── Test cases (derived from official airline reference pages) ───────────────
// Airlines with no explicit name examples on their reference page are skipped:
//   Qatar Airways, Turkish Airlines, Thai Airways, Firefly, Cebu Pacific, Saudia

const TESTS = [

  // Malaysia Airlines — booking guide has worked examples
  { airline: 'mas', note: 'MAS booking guide — Malay name with BIN',
    input: { given: 'AHMAD FALIQ', patronymic: 'BIN', surname: 'HAMEDI' },
    expected: { first: 'AHMAD FALIQ', last: 'BIN HAMEDI' } },
  { airline: 'mas', note: 'MAS booking guide — Chinese name, surname entered separately',
    input: { given: 'MEE LING', patronymic: '', surname: 'TAN' },
    expected: { first: 'MEE LING', last: 'TAN' } },
  { airline: 'mas', note: 'MAS booking guide — Western name, middle included in given',
    input: { given: 'JOHN WILLIAM', patronymic: '', surname: 'SMITH' },
    expected: { first: 'JOHN WILLIAM', last: 'SMITH' } },

  // AirAsia — support article explicitly mentions @ replacement
  { airline: 'airasia', note: 'AirAsia guide — Malay name with BIN',
    input: { given: 'AHMAD FALIQ', patronymic: 'BIN', surname: 'HAMEDI' },
    expected: { first: 'AHMAD FALIQ', last: 'BIN HAMEDI' } },
  { airline: 'airasia', note: 'AirAsia guide — @ symbol replaced by space (sanitize)',
    input: { given: 'SITI@NADIA', patronymic: 'BINTI', surname: 'AHMAD' },
    expected: { first: 'SITI NADIA', last: 'BINTI AHMAD' } },
  { airline: 'airasia', note: 'AirAsia guide — hyphen replaced by space (sanitize)',
    input: { given: 'MARY-JANE', patronymic: '', surname: 'WATSON' },
    expected: { first: 'MARY JANE', last: 'WATSON' } },

  // Batik Air — FAQ has two explicit worked examples
  { airline: 'batikair', note: 'Batik Air FAQ example — BIN dropped from Last Name',
    input: { given: 'MOHAMMED FAZIL', patronymic: 'BIN', surname: 'MOHAMMED FALEEL' },
    expected: { first: 'MOHAMMED FAZIL', last: 'MOHAMMED FALEEL' } },
  { airline: 'batikair', note: 'Batik Air FAQ example — single name duplicated',
    input: { given: 'ISKANDAR', patronymic: '', surname: '' },
    expected: { first: 'ISKANDAR', last: 'ISKANDAR' } },

  // ANA — name typing guide explains the three-field split
  { airline: 'ana', note: 'ANA guide — given name split into First + Middle at first space',
    input: { given: 'JOHN WILLIAM', patronymic: '', surname: 'DOE' },
    expected: { first: 'JOHN', middle: 'WILLIAM', last: 'DOE' } },
  { airline: 'ana', note: 'ANA guide — single given word, no middle',
    input: { given: 'JOHN', patronymic: '', surname: 'DOE' },
    expected: { first: 'JOHN', middle: '', last: 'DOE' } },
  { airline: 'ana', note: 'ANA guide — Malay name across three fields',
    input: { given: 'AHMAD FALIQ', patronymic: 'BIN', surname: 'HAMEDI' },
    expected: { first: 'AHMAD', middle: 'FALIQ', last: 'BIN HAMEDI' } },

  // Japan Airlines — passenger name guide
  { airline: 'jal', note: 'JAL guide — three fields, Last Name field shown first in JAL UI',
    input: { given: 'JOHN WILLIAM', patronymic: '', surname: 'DOE' },
    expected: { first: 'JOHN', middle: 'WILLIAM', last: 'DOE' } },

  // China Airlines — traveler name guide: no spaces, duplicate single name
  { airline: 'china_airlines', note: 'China Airlines guide — spaces removed from given name',
    input: { given: 'JOHN WILLIAM', patronymic: '', surname: 'DOE' },
    expected: { first: 'JOHNWILLIAM', last: 'DOE' } },
  { airline: 'china_airlines', note: 'China Airlines guide — single name duplicated, no spaces',
    input: { given: 'MADONNA', patronymic: '', surname: '' },
    expected: { first: 'MADONNA', last: 'MADONNA' } },
  { airline: 'china_airlines', note: 'China Airlines guide — Chinese name, no spaces in family name field',
    input: { given: 'MEE LING', patronymic: '', surname: 'TAN' },
    expected: { first: 'MEELING', last: 'TAN' } },

  // Royal Brunei — FAQ has two explicit worked examples
  { airline: 'royal_brunei', note: 'Royal Brunei FAQ — NAIRA ELAILAH BINTI ERHAN NOUSHAD',
    input: { given: 'NAIRA ELAILAH', patronymic: 'BINTI', surname: 'ERHAN NOUSHAD' },
    expected: { first: 'NAIRA ELAILAH', last: 'BINTI ERHAN NOUSHAD' } },
  { airline: 'royal_brunei', note: 'Royal Brunei FAQ — MICHAEL FANG FA RONG (Chinese name)',
    input: { given: 'FA RONG MICHAEL', patronymic: '', surname: 'FANG' },
    expected: { first: 'FA RONG MICHAEL', last: 'FANG' } },

  // SriLankan Airlines — name tips page
  { airline: 'srilankan', note: 'SriLankan Airlines name tips — standard two-field split',
    input: { given: 'JOHN', patronymic: '', surname: 'DOE' },
    expected: { first: 'JOHN', last: 'DOE' } },

  // Scoot — help article specifically about middle names
  { airline: 'scoot', note: 'Scoot guide — middle name stays in First Name field',
    input: { given: 'JOHN ALLEN', patronymic: '', surname: 'DOE' },
    expected: { first: 'JOHN ALLEN', last: 'DOE' } },

  // Lion Air — FAQ mentions single-name duplication
  { airline: 'lion_air', note: 'Lion Air FAQ — single name duplicated in both fields',
    input: { given: 'ISKANDAR', patronymic: '', surname: '' },
    expected: { first: 'ISKANDAR', last: 'ISKANDAR' } },
  { airline: 'lion_air', note: 'Lion Air FAQ — normal name',
    input: { given: 'JOHN', patronymic: '', surname: 'DOE' },
    expected: { first: 'JOHN', last: 'DOE' } },

  // HK Express — passenger name FAQ has explicit examples (O'NIEL, CHAN Tai-Man)
  { airline: 'hk_express', note: "HK Express FAQ — CHAN Tai-Man example (Surname first)",
    input: { given: 'TAI MAN', patronymic: '', surname: 'CHAN' },
    expected: { first: 'TAI MAN', last: 'CHAN' } },
  { airline: 'hk_express', note: "HK Express FAQ — hyphen removed from TAI-MAN (sanitize)",
    input: { given: 'TAI-MAN', patronymic: '', surname: 'CHAN' },
    expected: { first: 'TAI MAN', last: 'CHAN' } },

  // Air India — passenger name format page
  { airline: 'air_india', note: 'Air India guide — middle name in First Name field',
    input: { given: 'JOHN ALLEN', patronymic: '', surname: 'DOE' },
    expected: { first: 'JOHN ALLEN', last: 'DOE' } },

  // Etihad — FAQ has a worked example (SAMUEL JONATHAN VICTOR)
  { airline: 'etihad', note: 'Etihad FAQ — SAMUEL JONATHAN VICTOR example',
    input: { given: 'SAMUEL JONATHAN', patronymic: '', surname: 'VICTOR' },
    expected: { first: 'SAMUEL JONATHAN', last: 'VICTOR' } },

  // Oman Air — booking FAQ has example Q&A
  { airline: 'oman_air', note: 'Oman Air FAQ — standard two-field split',
    input: { given: 'JOHN', patronymic: '', surname: 'DOE' },
    expected: { first: 'JOHN', last: 'DOE' } },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseRefUrls(mdPath) {
  const text = readFileSync(mdPath, 'utf-8');
  return [...new Set((text.match(/https?:\/\/[^\s>)]+/g) || []))];
}

function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/\s{2,}/g, ' ').trim();
}

function findExampleSnippets(text) {
  // Look for sentences/lines that mention an example or show name patterns
  const sentences = text.split(/(?<=[.!?])\s+|[\n]+/);
  return sentences
    .filter(s => /\bexample\b|\be\.g\b|\bsuch as\b/i.test(s))
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 300)
    .slice(0, 4);
}

async function fetchPage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const body = res.ok ? await res.text() : '';
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    clearTimeout(timer);
    const msg = e.name === 'AbortError' ? 'timeout' : e.message;
    return { ok: false, status: 0, body: '', error: msg };
  }
}

// ── Colours ──────────────────────────────────────────────────────────────────

const C = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue:  '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
  bold:  '\x1b[1m',  reset: '\x1b[0m',
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}Flight Name Formatter — Test Runner${C.reset}`);
  console.log('─'.repeat(66));

  // ── 1. Logic tests ──────────────────────────────────────────────────────
  console.log(`\n${C.bold}${C.blue}[1/2] LOGIC TESTS${C.reset}  (computeFields — must stay in sync with index.html)\n`);

  let passed = 0, failed = 0, prevAirline = '';

  for (const tc of TESTS) {
    if (tc.airline !== prevAirline) {
      prevAirline = tc.airline;
      console.log(`  ${C.cyan}${AIRLINES[tc.airline].label}${C.reset}`);
    }

    const given      = sanitize(tc.input.given);
    const patronymic = sanitize(tc.input.patronymic);
    const surname    = sanitize(tc.input.surname);
    const result     = computeFields(given, patronymic, surname, AIRLINES[tc.airline]);
    const ok         = Object.entries(tc.expected).every(([k, v]) => result[k] === v);

    if (ok) {
      passed++;
      console.log(`    ${C.green}✓${C.reset} ${tc.note}`);
    } else {
      failed++;
      console.log(`    ${C.red}✗${C.reset} ${tc.note}`);
      for (const [k, v] of Object.entries(tc.expected)) {
        const got  = result[k] ?? '';
        const mark = got === v ? `${C.green}✓` : `${C.red}✗`;
        console.log(`      ${mark}${C.reset} ${k}: expected ${C.bold}"${v}"${C.reset}  got ${C.bold}"${got}"${C.reset}`);
      }
    }
  }

  const logicLine = failed === 0
    ? `${C.green}${C.bold}ALL PASSED${C.reset}`
    : `${C.red}${C.bold}${failed} FAILED${C.reset}`;
  console.log(`\n  ${logicLine} — ${passed} passed, ${failed} failed out of ${TESTS.length}\n`);

  // ── 2. URL health + example scan ────────────────────────────────────────
  console.log(`${C.bold}${C.blue}[2/2] URL HEALTH + EXAMPLE SCAN${C.reset}  (from References.md)\n`);
  console.log(`  ${C.dim}Fetching each reference URL… SPA-rendered pages may show empty${C.reset}`);
  console.log(`  ${C.dim}content even when alive. 403/blocked ≠ page removed.${C.reset}\n`);

  const urls = parseRefUrls(resolve(__dir, 'References.md'));
  let urlOk = 0, urlFail = 0;

  for (const url of urls) {
    const { ok, status, body, error } = await fetchPage(url);
    const shortUrl = url.length > 72 ? url.slice(0, 69) + '…' : url;

    if (ok) {
      urlOk++;
      const text     = stripHtml(body);
      const snippets = findExampleSnippets(text);
      console.log(`  ${C.green}✓${C.reset} ${status}  ${C.dim}${shortUrl}${C.reset}`);
      if (snippets.length) {
        console.log(`      ${C.yellow}↳ Example sentences found:${C.reset}`);
        snippets.forEach(s => console.log(`        ${C.dim}• ${s.slice(0, 150)}${C.reset}`));
      } else {
        console.log(`      ${C.dim}↳ No example text detected (may be SPA-rendered or gated)${C.reset}`);
      }
    } else {
      urlFail++;
      const reason = error ? ` (${error})` : '';
      console.log(`  ${C.red}✗${C.reset} ${status || 'ERR'}  ${url}${reason}`);
    }
  }

  const urlLine = urlFail === 0
    ? `${C.green}${C.bold}ALL REACHABLE${C.reset}`
    : `${C.yellow}${C.bold}${urlFail} UNREACHABLE${C.reset}`;
  console.log(`\n  ${urlLine} — ${urlOk} ok, ${urlFail} failed out of ${urls.length} URLs`);

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(66));
  if (failed === 0) {
    console.log(`\n  ${C.green}${C.bold}✓ All logic tests passed.${C.reset}`);
  } else {
    console.log(`\n  ${C.red}${C.bold}✗ ${failed} logic test(s) failed — check computeFields() in index.html.${C.reset}`);
  }
  if (urlFail > 0) {
    console.log(`  ${C.yellow}⚠  ${urlFail} URL(s) unreachable — verify in References.md.${C.reset}`);
  }
  console.log();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
