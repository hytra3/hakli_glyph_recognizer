#!/usr/bin/env node
'use strict';
/**
 * One-off: write the standalone thumbnail object (inscriptions/<id>.img) for
 * every existing archive entry, so the gallery cards show an image. New entries
 * get this automatically from submitInscription; this backfills the ones that
 * were imported before that existed.
 *
 * Reads each entry's public blob, extracts its source image, and uploads it as
 * <id>.img via `gcloud storage` (so it runs with your Cloud Shell credentials).
 * No resizing — the source image is used as-is; the viewer sizes it with CSS.
 *
 * Usage (Cloud Shell):  node seed/backfill-thumbs.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BUCKET = 'hakli-archive-tawkin-blue';
const LIST = 'https://us-central1-tawkin-blue.cloudfunctions.net/listInscriptions';

(async () => {
  const res = await fetch(LIST);
  const items = (await res.json()).items || [];
  console.log('entries:', items.length);
  let ok = 0;
  for (const it of items) {
    try {
      const hki = await (await fetch(it.blobUrl)).json();
      const m = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(hki.image || '');
      if (!m) { console.log('skip (no image):', it.id, it.title); continue; }
      const tmp = path.join(os.tmpdir(), it.id + '.img');
      fs.writeFileSync(tmp, Buffer.from(m[2], 'base64'));
      execFileSync('gcloud', [
        'storage', 'cp',
        '--content-type=' + m[1],
        '--cache-control=public, max-age=3600',
        tmp, `gs://${BUCKET}/inscriptions/${it.id}.img`
      ], { stdio: ['ignore', 'ignore', 'inherit'] });
      fs.unlinkSync(tmp);
      ok++;
      console.log('thumb:', it.id, '  ', it.title);
    } catch (e) { console.log('FAIL', it.id, e.message); }
  }
  console.log('\nWrote ' + ok + '/' + items.length + ' thumbnails.');
})();
