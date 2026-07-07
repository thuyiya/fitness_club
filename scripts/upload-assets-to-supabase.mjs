#!/usr/bin/env node
/**
 * Upload Solace media assets to Supabase Storage.
 *
 *   media/audio/*.mp3          -> bucket "solace_voices"  (flat, by filename)
 *   media/images/*.{jpg,jpeg,png} -> bucket "solace_images" (flat, by filename)
 *
 * Uses the Storage REST API with your SERVICE ROLE key (bypasses RLS so it can
 * write). The key is read from the environment and never written to disk.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-assets-to-supabase.mjs
 *   # optional: SUPABASE_URL=... (defaults to the Solace project)
 *   # optional: --dry-run  (list what would upload, no network)
 *
 * Get the service_role key: Supabase dashboard -> Project Settings -> API ->
 * "service_role" secret. Treat it like a password; do not commit it.
 */
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nhkszwctydlsxadpbahx.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry-run');

const MIME = {
  '.mp3': 'audio/mpeg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

/** { dir, bucket, exts } jobs. */
const JOBS = [
  { dir: 'media/audio', bucket: 'solace_voices', exts: ['.mp3'] },
  { dir: 'media/images', bucket: 'solace_images', exts: ['.jpg', '.jpeg', '.png'] },
];

async function collect(job) {
  const abs = join(ROOT, job.dir);
  const names = await readdir(abs);
  return names
    .filter((n) => job.exts.includes(extname(n).toLowerCase()))
    .map((n) => ({ localPath: join(abs, n), bucket: job.bucket, objectPath: basename(n) }));
}

async function upload(file) {
  const bytes = await readFile(file.localPath);
  const url = `${SUPABASE_URL}/storage/v1/object/${file.bucket}/${encodeURIComponent(file.objectPath)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': MIME[extname(file.objectPath).toLowerCase()] || 'application/octet-stream',
      'x-upsert': 'true',
      'cache-control': '3600',
    },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} — ${text}`);
  }
  return bytes.length;
}

async function main() {
  if (!DRY && !KEY) {
    console.error('✗ SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
      '  Run: SUPABASE_SERVICE_ROLE_KEY=<your key> node scripts/upload-assets-to-supabase.mjs');
    process.exit(1);
  }

  let ok = 0, failed = 0, bytes = 0;
  for (const job of JOBS) {
    const files = await collect(job);
    console.log(`\n${job.bucket}  (${files.length} files from ${job.dir}/)`);
    for (const f of files) {
      if (DRY) {
        console.log(`  · ${f.objectPath}  →  ${job.bucket}/${f.objectPath}`);
        ok++;
        continue;
      }
      try {
        const n = await upload(f);
        bytes += n;
        ok++;
        console.log(`  ✓ ${f.objectPath}  (${(n / 1e6).toFixed(1)} MB)`);
      } catch (e) {
        failed++;
        console.log(`  ✗ ${f.objectPath}  — ${e.message}`);
      }
    }
  }

  console.log(`\n${DRY ? '[dry-run] ' : ''}Done: ${ok} ok, ${failed} failed` +
    (DRY ? '' : `, ${(bytes / 1e6).toFixed(1)} MB uploaded`));
  console.log(`\nPublic URL pattern (buckets must be Public):\n  ${SUPABASE_URL}/storage/v1/object/public/<bucket>/<filename>`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
