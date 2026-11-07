#!/usr/bin/env node
// Uploads a built site (e.g. frontend/dist/salahtime) to Hostinger over FTP,
// sending only files that changed since the last upload. Used by the Jenkinsfile; also runs by hand.
//
//   node deploy/ftp-deploy.js <localDir> [--dry-run | --backup-only]
//
// Settings come from environment variables (Jenkins fills them from its credentials):
//   FTP_HOST, FTP_USER, FTP_PASSWORD   the Hostinger FTP account
//   FTP_REMOTE_DIR                     folder the site is served from, e.g. /public_html
//   FTP_PORT      (default 21)
//   FTP_SECURE    true = explicit FTPS (default), implicit, or false = plain FTP
//   FTP_DELETE    true (default) removes files that an earlier upload put there and the new build no
//                 longer has (old hashed bundles). Files this script never uploaded are never touched.
//
//   FTP_SKIP_DIRS   comma-separated top-level folders to leave out (not uploaded, not backed up)
//   FTP_BACKUP_DIR  e.g. /Backup - before uploading, zip the live site into <dir>/FO<yyyymmdd>-<hhmm>.zip
//                 (IST). Empty = no backup. If the backup fails, nothing is uploaded.
//   FTP_BACKUP_KEEP (default 2) newest FO backups kept in FTP_BACKUP_DIR; older FO zips and FO<date>
//                 folders there are deleted. Other backups (BO..., anything else) are never touched.
//   The backup holds the top-level files plus the top-level folders the build has (assets, prerendered),
//   so other apps sharing the folder (api/, backoffice/) and the backups themselves are left out.
//
// How it knows what changed: after each upload it writes .deploy-manifest.json (path -> sha1) into
// FTP_REMOTE_DIR. The next run reads it, uploads only new/changed files, then writes the new one.
// No manifest on the server (first run) = upload everything.
//
// Order matters on a live site: assets and bundles go first, HTML and .htaccess last, so a page never
// points at a bundle that is not there yet.
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Readable, Writable } = require('stream');

const MANIFEST = '.deploy-manifest.json';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const backupOnly = args.includes('--backup-only');
const localDir = args.find(arg => !arg.startsWith('--'));

const fail = message => {
  console.error(`ftp-deploy: ${message}`);
  process.exit(1);
};

if (!localDir) fail('usage: node deploy/ftp-deploy.js <localDir> [--dry-run | --backup-only]');
const localRoot = path.resolve(localDir);
if (!fs.existsSync(path.join(localRoot, 'index.html'))) fail(`${localRoot} has no index.html - build first`);

// ---------------------------------------------------------------- local files

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

const sha1 = file => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex');
// Top-level folders left out of this run (not uploaded, not backed up, not in the manifest), e.g.
// FTP_SKIP_DIRS=prerendered. The live copy of a skipped folder stays as it is.
const skipDirs = new Set((process.env.FTP_SKIP_DIRS || '').split(',').map(name => name.trim()).filter(Boolean));
const inSkippedDir = rel => skipDirs.has(rel.split('/')[0]);
const local = {};
for (const file of walk(localRoot)) {
  const rel = path.relative(localRoot, file).split(path.sep).join('/');
  if (rel === MANIFEST || inSkippedDir(rel)) continue;
  local[rel] = sha1(file);
}

/** HTML and .htaccess decide which bundles a page loads, so they go up last. */
const uploadLast = rel => /\.html$/.test(rel) || path.posix.basename(rel) === '.htaccess';
const ordered = list => [...list.filter(rel => !uploadLast(rel)), ...list.filter(uploadLast)];

const plan = previous => {
  const changed = ordered(Object.keys(local).filter(rel => previous[rel] !== local[rel]).sort());
  const removed = process.env.FTP_DELETE === 'false'
    ? []
    : Object.keys(previous).filter(rel => !(rel in local) && !inSkippedDir(rel)).sort();
  return { changed, removed };
};

// ---------------------------------------------------------------- remote

