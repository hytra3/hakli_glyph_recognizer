#!/usr/bin/env node
'use strict';
/**
 * One-off importer: load old .hki files into the community archive.
 *
 * Dedupes to one canonical entry per catalogue number (KMD-50, KMH-9-10, …),
 * keeping the most complete version; maps each file's old stage to the new
 * status (published->final, review->review, draft->draft; legacy v1.0 uses its
 * `complete` flag); strips the large processed `displayImage`; and POSTs each to
 * submitInscription. Uncatalogued files (e.g. "Example") are skipped.
 *
 * Usage (from Cloud Shell, with the .hki files in <dir>):
 *   node seed/import.js <dir>                 # dry run — prints what it would do
 *   TOKEN=$(gcloud auth print-access-token) node seed/import.js <dir> --go
 */

const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const GO = process.argv.includes('--go');
const url = (process.argv.find((a) => a.startsWith('http'))) ||
  'https://us-central1-tawkin-blue.cloudfunctions.net/submitInscription';
const TOKEN = process.env.TOKEN;

if (!dir) {
  console.error('usage: TOKEN=$(gcloud auth print-access-token) node seed/import.js <dir> [--go]');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.hki'));

function catalogKey(title, fname) {
  const s = (title + ' ' + fname).toUpperCase();
  const m = s.match(/KM([A-Z])[ _\-]*([0-9]{1,3})(?:[ _\-]+([0-9]{1,3}))?/);
  return m ? ('KM' + m[1] + '-' + m[2] + (m[3] ? '-' + m[3] : '')) : null;
}
function statusFor(d) {
  if (d.visibility === 'published') return 'final';
  if (d.visibility === 'review') return 'review';
  if (d.visibility === 'draft') return 'draft';
  return (d.inscriptionComplete === true || d.complete === true) ? 'final' : 'draft';
}
const stageRank = { final: 3, review: 2, draft: 1 };
function score(d, status) {
  const rr = (d.recognitionResults || d.detections || []).length;
  const enTr = !!(d.translationEnglish || (d.translations && d.translations.english));
  const arTr = !!(d.translationArabic || (d.translations && d.translations.arabic));
  const aud = !!(d.audioData || d.audio);
  return stageRank[status] * 1000 + rr * 10 + (aud ? 5 : 0) + (enTr ? 3 : 0) + (arTr ? 3 : 0);
}
function cleanHki(d) {
  return JSON.parse(JSON.stringify(d, (k, v) =>
    (k === 'displayImage' || k === 'topMatches') ? undefined : v));
}

const groups = {};
const uncatalogued = [];
for (const f of files) {
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
  catch (e) { console.warn('skip (parse error):', f); continue; }
  const title = d.inscriptionTitle || d.title || f.replace(/\.hki$/, '');
  const key = catalogKey(title, f);
  const status = statusFor(d);
  const rec = { f, d, title: String(title).trim(), key, status, sc: score(d, status) };
  if (!key) { uncatalogued.push(rec); continue; }
  if (!groups[key] || rec.sc > groups[key].sc) groups[key] = rec;
}

const chosen = Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
console.log('=== would import ' + chosen.length + ' inscriptions (deduped) ===');
for (const c of chosen) {
  const rr = (c.d.recognitionResults || c.d.detections || []).length;
  console.log('  ' + c.key.padEnd(12) + ' status=' + c.status.padEnd(6) +
    ' glyphs=' + String(rr).padEnd(3) + '  <= ' + c.f);
}
if (uncatalogued.length) {
  console.log('\n(skipping ' + uncatalogued.length + ' uncatalogued: ' +
    uncatalogued.map((u) => u.f).join(', ') + ')');
}

if (!GO) { console.log('\nDry run. Re-run with TOKEN set and --go to import.'); process.exit(0); }
if (!TOKEN) { console.error('\nERROR: set TOKEN=$(gcloud auth print-access-token)'); process.exit(1); }

(async () => {
  let ok = 0;
  for (const c of chosen) {
    const body = {
      title: c.title,
      provenance: c.d.inscriptionSource || '',
      status: c.status,
      hki: cleanHki(c.d)
    };
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
        body: JSON.stringify(body)
      });
      const t = await r.text();
      if (r.ok) { ok++; console.log('OK   ' + c.key + '  ' + JSON.parse(t).id); }
      else { console.log('FAIL ' + c.key + '  ' + r.status + ' ' + t.slice(0, 140)); }
    } catch (e) { console.log('FAIL ' + c.key + '  ' + e.message); }
  }
  console.log('\nImported ' + ok + '/' + chosen.length + '.');
})();
