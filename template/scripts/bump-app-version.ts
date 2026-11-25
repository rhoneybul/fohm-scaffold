/**
 * Sets the store apps' version in app.json, on the runner of the Publish
 * workflow (.github/workflows/publish.yml) only: app.json on main keeps its
 * number, and the highest `app-v*` tag is the version of record. EAS counts
 * build numbers itself (eas.json: appVersionSource remote, autoIncrement).
 * Borrowed from Naz's and Etapa's.
 *
 *   npx tsx scripts/bump-app-version.ts patch|minor|major|none|1.2.3
 *
 * Prints the version it set, for the workflow to read.
 */
import fs from 'node:fs';
import path from 'node:path';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** The version after `how` (patch, minor, major, none, or an exact x.y.z) is applied to `current`. */
export function bumped(current: string, how: string): string {
  if (SEMVER.test(how)) return how;
  const m = SEMVER.exec(current);
  if (!m) throw new Error(`app.json's version isn't x.y.z: ${current}`);
  const [maj, min, pat] = m.slice(1).map(Number);
  if (how === 'patch') return `${maj}.${min}.${pat + 1}`;
  if (how === 'minor') return `${maj}.${min + 1}.0`;
  if (how === 'major') return `${maj + 1}.0.0`;
  if (how === 'none') return current;
  throw new Error(`patch, minor, major, none or x.y.z, not ${how}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const file = path.join(import.meta.dirname, '..', 'app.json');
  const app = JSON.parse(fs.readFileSync(file, 'utf8'));
  const next = bumped(app.expo.version, (process.argv[2] ?? '').toLowerCase());
  if (next !== app.expo.version) fs.writeFileSync(file, JSON.stringify({ ...app, expo: { ...app.expo, version: next } }, null, 2) + '\n');
  process.stdout.write(next);
}
