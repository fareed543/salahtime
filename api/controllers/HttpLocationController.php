<?php

namespace app\controllers;

use Yii;
use app\components\LocationRelease;
use app\models\LocationCity;
use app\models\LocationCountry;
use yii\web\Controller;
use yii\web\Response;

class HttpLocationController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['GET', 'HEAD', 'OPTIONS'],
                'Access-Control-Allow-Credentials' => Yii::$app->params['corsAllowCredentials'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Max-Age' => 86400,
            ],
        ];

        return $behaviors;
    }

    public function actionReverseGeocode()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $latitude = Yii::$app->request->get('lat');
        $longitude = Yii::$app->request->get('lng');

        if (!is_numeric($latitude) || !is_numeric($longitude)) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'message' => 'Valid lat and lng are required.',
            ];
        }

        $detailed = (string)Yii::$app->request->get('detail') === '1';

        // The app names every auto-detected location through here and Nominatim allows about one
        // request a second, so nearby fixes share a cached address (3 decimals ~ 110 m, 4 ~ 11 m).
        $precision = $detailed ? 4 : 3;
        $cacheKey = ['reverse-geocode', $detailed, round((float)$latitude, $precision), round((float)$longitude, $precision)];
        $address = Yii::$app->cache->get($cacheKey);
        if (!is_array($address)) {
            // Zoom 14 keeps small towns and villages (Yercaud rather than its district, Salem);
            // English names so places do not come back in the local script.
            $url = sprintf(
                'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=%s&lon=%s&zoom=%d&addressdetails=1&accept-language=en',
                rawurlencode((string)$latitude),
                rawurlencode((string)$longitude),
                $detailed ? 18 : 14
            );

            $payload = $this->requestJson($url);
            if (!$payload) {
                Yii::$app->response->statusCode = 503;
                return [
                    'success' => false,
                    'message' => 'Unable to resolve location name right now.',
                ];
            }

            $address = $payload['address'] ?? [];
            Yii::$app->cache->set($cacheKey, $address, 30 * 86400);
        }

        $city = $address['city']
            ?? $address['town']
            ?? $address['village']
            ?? $address['municipality']
            ?? $address['county']
            ?? $address['state_district']
            ?? $address['suburb']
            ?? 'Current Location';
        $state = $address['state'] ?? $address['region'] ?? null;
        $country = $address['country'] ?? null;
        $pincode = $address['postcode'] ?? null;

        $displayParts = array_values(array_filter([$city, $state, $country], function ($value) {
            return is_string($value) && trim($value) !== '';
        }));

        $location = [
            'city' => $city,
            'displayName' => !empty($displayParts) ? implode(', ', $displayParts) : $city,
            'state' => $state,
            'country' => $country,
            'pincode' => $pincode,
            'coordinates' => [
                'latitude' => (float)$latitude,
                'longitude' => (float)$longitude,
            ],
        ];

        if ($detailed) {
            $location['area'] = $address['suburb'] ?? $address['neighbourhood'] ?? $address['quarter'] ?? $address['city_district'] ?? null;
            $location['street'] = implode(', ', array_values(array_filter([
                trim(($address['house_number'] ?? '') . ' ' . ($address['road'] ?? '')),
            ], static function ($value) {
                return $value !== '';
            }))) ?: null;
        }

        return [
            'success' => true,
            'location' => $location,
        ];
    }

    /**
     * Indian pincode lookup via the India Post API: district, state and the post office
     * names (useful as area suggestions). Cached, since pincodes rarely change.
     */
    public function actionPincode()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $code = trim((string)Yii::$app->request->get('code', ''));
        if (!preg_match('/^[1-9]\d{5}$/', $code)) {
            Yii::$app->response->statusCode = 422;
            return ['success' => false, 'message' => 'A valid 6-digit pincode is required.'];
        }

        $cacheKey = ['pincode-lookup', $code];
        $cached = Yii::$app->cache->get($cacheKey);
        if ($cached !== false) {
            return $cached;
        }

        $payload = $this->requestJson('https://api.postalpincode.in/pincode/' . $code)
            ?? $this->requestJson('http://api.postalpincode.in/pincode/' . $code);
        if (!$payload) {
            Yii::$app->response->statusCode = 503;
            return ['success' => false, 'message' => 'Pincode lookup is unavailable right now.'];
        }

        $offices = $payload[0]['PostOffice'] ?? null;
        if (($payload[0]['Status'] ?? '') !== 'Success' || !is_array($offices) || !$offices) {
            $result = ['success' => false, 'message' => 'Pincode not found.'];
            Yii::$app->cache->set($cacheKey, $result, 86400);
            Yii::$app->response->statusCode = 404;
            return $result;
        }

        $first = $offices[0];
        $areas = array_values(array_unique(array_filter(array_map(static function ($office) {
            return trim((string)($office['Name'] ?? ''));
        }, $offices))));

        $result = [
            'success' => true,
            'pincode' => $code,
            'city' => $this->mostCommon(array_column($offices, 'District')) ?? ($first['District'] ?? null),
            'state' => $first['State'] ?? null,
            'country' => $first['Country'] ?? 'India',
            'areas' => $areas,
        ];
        Yii::$app->cache->set($cacheKey, $result, 30 * 86400);

        return $result;
    }

    /**
     * Latest location list released from the back office. The app compares `version` with its cached copy
     * and downloads `url` when it is newer; without a release it keeps its bundled list.
     */
    public function actionLatestRelease()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->headers->set('Cache-Control', 'public, max-age=300');
        $latest = LocationRelease::latest();
        if (!$latest) {
            return ['version' => 0];
        }

        return [
            'version' => $latest['version'],
            'url' => $latest['url'],
            'checksum' => $latest['checksum'],
            'cityCount' => $latest['cityCount'],
            'countryCount' => $latest['countryCount'],
            'releasedAt' => $latest['releasedAt'],
        ];
    }

    public function actionCountries()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        return [
            'items' => array_map([$this, 'serializeCountry'], LocationCountry::find()
                ->where(['is_active' => 1])
                ->orderBy(['name' => SORT_ASC])
                ->all()),
        ];
    }

    public function actionCountryDirectory(string $countrySlug)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $country = LocationCountry::findOne(['slug' => $countrySlug, 'is_active' => 1]);
        if (!$country) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Country not found.'];
        }

        return [
            'country' => $this->serializeCountry($country),
            'items' => array_map([$this, 'serializeCity'], LocationCity::find()
                ->where(['country_id' => (int)$country->id, 'is_active' => 1])
                ->orderBy(['name' => SORT_ASC])
                ->all()),
        ];
    }

    public function actionCity(string $publicId)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $city = LocationCity::find()
            ->where(['is_active' => 1])
            ->andWhere([
                'or',
                ['geoname_id' => ctype_digit($publicId) ? (int)$publicId : -1],
                ['id' => ctype_digit($publicId) ? (int)$publicId : -1],
                ['slug' => $publicId],
            ])
            ->one();

        if (!$city) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'City not found.'];
        }

        return ['item' => $this->serializeCity($city)];
    }

    public function actionSearch()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $queryText = trim((string)Yii::$app->request->get('q', ''));
        $limit = max(1, min(25, (int)Yii::$app->request->get('limit', 10)));

        $query = LocationCity::find()
            ->alias('city')
            ->joinWith('country country')
            ->where(['city.is_active' => 1]);

        if ($queryText !== '') {
            $query->andWhere([
                'or',
                ['like', 'city.name', $queryText],
                ['like', 'city.slug', $queryText],
                ['like', 'city.ascii_name', $queryText],
                ['like', 'country.name', $queryText],
            ]);
        }

        return [
            'items' => array_map([$this, 'serializeCity'], $query
                ->orderBy(['city.name' => SORT_ASC])
                ->limit($limit)
                ->all()),
        ];
    }

    /** Most frequent non-empty value (post offices under one pincode can list different districts). */
    private function mostCommon(array $values): ?string
    {
        $counts = array_count_values(array_filter(array_map('trim', array_map('strval', $values))));
        if (!$counts) {
            return null;
        }
        arsort($counts);
        return (string)array_key_first($counts);
    }

    private function requestJson(string $url): ?array
    {
        $userAgent = 'SalahTime/1.0 (+https://salah-times.in)';

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_HTTPHEADER => [
                    'Accept: application/json',
                    'User-Agent: ' . $userAgent,
                ],
            ]);

            $response = curl_exec($ch);
            $statusCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($response === false || $statusCode >= 400) {
                return null;
            }

            $decoded = json_decode($response, true);
            return is_array($decoded) ? $decoded : null;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 10,
                'header' => implode("\r\n", [
                    'Accept: application/json',
                    'User-Agent: ' . $userAgent,
                ]),
            ],
        ]);

        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            return null;
        }

        $decoded = json_decode($response, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function serializeCountry(LocationCountry $country): array
    {
        return [
            'id' => (int)$country->id,
            'name' => (string)$country->name,
            'slug' => (string)$country->slug,
            'iso2Code' => (string)$country->code,
            'iso3Code' => (string)$country->code,
            'defaultTimezone' => (string)($country->timezone ?? ''),
            'defaultLanguage' => 'en',
        ];
    }

    private function serializeCity(LocationCity $city): array
    {
        $country = $city->country;
        $countrySlug = $country ? (string)$country->slug : '';

        return [
            'id' => (int)$city->id,
            'publicId' => (string)($city->geoname_id ?? $city->id),
            'city' => (string)$city->name,
            'name' => (string)$city->name,
            'displayName' => implode(', ', array_filter([(string)$city->name, $country ? (string)$country->name : ''])),
            'country' => $country ? (string)$country->name : '',
            'countryId' => $country ? (int)$country->id : null,
            'countrySlug' => $countrySlug,
            'slug' => (string)$city->slug,
            'timezone' => (string)$city->timezone,
            'cityType' => '',
            'coordinates' => [
                'latitude' => (float)$city->latitude,
                'longitude' => (float)$city->longitude,
            ],
            'canonicalPath' => sprintf('/prayer-times/%s', (string)$city->slug),
        ];
    }
}
