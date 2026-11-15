#!/usr/bin/env node
// Fast website release for GitHub Actions (CR-022): one zip instead of thousands of FTP uploads.
// Per-file FTP from GitHub's runners takes ~1.2 s a file (a nightly release changes ~4,500 prerendered
// pages), so this sends two files and lets the server do the work:
//
//   1. Compare the build with .deploy-manifest.json on the server (same file ftp-deploy.js keeps, so
//      Jenkins and this script can take turns).
//   2. Zip only the new/changed files + the list of files to remove + the new manifest.
//   3. FTP the zip and a one-time copy of deploy/zip-deploy.php (random name, random key) into the site.
//   4. Call it over HTTPS: backup (live site -> <backup dir>/<prefix><yyyymmdd>-<hhmm>.zip, newest N kept),
//      then apply (unzip assets first, HTML last; remove old files; write the manifest last).
//   5. Delete the script and the zip (HTTPS, then FTP as a fallback).
//
//   node deploy/zip-deploy.js <localDir> [--dry-run]
//
// Environment: FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_REMOTE_DIR, FTP_PORT, FTP_SECURE, FTP_SKIP_DIRS,
// FTP_BACKUP_DIR, FTP_BACKUP_PREFIX, FTP_BACKUP_KEEP — as in ftp-deploy.js — plus
//   SITE_URL   public URL of FTP_REMOTE_DIR, e.g. https://salah-times.in
// The backup folder must be inside FTP_REMOTE_DIR (the server script writes it).
// Local test: FTP_HOST=local:<folder> copies into <folder> instead of FTP (serve it with `php -S`).
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Readable, Writable } = require('stream');

const MANIFEST = '.deploy-manifest.json';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const localDir = args.find(arg => !arg.startsWith('--'));
const env = process.env;

const log = message => console.log(`zip-deploy: ${message}`);
const fail = message => {
  console.error(`zip-deploy: ${message}`);
  process.exit(1);
};

if (!localDir) fail('usage: node deploy/zip-deploy.js <localDir> [--dry-run]');
const localRoot = path.resolve(localDir);
if (!fs.existsSync(path.join(localRoot, 'index.html'))) fail(`${localRoot} has no index.html - build first`);
const missing = ['FTP_HOST', 'FTP_REMOTE_DIR', 'SITE_URL'].filter(name => !env[name]);
if (missing.length) fail(`missing ${missing.join(', ')}`);

// ---------------------------------------------------------------- local build

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const sha1 = file => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
const skipDirs = new Set((env.FTP_SKIP_DIRS || '').split(',').map(name => name.trim()).filter(Boolean));
const inSkippedDir = rel => skipDirs.has(rel.split('/')[0]);
const local = {};
for (const file of walk(localRoot)) {
  const rel = path.relative(localRoot, file).split(path.sep).join('/');
  if (rel === MANIFEST || inSkippedDir(rel)) continue;
  local[rel] = sha1(file);
}
const buildDirs = fs.readdirSync(localRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && !skipDirs.has(entry.name)).map(entry => entry.name);

// ---------------------------------------------------------------- remote files (FTP or local test folder)

const remoteRoot = '/' + env.FTP_REMOTE_DIR.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
const remotePath = rel => path.posix.join(remoteRoot, rel);
const isLocal = env.FTP_HOST.startsWith('local:');
let client = null;

async function connect() {
  if (isLocal) {
    const base = env.FTP_HOST.slice('local:'.length);
    const abs = remote => path.join(base, ...remote.split('/').filter(Boolean));
    client = {
      uploadFrom: async (source, remote) => fs.writeFileSync(abs(remote),
        typeof source === 'string' ? fs.readFileSync(source) : Buffer.concat(await source.toArray())),
      downloadTo: async (sink, remote) => { sink.write(fs.readFileSync(abs(remote))); },
      remove: async remote => fs.rmSync(abs(remote), { force: true }),
      close: () => {}
    };
    return;
  }
  const { Client } = require('basic-ftp');
  if (client) client.close();
  client = new Client(60000);
  const secure = (env.FTP_SECURE || 'true').toLowerCase();
  await client.access({
    host: env.FTP_HOST, user: env.FTP_USER, password: env.FTP_PASSWORD, port: Number(env.FTP_PORT || 21),
    secure: secure === 'implicit' ? 'implicit' : secure !== 'false',
    // Shared hosts often present a certificate for their own server name, not the FTP host name.
    secureOptions: { rejectUnauthorized: env.FTP_TLS_STRICT === 'true' }
  });
}

/** Runs an FTP action; if the host drops the connection, reconnects and tries again (3 tries in all). */
async function retry(label, action) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt === 3) throw new Error(`${label}: ${error.message}`);
      console.warn(`zip-deploy: retrying ${label} (${error.message})`);
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      await connect();
    }
  }
}

