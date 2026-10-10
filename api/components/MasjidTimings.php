<?php

namespace app\components;

use app\models\MasjidTiming;
use app\models\MasjidTimingVersion;
use Yii;

/**
 * Single write path for masjid salah timings, used by the app and the back office.
 *
 * masjid_timing holds the current set. Every change also appends a full snapshot to
 * masjid_timing_version, so any earlier set can be restored. Saving identical timings
 * (e.g. editing only the masjid's address) does not create a new version.
 */
class MasjidTimings
{
    /** Older versions beyond this are pruned (with their board photos). */
    public const KEEP_VERSIONS = 30;

    /**
     * Normalises raw rows from a request into [{salah, azan, jamat}], dropping rows with no salah.
     */
    public static function normalize(array $rows): array
    {
        $result = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $salah = trim((string)($row['salah'] ?? ''));
            if ($salah === '') {
                continue;
            }
            $result[] = [
                'salah' => mb_substr($salah, 0, 100),
                'azan' => mb_substr(trim((string)($row['azan'] ?? $row['azan_time'] ?? '')), 0, 50),
                'jamat' => mb_substr(trim((string)($row['jamat'] ?? $row['jamat_time'] ?? '')), 0, 50),
            ];
        }
        return $result;
    }

    public static function current(int $masjidId): array
    {
        $rows = MasjidTiming::find()
            ->where(['id_masjid' => $masjidId])
            ->orderBy(['sort_order' => SORT_ASC, 'id_masjid_timing' => SORT_ASC])
            ->asArray()
            ->all();

        return array_map(function (array $row) {
            return [
                'salah' => (string)$row['salah'],
                'azan' => (string)($row['azan_time'] ?? ''),
                'jamat' => (string)($row['jamat_time'] ?? ''),
            ];
        }, $rows);
    }

    /**
     * Replaces the current timings and records a version when they changed.
     *
     * @return MasjidTimingVersion|null the new version, or null when nothing changed
     */
    public static function save(
        int $masjidId,
        array $rows,
        string $source,
        ?int $customerId,
        ?string $imageUrl = null,
        ?int $restoredFrom = null
    ): ?MasjidTimingVersion {
        $timings = self::normalize($rows);
        $db = Yii::$app->db;
        $ownTransaction = $db->getTransaction() === null;
        $transaction = $ownTransaction ? $db->beginTransaction() : null;

        try {
            $changed = $timings !== self::current($masjidId);

            if ($changed) {
                MasjidTiming::deleteAll(['id_masjid' => $masjidId]);
                foreach ($timings as $index => $timing) {
                    $row = new MasjidTiming();
                    $row->id_masjid = $masjidId;
                    $row->salah = $timing['salah'];
                    $row->azan_time = $timing['azan'];
                    $row->jamat_time = $timing['jamat'];
                    $row->sort_order = $index;
                    if (!$row->save()) {
                        throw new \RuntimeException('Could not save timing: ' . json_encode($row->getFirstErrors()));
                    }
                }
            }

            // A capture or restore is recorded even when the times match, so its photo/history is kept.
            $version = null;
            if ($changed || $source === 'capture' || $source === 'restore') {
                $version = self::appendVersion($masjidId, $timings, $source, $customerId, $imageUrl, $restoredFrom);
            }

            if ($transaction) {
                $transaction->commit();
            }
        } catch (\Throwable $e) {
            if ($transaction) {
                $transaction->rollBack();
            }
            throw $e;
        }

        if ($version) {
            self::prune($masjidId);
        }
        return $version;
    }

    /**
     * Makes an earlier version current again, recorded as a new "restore" version.
     */
    public static function restore(int $masjidId, int $versionId, ?int $customerId): ?MasjidTimingVersion
    {
        $version = MasjidTimingVersion::findOne([
            'id_masjid_timing_version' => $versionId,
            'id_masjid' => $masjidId,
        ]);
        if (!$version) {
            return null;
        }

        return self::save(
            $masjidId,
            $version->getTimingRows(),
            'restore',
            $customerId,
            $version->image_url,
            (int)$version->version_no
        );
    }

    /** Newest first. */
    public static function versions(int $masjidId): array
    {
        $versions = MasjidTimingVersion::find()
            ->where(['id_masjid' => $masjidId])
            ->orderBy(['version_no' => SORT_DESC])
            ->all();

        $names = self::customerNames(array_filter(array_map(function ($v) {
            return $v->id_customer;
        }, $versions)));

        $latest = $versions[0]->version_no ?? null;
        return array_map(function (MasjidTimingVersion $version) use ($names, $latest) {
            return [
                'id' => (int)$version->id_masjid_timing_version,
                'versionNo' => (int)$version->version_no,
                'source' => $version->source,
                'imageUrl' => $version->image_url,
                'restoredFrom' => $version->restored_from !== null ? (int)$version->restored_from : null,
                'createdBy' => $names[(int)$version->id_customer] ?? null,
                'createdAt' => $version->created_at,
                'isCurrent' => (int)$version->version_no === (int)$latest,
                'timings' => $version->getTimingRows(),
            ];
        }, $versions);
    }

    private static function appendVersion(
        int $masjidId,
        array $timings,
        string $source,
        ?int $customerId,
        ?string $imageUrl,
        ?int $restoredFrom
    ): MasjidTimingVersion {
        $next = (int)MasjidTimingVersion::find()->where(['id_masjid' => $masjidId])->max('version_no') + 1;

        $version = new MasjidTimingVersion();
        $version->id_masjid = $masjidId;
        $version->version_no = $next;
        $version->timings = json_encode($timings, JSON_UNESCAPED_UNICODE);
        $version->source = $source;
        $version->image_url = $imageUrl;
        $version->restored_from = $restoredFrom;
        $version->id_customer = $customerId;
        if (!$version->save()) {
            throw new \RuntimeException('Could not save timing version: ' . json_encode($version->getFirstErrors()));
        }
        return $version;
    }

    private static function prune(int $masjidId): void
    {
        $stale = MasjidTimingVersion::find()
            ->where(['id_masjid' => $masjidId])
            ->orderBy(['version_no' => SORT_DESC])
            ->offset(self::KEEP_VERSIONS)
            ->all();

        foreach ($stale as $version) {
            $imageUrl = $version->image_url;
            $version->delete();
            // A restore re-uses the photo URL of the version it came from; only delete unreferenced files.
            if ($imageUrl && !MasjidTimingVersion::find()->where(['image_url' => $imageUrl])->exists()) {
                MasjidMedia::deleteByUrl($imageUrl);
            }
        }
    }

    /**
     * Deletes captured board photos that never became part of a version (the user captured,
     * then cancelled). Only photos older than a day, so an in-progress review is never hit.
     */
    public static function sweepUnusedBoardPhotos(int $masjidId): void
    {
        $used = MasjidTimingVersion::find()
            ->select('image_url')
            ->where(['id_masjid' => $masjidId])
            ->andWhere(['not', ['image_url' => null]])
            ->column();
        $usedNames = array_map(function ($url) {
            return basename((string)parse_url($url, PHP_URL_PATH));
        }, $used);

        foreach (MasjidMedia::timingBoardFiles($masjidId) as $path => $url) {
            if (!in_array(basename($path), $usedNames, true) && filemtime($path) < time() - 86400) {
                @unlink($path);
            }
        }
    }

    private static function customerNames(array $ids): array
    {
        if (!$ids) {
            return [];
        }
        $rows = (new \yii\db\Query())
            ->select(['id', 'firstname', 'lastname'])
            ->from('{{%customer}}')
            ->where(['id' => array_values(array_unique($ids))])
            ->all();

        $names = [];
        foreach ($rows as $row) {
            $names[(int)$row['id']] = trim(($row['firstname'] ?? '') . ' ' . ($row['lastname'] ?? ''));
        }
        return $names;
    }
}
