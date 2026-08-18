import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export function isUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

export function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

// Snapshots stored in ~/.scrawl/snapshots/
const SNAPSHOTS_DIR = join(homedir(), '.scrawl', 'snapshots');

function snapshotKey(url) {
  return hash(url).slice(0, 16);
}

export function saveSnapshot(url, data) {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const file = join(SNAPSHOTS_DIR, `${snapshotKey(url)}.json`);
  writeFileSync(file, JSON.stringify({ url, timestamp: new Date().toISOString(), ...data }, null, 2));
  return file;
}

export function loadSnapshot(url, file) {
  const path = file ?? join(SNAPSHOTS_DIR, `${snapshotKey(url)}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function readLines(filePath) {
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

export function parseInterval(str) {
  const match = str.match(/^(\d+)(s|m|h)$/);
  if (!match) throw new Error(`Invalid interval: ${str}. Use e.g. 30s, 5m, 1h`);
  const [, n, unit] = match;
  return parseInt(n) * { s: 1000, m: 60000, h: 3600000 }[unit];
}

export function diffLines(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const added = b.filter(l => !a.includes(l));
  const removed = a.filter(l => !b.includes(l));
  return { added, removed };
}
