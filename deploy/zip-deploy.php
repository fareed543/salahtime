<?php
// One-time release helper for deploy/zip-deploy.js (CR-022). Never edit a copy on the server:
// zip-deploy.js fills in the key hash and bundle name, uploads this file under a random name next to
// the bundle, calls it over HTTPS and deletes both at the end of the run.
//
// POST action=backup  zips the live site's own files into the backup folder, keeps the newest N.
// POST action=apply   unpacks the bundle (assets first, HTML and .htaccess last), removes files the
//                     new build no longer has, writes .deploy-manifest.json last.
// POST action=cleanup deletes the bundle and this script.
// Every call needs header X-Deploy-Key whose SHA-256 matches KEY_SHA256.
// Kept to PHP 7.0 syntax (Hostinger version can change).

const KEY_SHA256 = '__KEY_SHA256__';
const BUNDLE = '__BUNDLE__';
const MANIFEST = '.deploy-manifest.json';
const META_DIR = '__zd/';

header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function reply($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

$key = isset($_SERVER['HTTP_X_DEPLOY_KEY']) ? $_SERVER['HTTP_X_DEPLOY_KEY'] : '';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || strlen(KEY_SHA256) !== 64 || !hash_equals(KEY_SHA256, hash('sha256', $key))) {
    reply(404, ['ok' => false]);
}

@set_time_limit(900);
ignore_user_abort(true);
$root = __DIR__;
$bundlePath = $root . '/' . BUNDLE;
$action = isset($_POST['action']) ? $_POST['action'] : '';

/** A relative path from the bundle or request that stays inside the site folder. */
function safe_rel($rel) {
    $rel = str_replace('\\', '/', $rel);
    if ($rel === '' || $rel[0] === '/' || preg_match('#(^|/)\.\.(/|$)#', $rel) || strpos($rel, "\0") !== false) {
        reply(400, ['ok' => false, 'error' => "unsafe path: $rel"]);
    }
    return $rel;
}

function rrmdir($dir) {
    foreach (scandir($dir) as $name) {
        if ($name === '.' || $name === '..') continue;
        $path = "$dir/$name";
        is_dir($path) && !is_link($path) ? rrmdir($path) : @unlink($path);
    }
    return @rmdir($dir);
}

function add_tree(ZipArchive $zip, $abs, $rel, &$count) {
    foreach (scandir($abs) as $name) {
        if ($name === '.' || $name === '..') continue;
        $childAbs = "$abs/$name";
        $childRel = "$rel/$name";
        if (is_dir($childAbs)) add_tree($zip, $childAbs, $childRel, $count);
        elseif (is_file($childAbs)) { $zip->addFile($childAbs, $childRel); $count++; }
    }
}

