import { request } from 'undici';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import type { RawQuestion } from './types';

const OUT_DIR = 'public/assets/questions';

function idOf(q: RawQuestion): string {
  if (q.officialNumber <= 72) return `basis-${q.officialNumber}`;
  return `${q.exam}-${q.officialNumber}`;
}

async function downloadOne(url: string, dest: string) {
  const res = await request(url);
  if (res.statusCode !== 200) throw new Error(`GET ${url} returned ${res.statusCode}`);
  const buf = Buffer.from(await res.body.arrayBuffer());
  writeFileSync(dest, buf);
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const raw: RawQuestion[] = JSON.parse(readFileSync('data/raw-parsed.json', 'utf8'));
  const seen = new Set<string>();
  let downloaded = 0, skipped = 0;

  for (const q of raw) {
    if (!q.imageRef) continue;
    const id = idOf(q);
    if (seen.has(id)) continue;
    seen.add(id);
    const ext = extname(new URL(q.imageRef).pathname) || '.png';
    const dest = `${OUT_DIR}/${id}${ext}`;
    if (existsSync(dest)) { skipped++; continue; }
    process.stderr.write(`↓ ${id}${ext}\n`);
    await downloadOne(q.imageRef, dest);
    downloaded++;
  }
  process.stderr.write(`Images: ${downloaded} downloaded, ${skipped} already present\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
