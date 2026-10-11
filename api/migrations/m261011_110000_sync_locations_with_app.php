<?php

use yii\db\Migration;

/**
 * Makes the back office the single source of locations by aligning bt_countries / bt_cities with
 * the list the app shipped with (migrations/data/locations-app-2026-10-11.json: 16 countries, 2,103 cities).
 *
 * Matching is by country slug and city slug (the same slugs the website uses in /prayer-times URLs), so
 * cities that already exist keep their id and timezone; new ones are inserted; cities and countries that
 * are not in the app list are deleted. Irreversible.
 */
class m261011_110000_sync_locations_with_app extends Migration
{
    private const SEED = __DIR__ . '/data/locations-app-2026-10-11.json';

    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%countries}}', true) === null || $this->db->getTableSchema('{{%cities}}', true) === null) {
            throw new \RuntimeException('bt_countries / bt_cities are missing. Run the m260812 location migrations first.');
        }

        $seed = json_decode((string)file_get_contents(self::SEED), true);
        if (!is_array($seed) || empty($seed['countries']) || empty($seed['cities'])) {
            throw new \RuntimeException('Location seed file is missing or invalid: ' . self::SEED);
        }

        // Countries: upsert by slug.
        $countryIds = [];
        foreach ($seed['countries'] as $country) {
            $id = (new \yii\db\Query())->select('id')->from('{{%countries}}')->where(['slug' => $country['slug']])->scalar($this->db);
            $values = [
                'name' => $country['name'],
                'code' => $country['code'],
                'timezone' => $country['timezone'],
                'is_active' => 1,
            ];
            if ($id) {
                $this->db->createCommand()->update('{{%countries}}', $values, ['id' => $id])->execute();
            } else {
                $this->db->createCommand()->insert('{{%countries}}', $values + ['slug' => $country['slug']])->execute();
                $id = $this->db->getLastInsertID();
            }
            $countryIds[$country['slug']] = (int)$id;
        }

        // Cities: upsert by (country, slug); keep the id and timezone of cities that already exist.
        $existing = [];
        foreach ((new \yii\db\Query())->select(['id', 'country_id', 'slug'])->from('{{%cities}}')->all($this->db) as $row) {
            $existing[$row['country_id'] . '|' . $row['slug']] = (int)$row['id'];
        }
        $keep = [];
        $inserted = 0;
        $updated = 0;
        foreach ($seed['cities'] as $city) {
            $countryId = $countryIds[$city['countrySlug']] ?? null;
            if (!$countryId) {
                throw new \RuntimeException('City ' . $city['name'] . ' references unknown country ' . $city['countrySlug']);
            }
            $key = $countryId . '|' . $city['slug'];
            $values = [
                'name' => $city['name'],
                'latitude' => $city['latitude'],
                'longitude' => $city['longitude'],
                'is_active' => 1,
            ];
            if (isset($existing[$key])) {
                $this->db->createCommand()->update('{{%cities}}', $values, ['id' => $existing[$key]])->execute();
                $keep[$existing[$key]] = true;
                $updated++;
            } else {
                $this->db->createCommand()->insert('{{%cities}}', $values + [
                    'country_id' => $countryId,
                    'slug' => $city['slug'],
                    'timezone' => $city['timezone'],
                    'population' => 0,
                ])->execute();
                $keep[(int)$this->db->getLastInsertID()] = true;
                $inserted++;
            }
        }

        // Remove what the app does not have.
        $removeCities = array_values(array_diff(array_values($existing), array_keys($keep)));
        foreach (array_chunk($removeCities, 500) as $chunk) {
            $this->db->createCommand()->delete('{{%cities}}', ['id' => $chunk])->execute();
        }
        $removeCountries = (new \yii\db\Query())->select('id')->from('{{%countries}}')
            ->where(['not in', 'id', array_values($countryIds)])->column($this->db);
        if ($removeCountries) {
            $this->db->createCommand()->delete('{{%cities}}', ['country_id' => $removeCountries])->execute();
            $this->db->createCommand()->delete('{{%countries}}', ['id' => $removeCountries])->execute();
        }

        echo sprintf(
            "    > countries: %d kept/added, %d removed; cities: %d updated, %d added, %d removed\n",
            count($countryIds), count($removeCountries), $updated, $inserted, count($removeCities)
        );
    }

    public function safeDown()
    {
        echo "m261011_110000_sync_locations_with_app cannot be reverted.\n";
        return false;
    }
}