if ($action === 'backup') {
    // Same scope as ftp-deploy.js: top-level files plus the top-level folders the build has, so other
    // apps in the folder (api/, backoffice/) and the backups themselves stay out.
    $backupRel = trim(safe_rel(ltrim(isset($_POST['backup_dir']) ? $_POST['backup_dir'] : 'Backup', '/')), '/');
    $prefix = preg_replace('/[^A-Za-z0-9]/', '', isset($_POST['prefix']) ? $_POST['prefix'] : 'FO');
    $keep = max(1, (int)(isset($_POST['keep']) ? $_POST['keep'] : 2));
    $dirs = array_filter(array_map('trim', explode(',', isset($_POST['dirs']) ? $_POST['dirs'] : '')));
    $backupDir = "$root/$backupRel";
    if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true)) reply(500, ['ok' => false, 'error' => "cannot create $backupRel"]);

    $name = $prefix . gmdate('Ymd-Hi', time() + 19800) . '.zip'; // India time, like ftp-deploy.js
    $zip = new ZipArchive();
    if ($zip->open("$backupDir/$name", ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) reply(500, ['ok' => false, 'error' => 'cannot create backup zip']);
    $count = 0;
    foreach (scandir($root) as $entry) {
        $abs = "$root/$entry";
        if ($entry === '.' || $entry === '..' || $entry === BUNDLE || $entry === basename(__FILE__)) continue;
        if (is_file($abs)) { $zip->addFile($abs, $entry); $count++; }
        elseif (is_dir($abs) && in_array($entry, $dirs, true) && $entry !== $backupRel) add_tree($zip, $abs, $entry, $count);
    }
    if ($count === 0) { $zip->close(); @unlink("$backupDir/$name"); reply(200, ['ok' => true, 'files' => 0, 'note' => 'live folder has no site files yet']); }
    if (!$zip->close()) reply(500, ['ok' => false, 'error' => 'writing the backup zip failed']);
    $size = filesize("$backupDir/$name");

    // Keep the newest <prefix> backups (zips and hand-made <prefix><date> folders); never touch others.
    $found = [];
    foreach (scandir($backupDir) as $entry) {
        if (preg_match('/^' . $prefix . '[\s_-]?(\d{8})(?:-(\d{4}))?(?:\.zip)?$/i', $entry, $m)) {
            $found[$entry] = $m[1] . (isset($m[2]) && $m[2] !== '' ? $m[2] : '0000');
        }
    }
    arsort($found, SORT_STRING);
    $deleted = [];
    foreach (array_slice(array_keys($found), $keep) as $old) {
        $path = "$backupDir/$old";
        if (is_dir($path) ? rrmdir($path) : @unlink($path)) $deleted[] = $old;
    }
    reply(200, ['ok' => true, 'backup' => "/$backupRel/$name", 'files' => $count, 'bytes' => $size, 'deleted' => $deleted]);
}

if ($action === 'apply') {
    $zip = new ZipArchive();
    if ($zip->open($bundlePath) !== true) reply(500, ['ok' => false, 'error' => 'cannot open bundle']);
    $manifest = $zip->getFromName(META_DIR . 'manifest.json');
    $removedJson = $zip->getFromName(META_DIR . 'removed.json');
    if ($manifest === false || $removedJson === false || json_decode($manifest) === null) reply(500, ['ok' => false, 'error' => 'bundle has no manifest']);

    // Check every path before anything on the site changes.
    $removedList = json_decode($removedJson, true);
    if (!is_array($removedList)) reply(500, ['ok' => false, 'error' => 'bad removed list']);
    $removedList = array_map('safe_rel', $removedList);

    // Assets and bundles first, HTML and .htaccess last, so a page never points at a missing bundle.
    $first = []; $last = [];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if (substr($name, -1) === '/' || strpos($name, META_DIR) === 0) continue;
        $name = safe_rel($name);
        if (preg_match('/\.html$/', $name) || basename($name) === '.htaccess') $last[] = $name; else $first[] = $name;
    }
    foreach ([$first, $last] as $group) {
        if ($group && !$zip->extractTo($root, $group)) reply(500, ['ok' => false, 'error' => 'extract failed', 'extracted_before' => $group === $last ? count($first) : 0]);
    }
    $zip->close();

    $removed = 0; $notRemoved = [];
    foreach ($removedList as $rel) {
        $path = $root . '/' . $rel;
        if (!file_exists($path) || @unlink($path)) $removed++; else $notRemoved[] = $rel;
    }
    // Written last: if anything above failed, the next run still sees the old manifest and re-sends.
    if (file_put_contents("$root/" . MANIFEST, $manifest) === false) reply(500, ['ok' => false, 'error' => 'cannot write manifest']);
    reply(200, ['ok' => true, 'extracted' => count($first) + count($last), 'removed' => $removed, 'not_removed' => $notRemoved]);
}

if ($action === 'cleanup') {
    @unlink($bundlePath);
    @unlink(__FILE__);
    reply(200, ['ok' => true]);
}

reply(400, ['ok' => false, 'error' => 'unknown action']);
