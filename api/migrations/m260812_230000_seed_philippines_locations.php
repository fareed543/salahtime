<?php

use yii\db\Migration;

class m260812_230000_seed_philippines_locations extends Migration
{
    public function safeUp()
    {
        $seedPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . 'philippines-location-seed.json';
        if (!is_file($seedPath)) {
            throw new \RuntimeException('Philippines location seed file not found at ' . $seedPath);
        }

        $payload = json_decode((string)file_get_contents($seedPath), true);
        if (!is_array($payload)) {
            throw new \RuntimeException('Philippines location seed file is invalid JSON.');
        }

        $country = $payload['country'] ?? null;
        $states = $payload['states'] ?? [];
        $cities = $payload['cities'] ?? [];

        if (!is_array($country) || !$states || !$cities) {
            throw new \RuntimeException('Philippines location seed file does not contain the required sections.');
        }

        $this->delete('{{%cities}}', ['country_id' => $this->fetchCountryIdBySlug('philippines')]);
        $this->delete('{{%states}}', ['country_id' => $this->fetchCountryIdBySlug('philippines')]);
        $this->delete('{{%countries}}', ['slug' => 'philippines']);

        $this->insert('{{%countries}}', [
            'name' => (string)$country['name'],
            'code' => (string)$country['code'],
            'slug' => (string)$country['slug'],
            'timezone' => (string)$country['timezone'],
            'is_active' => !empty($country['isActive']) ? 1 : 0,
        ]);

        $countryId = $this->fetchCountryIdBySlug((string)$country['slug']);
        if (!$countryId) {
            throw new \RuntimeException('Unable to create or resolve Philippines country record.');
        }

        $stateIdsByKey = [];
        foreach ($states as $state) {
            if (!is_array($state)) {
                continue;
            }

            $this->insert('{{%states}}', [
                'country_id' => $countryId,
                'name' => (string)$state['name'],
                'code' => (string)($state['code'] ?? ''),
                'slug' => (string)$state['slug'],
                'is_active' => !empty($state['isActive']) ? 1 : 0,
            ]);

            $stateId = $this->fetchStateId($countryId, (string)$state['slug']);
            if ($stateId) {
                $stateIdsByKey[(string)$state['key']] = $stateId;
            }
        }

        foreach ($cities as $city) {
            if (!is_array($city)) {
                continue;
            }

            $stateId = $stateIdsByKey[(string)($city['stateKey'] ?? '')] ?? null;
            if (!$stateId) {
                continue;
            }

            $this->insert('{{%cities}}', [
                'geoname_id' => isset($city['geonameId']) ? (int)$city['geonameId'] : null,
                'country_id' => $countryId,
                'state_id' => $stateId,
                'name' => (string)$city['name'],
                'ascii_name' => (string)($city['asciiName'] ?? ''),
                'slug' => (string)$city['slug'],
                'latitude' => (float)$city['latitude'],
                'longitude' => (float)$city['longitude'],
                'timezone' => (string)$city['timezone'],
                'population' => (int)($city['population'] ?? 0),
                'is_active' => !empty($city['isActive']) ? 1 : 0,
            ]);
        }
    }

    public function safeDown()
    {
        $countryId = $this->fetchCountryIdBySlug('philippines');
        if ($countryId) {
            $this->delete('{{%cities}}', ['country_id' => $countryId]);
            $this->delete('{{%states}}', ['country_id' => $countryId]);
        }

        $this->delete('{{%countries}}', ['slug' => 'philippines']);
    }

    private function fetchCountryIdBySlug(string $slug): ?int
    {
        $value = (new \yii\db\Query())
            ->select(['id'])
            ->from('{{%countries}}')
            ->where(['slug' => $slug])
            ->scalar();

        return $value === false || $value === null ? null : (int)$value;
    }

    private function fetchStateId(int $countryId, string $slug): ?int
    {
        $value = (new \yii\db\Query())
            ->select(['id'])
            ->from('{{%states}}')
            ->where(['country_id' => $countryId, 'slug' => $slug])
            ->scalar();

        return $value === false || $value === null ? null : (int)$value;
    }
}
