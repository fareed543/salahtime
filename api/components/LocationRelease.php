<?php

namespace app\components;

use app\models\Customer;
use Yii;
use yii\db\Query;
use yii\helpers\Url;

/**
 * Publishes the location list the app uses (offline city search, labels, SEO pages).
 *
 * The back office edits bt_countries / bt_cities; "Release" writes the active ones to
 * web/locations/locations-v<version>.json and records it in bt_location_release. The app checks
 * http-location/latest-release and downloads a newer file; its bundled assets/locations.json is the fallback.
 *
 * Each item keeps the fields the app already reads (city, country, coordinates) and adds slug,
 * countrySlug and timezone.
 */
class LocationRelease
{
    private const DIR = '@webroot/locations';
    private const TABLE = '{{%location_release}}';

    /**
     * Active cities of active countries. Countries with the most cities come first (the app shows
     * search matches in list order), cities alphabetically within a country.
     */
    public static function buildList(): array
    {
        $rows = (new Query())
            ->select([
                'city' => 'ci.name', 'slug' => 'ci.slug', 'timezone' => 'ci.timezone',
                'latitude' => 'ci.latitude', 'longitude' => 'ci.longitude',
                'country' => 'co.name', 'countrySlug' => 'co.slug', 'countryId' => 'co.id',
            ])
            ->from(['ci' => '{{%cities}}'])
            ->innerJoin(['co' => '{{%countries}}'], 'co.id = ci.country_id')
            ->where(['ci.is_active' => 1, 'co.is_active' => 1])
            ->all();

        $perCountry = [];
        foreach ($rows as $row) {
            $perCountry[$row['countryId']] = ($perCountry[$row['countryId']] ?? 0) + 1;
        }
        usort($rows, static function (array $a, array $b) use ($perCountry): int {
            return [$perCountry[$b['countryId']], $a['country'], $a['city']] <=> [$perCountry[$a['countryId']], $b['country'], $b['city']];
        });

        return array_map(static function (array $row): array {
            return [
                'city' => (string)$row['city'],
                'country' => (string)$row['country'],
                'countrySlug' => (string)$row['countrySlug'],
                'slug' => (string)$row['slug'],
                'timezone' => (string)$row['timezone'],
                'coordinates' => [
                    'latitude' => round((float)$row['latitude'], 6),
                    'longitude' => round((float)$row['longitude'], 6),
                ],
            ];
        }, $rows);
    }