const settings = () => {
  const missing = ['FTP_HOST', 'FTP_USER', 'FTP_PASSWORD', 'FTP_REMOTE_DIR'].filter(name => !process.env[name]);
  if (missing.length) fail(`missing ${missing.join(', ')}`);
  // Git Bash on Windows rewrites "/public_html" to "C:/Program Files/Git/public_html".
  if (/^[A-Za-z]:|Program Files/.test(process.env.FTP_REMOTE_DIR)) {
    fail(`FTP_REMOTE_DIR looks like a local path (${process.env.FTP_REMOTE_DIR}); give the server folder, e.g. /public_html`);
  }
  const secure = (process.env.FTP_SECURE || 'true').toLowerCase();
  return {
    host: process.env.FTP_HOST,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    port: Number(process.env.FTP_PORT || 21),
    secure: secure === 'implicit' ? 'implicit' : secure !== 'false',
    // Shared hosts often present a certificate for their own server name, not the FTP host name.
    secureOptions: { rejectUnauthorized: process.env.FTP_TLS_STRICT === 'true' }
  };
};

const remoteRoot = () => '/' + process.env.FTP_REMOTE_DIR.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
const remotePath = rel => path.posix.join(remoteRoot(), rel);

let client = null;

async function connect() {
  const { Client } = require('basic-ftp');
  if (client) client.close();
  client = new Client(60000);
  await client.access(settings());
  return client;
}

/** Runs an FTP action; if the host drops the connection, reconnects and tries again (3 tries in all). */
async function retry(label, action) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt === 3) throw new Error(`${label}: ${error.message}`);
      console.warn(`ftp-deploy: retrying ${label} (${error.message})`);
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

// ---------------------------------------------------------------- backup

const BACKUP_NAME = /^FO[\s_-]?(\d{8})(?:-(\d{4}))?(?:\.zip)?$/i;

/** FO<yyyymmdd>-<hhmm> in India time, matching the hand-made FO<yyyymmdd> folders already in /Backup. */
const backupStamp = () => {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString();
  return `FO${ist.slice(0, 10).replace(/-/g, '')}-${ist.slice(11, 16).replace(':', '')}`;
};

/**
 * Deletes a remote folder file by file. Hostinger drops a connection every few hundred commands, and
 * basic-ftp's removeDir starts over after a drop; here each step retries on its own and keeps progress.
 */
async function removeTree(dir) {
  const entries = await retry(`list ${dir}`, () => client.list(dir));
  for (const entry of entries) {
    const target = path.posix.join(dir, entry.name);
    if (entry.isDirectory) await removeTree(target);
    // ignoreErrorCodes: after a dropped reply the file may already be gone.
    else await retry(`delete ${target}`, () => client.remove(target, true));
  }
  await retry(`delete ${dir}`, () => client.removeEmptyDir(dir));
}