async function readManifest() {
  const chunks = [];
  const sink = new Writable({ write(chunk, _encoding, done) { chunks.push(chunk); done(); } });
  try {
    await client.downloadTo(sink, remotePath(MANIFEST));
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------- server script calls

const siteUrl = env.SITE_URL.replace(/\/+$/, '');

async function call(scriptName, key, action, fields = {}) {
  const response = await fetch(`${siteUrl}/${scriptName}`, {
    method: 'POST',
    headers: { 'X-Deploy-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ action, ...fields }),
    signal: AbortSignal.timeout(15 * 60 * 1000)
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${action}: HTTP ${response.status}, not JSON: ${text.slice(0, 200)}`);
  }
  if (!response.ok || !data.ok) throw new Error(`${action}: HTTP ${response.status} ${JSON.stringify(data)}`);
  return data;
}

// ---------------------------------------------------------------- main

async function main() {
  log(`${Object.keys(local).length} files in ${localRoot}` + (skipDirs.size ? ` (skipping ${[...skipDirs].join(', ')})` : ''));
  await connect();
  const previous = await retry('read manifest', readManifest);
  const changed = Object.keys(local).filter(rel => previous[rel] !== local[rel]).sort();
  const removed = env.FTP_DELETE === 'false' ? [] : Object.keys(previous).filter(rel => !(rel in local) && !inSkippedDir(rel)).sort();
  log(`${remoteRoot} - ${changed.length} to upload, ${removed.length} to remove`
    + (Object.keys(previous).length ? '' : ' (no manifest on the server: first upload sends everything)'));
  if (dryRun) {
    changed.slice(0, 20).forEach(rel => console.log(`  + ${rel}`));
    removed.slice(0, 20).forEach(rel => console.log(`  - ${rel}`));
    client.close();
    return;
  }

  // Skipped folders keep their entries from the last run that uploaded them (as ftp-deploy.js does).
  const manifest = { ...Object.fromEntries(Object.entries(previous).filter(([rel]) => inSkippedDir(rel))), ...local };
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();
  for (const rel of changed) zip.addFile(rel, fs.readFileSync(path.join(localRoot, ...rel.split('/'))));
  zip.addFile('__zd/manifest.json', Buffer.from(JSON.stringify(manifest)));
  zip.addFile('__zd/removed.json', Buffer.from(JSON.stringify(removed)));
  const bundle = zip.toBuffer();

  // Random names and a random key for this run only; the server keeps just the key's hash.
  const id = crypto.randomBytes(12).toString('hex');
  const key = crypto.randomBytes(32).toString('hex');
  const bundleName = `_zd_${id}.zip`;
  const scriptName = `_zd_${id}.php`;
  const script = fs.readFileSync(path.join(__dirname, 'zip-deploy.php'), 'utf8')
    .replace('__KEY_SHA256__', crypto.createHash('sha256').update(key).digest('hex'))
    .replace('__BUNDLE__', bundleName);

  let uploaded = false;
  try {
    await retry('upload bundle', () => client.uploadFrom(Readable.from([bundle]), remotePath(bundleName)));
    await retry('upload script', () => client.uploadFrom(Readable.from([Buffer.from(script)]), remotePath(scriptName)));
    uploaded = true;
    log(`sent bundle (${(bundle.length / 1048576).toFixed(1)} MB) and one-time script`);

    if (env.FTP_BACKUP_DIR) {
      const backupDir = '/' + env.FTP_BACKUP_DIR.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      const inside = remoteRoot === '/' ? backupDir.slice(1) : backupDir.startsWith(remoteRoot + '/') ? backupDir.slice(remoteRoot.length + 1) : null;
      if (!inside) throw new Error(`backup folder ${backupDir} is not inside ${remoteRoot}`);
      let result;
      try {
        result = await call(scriptName, key, 'backup', {
          backup_dir: inside, prefix: env.FTP_BACKUP_PREFIX || 'FO', keep: env.FTP_BACKUP_KEEP || '2', dirs: buildDirs.join(',')
        });
      } catch (error) {
        throw new Error(`backup failed, nothing changed on the site (${error.message})`);
      }
      log(result.files
        ? `backup ${result.backup} (${result.files} files, ${(result.bytes / 1048576).toFixed(1)} MB)`
          + (result.deleted.length ? `; deleted old ${result.deleted.join(', ')}` : '')
        : 'backup skipped - the live folder has no site files yet');
    }

    const applied = await call(scriptName, key, 'apply');
    if (applied.not_removed.length) console.warn(`zip-deploy: could not remove ${applied.not_removed.join(', ')}`);
    log(`done - ${applied.extracted} uploaded, ${applied.removed} removed`);
  } finally {
    // The script must never stay on the server: ask it to delete itself, then make sure over FTP.
    if (uploaded) await call(scriptName, key, 'cleanup').catch(error => console.warn(`zip-deploy: cleanup call failed (${error.message})`));
    for (const name of [scriptName, bundleName]) {
      await retry(`remove ${name}`, () => client.remove(remotePath(name), true)).catch(() => {});
    }
    client.close();
  }
}

main().catch(error => fail(error.message));
