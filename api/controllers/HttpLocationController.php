<?php

namespace app\controllers;

use Yii;
use app\models\City;
use app\models\Country;
use app\models\StateProvince;
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

        $url = sprintf(
            'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=%s&lon=%s&zoom=12&addressdetails=1',
            rawurlencode((string)$latitude),
            rawurlencode((string)$longitude)
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

        return [
            'success' => true,
            'location' => [
                'city' => $city,
                'displayName' => !empty($displayParts) ? implode(', ', $displayParts) : $city,
                'state' => $state,
                'country' => $country,
                'pincode' => $pincode,
                'coordinates' => [
                    'latitude' => (float)$latitude,
                    'longitude' => (float)$longitude,
                ],
            ],
        ];
    }

    public function actionCountries()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        return [
            'items' => array_map([$this, 'serializeCountry'], Country::find()
                ->where(['status' => 1])
                ->orderBy(['sort_order' => SORT_ASC, 'name' => SORT_ASC])
                ->all()),
        ];
    }

    public function actionStates(string $countrySlug)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $country = Country::findOne(['slug' => $countrySlug, 'status' => 1]);
        if (!$country) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Country not found.'];
        }

        return [
            'country' => $this->serializeCountry($country),
            'items' => array_map([$this, 'serializeState'], StateProvince::find()
                ->where(['country_id' => (int)$country->id, 'status' => 1])
                ->orderBy(['sort_order' => SORT_ASC, 'name' => SORT_ASC])
                ->all()),
        ];
    }

    public function actionCities(int $stateId)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $state = StateProvince::findOne(['id' => $stateId, 'status' => 1]);
        if (!$state) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'State/province not found.'];
        }

        return [
            'state' => $this->serializeState($state),
            'items' => array_map([$this, 'serializeCity'], City::find()
                ->where(['state_id' => $stateId, 'status' => 1])
                ->orderBy(['is_featured' => SORT_DESC, 'sort_order' => SORT_ASC, 'name' => SORT_ASC])
                ->all()),
        ];
    }

    public function actionCity(string $publicId)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $city = City::find()
            ->where(['public_id' => $publicId, 'status' => 1])
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

        $query = City::find()
            ->alias('city')
            ->joinWith(['country country', 'state state'])
            ->where(['city.status' => 1]);

        if ($queryText !== '') {
            $query->andWhere([
                'or',
                ['like', 'city.name', $queryText],
                ['like', 'city.slug', $queryText],
                ['like', 'city.search_aliases', $queryText],
                ['like', 'state.name', $queryText],
                ['like', 'country.name', $queryText],
            ]);
        }

        return [
            'items' => array_map([$this, 'serializeCity'], $query
                ->orderBy(['city.is_featured' => SORT_DESC, 'city.name' => SORT_ASC])
                ->limit($limit)
                ->all()),
        ];
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

    private function serializeCountry(Country $country): array
    {
        return [
            'id' => (int)$country->id,
            'name' => (string)$country->name,
            'slug' => (string)$country->slug,
            'iso2Code' => (string)$country->iso2_code,
            'iso3Code' => (string)$country->iso3_code,
            'defaultTimezone' => (string)$country->default_timezone,
            'defaultLanguage' => (string)$country->default_language,
        ];
    }

    private function serializeState(StateProvince $state): array
    {
        return [
            'id' => (int)$state->id,
            'countryId' => (int)$state->country_id,
            'name' => (string)$state->name,
            'slug' => (string)$state->slug,
            'code' => (string)$state->code,
            'type' => (string)$state->type,
            'timezone' => (string)($state->timezone ?? ''),
        ];
    }

    private function serializeCity(City $city): array
    {
        $country = $city->country;
        $state = $city->state;
        $countrySlug = $country ? (string)$country->slug : '';
        $stateSlug = $state ? (string)$state->slug : '';

        return [
            'id' => (int)$city->id,
            'publicId' => (string)$city->public_id,
            'city' => (string)$city->name,
            'name' => (string)$city->name,
            'displayName' => implode(', ', array_filter([(string)$city->name, $state ? (string)$state->name : '', $country ? (string)$country->name : ''])),
            'state' => $state ? (string)$state->name : '',
            'stateId' => $state ? (int)$state->id : null,
            'stateSlug' => $stateSlug,
            'country' => $country ? (string)$country->name : '',
            'countryId' => $country ? (int)$country->id : null,
            'countrySlug' => $countrySlug,
            'slug' => (string)$city->slug,
            'timezone' => (string)$city->timezone,
            'cityType' => (string)$city->city_type,
            'coordinates' => [
                'latitude' => (float)$city->latitude,
                'longitude' => (float)$city->longitude,
            ],
            'canonicalPath' => sprintf('/en/prayer-times/%s/%s-%s/%s', $countrySlug, $stateSlug, (string)$city->slug, (string)$city->public_id),
        ];
    }
}