async function backup() {
  const backupDir = '/' + process.env.FTP_BACKUP_DIR.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const keep = Math.max(1, Number(process.env.FTP_BACKUP_KEEP || 2));
  const buildDirs = new Set(fs.readdirSync(localRoot, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name));
  const work = fs.mkdtempSync(path.join(require('os').tmpdir(), 'salahtime-backup-'));
  try {
    // 1. List the live site's own files: top-level files and the folders the build has.
    const files = [];
    const listDir = async (rel, top) => {
      const entries = await retry(`list /${rel}`, () => client.list(remotePath(rel)));
      for (const entry of entries) {
        const child = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory) {
          if (top && (!buildDirs.has(entry.name) || skipDirs.has(entry.name) || remotePath(child) === backupDir)) continue;
          await listDir(child, false);
        } else if (entry.isFile) {
          files.push(child);
        }
      }
    };
    await listDir('', true);
    console.log(`ftp-deploy: backing up ${files.length} live files`);

    // 2. Download them one by one, so a dropped connection costs one retry, not the whole backup.
    let done = 0;
    for (const rel of files) {
      const target = path.join(work, ...rel.split('/'));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await retry(`download ${rel}`, () => client.downloadTo(target, remotePath(rel)));
      if (++done % 500 === 0) console.log(`ftp-deploy: downloaded ${done}/${files.length}`);
    }
    const total = walk(work).length;
    if (!total) {
      console.log('ftp-deploy: backup skipped - the live folder has no site files yet');
      return;
    }

    // 3. Zip and upload it as one file.
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    zip.addLocalFolder(work);
    const name = `${backupStamp()}.zip`;
    const zipFile = path.join(work, '..', `${path.basename(work)}.zip`);
    zip.writeZip(zipFile);
    await retry('upload backup', async () => {
      await client.ensureDir(backupDir);
      await client.uploadFrom(zipFile, path.posix.join(backupDir, name));
    });
    const size = fs.statSync(zipFile).size;
    fs.rmSync(zipFile, { force: true });
    console.log(`ftp-deploy: backup ${backupDir}/${name} (${total} files, ${(size / 1048576).toFixed(1)} MB)`);

    // 4. Keep the newest FO backups only.
    const backups = (await retry('list backups', () => client.list(backupDir)))
      .map(entry => ({ entry, match: entry.name.match(BACKUP_NAME) }))
      .filter(({ match }) => match)
      .map(({ entry, match }) => ({ entry, key: `${match[1]}${match[2] || '0000'}` }))
      .sort((a, b) => b.key.localeCompare(a.key));
    // The new backup is already safe, so a failed clean-up is a warning: the next run finishes it.
    for (const { entry } of backups.slice(keep)) {
      const target = path.posix.join(backupDir, entry.name);
      try {
        if (entry.isDirectory) await removeTree(target);
        else await retry(`delete ${target}`, () => client.remove(target));
        console.log(`ftp-deploy: deleted old backup ${target}`);
      } catch (error) {
        console.warn(`ftp-deploy: could not delete old backup ${target} (${error.message}); will try again next run`);
      }
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

async function main() {
  console.log(`ftp-deploy: ${Object.keys(local).length} files in ${localRoot}`
    + (skipDirs.size ? ` (skipping ${[...skipDirs].join(', ')})` : ''));

  if (dryRun && !process.env.FTP_HOST) {
    const { changed } = plan({});
    console.log(`ftp-deploy: dry run without FTP_HOST - a first upload would send ${changed.length} files;`
      + ` last five in order: ${changed.slice(-5).join(', ')}`);
    return;
  }

  await connect();
  const previous = await readManifest();
  const { changed, removed } = plan(previous);
  console.log(`ftp-deploy: ${remoteRoot()} - ${changed.length} to upload, ${removed.length} to remove`
    + (Object.keys(previous).length ? '' : ' (no manifest on the server: first upload sends everything)'));

  if (backupOnly && !process.env.FTP_BACKUP_DIR) fail('--backup-only needs FTP_BACKUP_DIR');
  if (process.env.FTP_BACKUP_DIR && !dryRun) {
    try {
      await backup();
    } catch (error) {
      fail(`backup failed, nothing uploaded (${error.message})`);
    }
  }

  if (backupOnly) {
    client.close();
    return;
  }

  if (dryRun) {
    if (process.env.FTP_BACKUP_DIR) console.log(`ftp-deploy: would back up the live site to ${process.env.FTP_BACKUP_DIR}`);
    changed.slice(0, 20).forEach(rel => console.log(`  + ${rel}`));
    removed.slice(0, 20).forEach(rel => console.log(`  - ${rel}`));
    client.close();
    return;
  }

  let currentDir = '';
  const upload = async rel => {
    const dir = path.posix.dirname(remotePath(rel));
    if (dir !== currentDir) {
      await client.ensureDir(dir);
      currentDir = dir;
    }
    // Full remote path, so it is right even on a new connection after a retry.
    await client.uploadFrom(path.join(localRoot, ...rel.split('/')), remotePath(rel));
  };

  let done = 0;
  for (const rel of changed) {
    await retry(`upload ${rel}`, () => upload(rel));
    done++;
    if (done % 250 === 0 || done === changed.length) console.log(`ftp-deploy: uploaded ${done}/${changed.length}`);
  }

  for (const rel of removed) {
    try {
      await retry(`remove ${rel}`, () => client.remove(remotePath(rel)));
    } catch (error) {
      console.warn(`ftp-deploy: could not remove ${rel} (${error.message})`);
    }
  }

  // Written last: if anything above failed, the next run still sees the old manifest and re-sends.
  // Skipped folders keep their entries from the last run that uploaded them.
  const manifest = { ...Object.fromEntries(Object.entries(previous).filter(([rel]) => inSkippedDir(rel))), ...local };
  await retry('upload manifest', () => client.uploadFrom(Readable.from([JSON.stringify(manifest)]), remotePath(MANIFEST)));
  client.close();
  console.log(`ftp-deploy: done - ${changed.length} uploaded, ${removed.length} removed`);
}

main().catch(error => fail(error.message));