    public static function encode(array $list): string
    {
        return json_encode($list, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function tableExists(): bool
    {
        return Yii::$app->db->getTableSchema(self::TABLE, true) !== null;
    }

    public static function latest(): ?array
    {
        if (!self::tableExists()) {
            return null;
        }
        $row = (new Query())->from(self::TABLE)->orderBy(['version' => SORT_DESC])->one();
        return $row ? self::serialize($row) : null;
    }

    public static function history(int $limit = 10): array
    {
        if (!self::tableExists()) {
            return [];
        }
        return array_map([self::class, 'serialize'], (new Query())->from(self::TABLE)->orderBy(['version' => SORT_DESC])->limit($limit)->all());
    }

    /**
     * What a release would publish right now, compared with the latest release.
     */
    public static function draft(): array
    {
        $list = self::buildList();
        $json = self::encode($list);
        $latest = self::latest();
        $previous = $latest ? self::readReleaseFile($latest['fileName']) : null;

        return [
            'cityCount' => count($list),
            'countryCount' => count(array_unique(array_column($list, 'countrySlug'))),
            'checksum' => hash('sha256', $json),
            'upToDate' => $latest !== null && $latest['checksum'] === hash('sha256', $json),
            'changes' => self::diff($previous ?? [], $list),
            'comparedWith' => $latest ? $latest['version'] : null,
        ];
    }

    /**
     * @return array{0: array|null, 1: string|null} [release, error]
     */
    public static function release(Customer $admin, string $notes = ''): array
    {
        if (!self::tableExists()) {
            return [null, 'The location release table is missing. Run the database migration first.'];
        }

        $list = self::buildList();
        if (!$list) {
            return [null, 'There are no active cities to release.'];
        }
        $json = self::encode($list);
        $checksum = hash('sha256', $json);
        $latest = self::latest();
        if ($latest && $latest['checksum'] === $checksum) {
            return [null, 'Nothing changed since version ' . $latest['version'] . '.'];
        }

        $version = ($latest['version'] ?? 0) + 1;
        $fileName = sprintf('locations-v%d.json', $version);
        $dir = Yii::getAlias(self::DIR);
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            return [null, 'Could not create the locations folder on the server.'];
        }
        if (file_put_contents($dir . DIRECTORY_SEPARATOR . $fileName, $json, LOCK_EX) === false) {
            return [null, 'Could not write the location file on the server.'];
        }

        $previous = $latest ? self::readReleaseFile($latest['fileName']) : null;
        $changes = self::diff($previous ?? [], $list);
        Yii::$app->db->createCommand()->insert(self::TABLE, [
            'version' => $version,
            'file_name' => $fileName,
            'checksum' => $checksum,
            'country_count' => count(array_unique(array_column($list, 'countrySlug'))),
            'city_count' => count($list),
            'changes' => json_encode($changes['counts']),
            'notes' => mb_substr(trim($notes), 0, 500) ?: null,
            'released_by' => (int)$admin->id,
            'released_by_name' => trim(($admin->firstname ?? '') . ' ' . ($admin->lastname ?? '')),
            'released_at' => date('Y-m-d H:i:s'),
        ])->execute();

        return [self::latest(), null];
    }

    /**
     * Added / removed / updated cities between two lists, keyed by country + city slug.
     * Each entry is a short label; the lists are capped so the response stays small.
     */
    public static function diff(array $before, array $after, int $cap = 50): array
    {
        $index = static function (array $list): array {
            $out = [];
            foreach ($list as $item) {
                $country = $item['countrySlug'] ?? self::slugify((string)($item['country'] ?? ''));
                $slug = $item['slug'] ?? self::slugify((string)($item['city'] ?? ''));
                $out[$country . '/' . $slug] = $item;
            }
            return $out;
        };
        $old = $index($before);
        $new = $index($after);

        $label = static function (array $item): string {
            return $item['city'] . ', ' . $item['country'];
        };
        $added = array_map($label, array_values(array_diff_key($new, $old)));
        $removed = array_map($label, array_values(array_diff_key($old, $new)));
        $updated = [];
        foreach (array_intersect_key($new, $old) as $key => $item) {
            $was = $old[$key];
            if ($item['city'] !== $was['city'] || $item['country'] !== $was['country']
                || ($item['timezone'] ?? '') !== ($was['timezone'] ?? '')
                || abs($item['coordinates']['latitude'] - $was['coordinates']['latitude']) > 0.000001
                || abs($item['coordinates']['longitude'] - $was['coordinates']['longitude']) > 0.000001) {
                $updated[] = $label($item);
            }
        }

        return [
            'added' => array_slice($added, 0, $cap),
            'removed' => array_slice($removed, 0, $cap),
            'updated' => array_slice($updated, 0, $cap),
            'counts' => ['added' => count($added), 'removed' => count($removed), 'updated' => count($updated)],
        ];
    }

    public static function fileUrl(string $fileName): string
    {
        return rtrim(Url::base(true), '/') . '/locations/' . rawurlencode($fileName);
    }

    private static function readReleaseFile(string $fileName): ?array
    {
        $path = Yii::getAlias(self::DIR) . DIRECTORY_SEPARATOR . basename($fileName);
        if (!is_file($path)) {
            return null;
        }
        $decoded = json_decode((string)file_get_contents($path), true);
        return is_array($decoded) ? $decoded : null;
    }

    private static function serialize(array $row): array
    {
        return [
            'version' => (int)$row['version'],
            'fileName' => (string)$row['file_name'],
            'url' => self::fileUrl((string)$row['file_name']),
            'checksum' => (string)$row['checksum'],
            'countryCount' => (int)$row['country_count'],
            'cityCount' => (int)$row['city_count'],
            'changes' => json_decode((string)($row['changes'] ?? ''), true) ?: null,
            'notes' => $row['notes'],
            'releasedBy' => $row['released_by_name'],
            'releasedAt' => gmdate(DATE_ATOM, strtotime((string)$row['released_at'])),
        ];
    }

    private static function slugify(string $value): string
    {
        return \app\models\LocationCountry::slugify($value);
    }
}
