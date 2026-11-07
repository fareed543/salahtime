#!/usr/bin/env node
// Google Play publishing for the SalahTime Android app (com.wallet.salahtime). Used by Jenkinsfile.android.
//
//   node deploy/play-upload.js next-version <gradle.properties>
//       Asks Play for the highest versionCode ever uploaded, writes code+1 and name 1.0.<code+1> into
//       APP_VERSION_CODE / APP_VERSION_NAME of the given gradle.properties, and prints them.
//   node deploy/play-upload.js upload <app-release.aab> [--track production] [--status completed]
//       [--notes "text" | --notes-file file]   (track/status also from PLAY_TRACK / PLAY_STATUS)
//       Uploads the bundle and puts it on the track. status: completed (roll out), draft (you press
//       "Start rollout" in Play Console), or inProgress with --fraction 0.1 for a staged rollout.
//
// Settings: PLAY_SERVICE_ACCOUNT_JSON = path to the service-account key file (Jenkins secret file).
//           PLAY_PACKAGE_NAME (default com.wallet.salahtime).
'use strict';

const fs = require('fs');

const PACKAGE = process.env.PLAY_PACKAGE_NAME || 'com.wallet.salahtime';
const [command, target, ...rest] = process.argv.slice(2);
const option = (name, fallback) => {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 && rest[index + 1] !== undefined ? rest[index + 1] : fallback;
};

const fail = message => {
  console.error(`play-upload: ${message}`);
  process.exit(1);
};

async function api() {
  const keyFile = process.env.PLAY_SERVICE_ACCOUNT_JSON;
  if (!keyFile || !fs.existsSync(keyFile)) fail('PLAY_SERVICE_ACCOUNT_JSON must point to the service-account key file');
  const { androidpublisher, auth } = require('@googleapis/androidpublisher');
  const client = new auth.GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
  return androidpublisher({ version: 'v3', auth: client });
}

/** Opens an edit, runs work(editId), and deletes the edit unless work committed it. */
async function withEdit(play, work, commit) {
  const { data } = await play.edits.insert({ packageName: PACKAGE });
  try {
    const result = await work(data.id);
    if (commit) await play.edits.commit({ packageName: PACKAGE, editId: data.id });
    return result;
  } finally {
    if (!commit) await play.edits.delete({ packageName: PACKAGE, editId: data.id }).catch(() => {});
  }
}

async function nextVersion(gradleProperties) {
  if (!gradleProperties || !fs.existsSync(gradleProperties)) fail(`gradle.properties not found: ${gradleProperties}`);
  const play = await api();
  const highest = await withEdit(play, async editId => {
    // Every bundle and APK ever uploaded counts, released or not: Play rejects any code already used.
    const [bundles, apks] = await Promise.all([
      play.edits.bundles.list({ packageName: PACKAGE, editId }),
      play.edits.apks.list({ packageName: PACKAGE, editId })
    ]);
    const codes = [...(bundles.data.bundles || []), ...(apks.data.apks || [])].map(item => Number(item.versionCode));
    return Math.max(0, ...codes);
  }, false);

  const content = fs.readFileSync(gradleProperties, 'utf8');
  const committed = Number((content.match(/^APP_VERSION_CODE=(\d+)/m) || [])[1] || 0);
  const code = Math.max(highest, committed - 1) + 1;
  const name = `1.0.${code}`;
  const updated = content
    .replace(/^APP_VERSION_CODE=.*$/m, `APP_VERSION_CODE=${code}`)
    .replace(/^APP_VERSION_NAME=.*$/m, `APP_VERSION_NAME=${name}`);
  fs.writeFileSync(gradleProperties, updated, 'utf8');
  console.log(`play-upload: highest versionCode on Play ${highest}, committed ${committed} -> building ${code} (${name})`);
}

async function upload(aab) {
  if (!aab || !fs.existsSync(aab)) fail(`bundle not found: ${aab}`);
  const track = option('track', process.env.PLAY_TRACK || 'production');
  const status = option('status', process.env.PLAY_STATUS || 'completed');
  const notesFile = option('notes-file', '');
  const notes = (notesFile && fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8') : option('notes', '')).trim();
  const fraction = Number(option('fraction', '0'));
  if (!['completed', 'draft', 'inProgress', 'halted'].includes(status)) fail(`unknown status ${status}`);
  if (status === 'inProgress' && !(fraction > 0 && fraction < 1)) fail('--status inProgress needs --fraction between 0 and 1');

  const play = await api();
  await withEdit(play, async editId => {
    console.log(`play-upload: uploading ${aab} (${(fs.statSync(aab).size / 1048576).toFixed(1)} MB)`);
    const { data: bundle } = await play.edits.bundles.upload({
      packageName: PACKAGE,
      editId,
      media: { mimeType: 'application/octet-stream', body: fs.createReadStream(aab) }
    }, { timeout: 15 * 60 * 1000 });
    const release = {
      versionCodes: [String(bundle.versionCode)],
      status,
      ...(status === 'inProgress' ? { userFraction: fraction } : {}),
      ...(notes ? { releaseNotes: [{ language: 'en-US', text: notes.slice(0, 500) }] } : {})
    };
    await play.edits.tracks.update({ packageName: PACKAGE, editId, track, requestBody: { track, releases: [release] } });
    console.log(`play-upload: versionCode ${bundle.versionCode} -> track "${track}", status "${status}"`);
  }, true);
  console.log('play-upload: committed. Google may review the release before users get it; see Play Console.');
}

const commands = { 'next-version': nextVersion, upload };
if (!commands[command]) fail('usage: play-upload.js next-version <gradle.properties> | upload <aab> [--track t] [--status s] [--notes n]');
commands[command](target).catch(error => fail(error.errors?.[0]?.message || error.message));
