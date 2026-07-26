<?php

namespace app\controllers;

use Yii;
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
}
