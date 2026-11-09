<?php

namespace app\components;

use Yii;
use yii\helpers\Json;

/**
 * NF-013: Firebase Cloud Messaging HTTP v1 client.
 *
 * Authenticates with the Firebase Admin SDK service account (JSON file, path in params
 * `fcmServiceAccount` / env FCM_SERVICE_ACCOUNT, kept outside the web root and out of git):
 * a signed JWT is exchanged for an OAuth2 access token, cached ~50 minutes.
 *
 * - send():            one message to a topic or one device token (messages:send)
 * - subscribeToTopic(): adds device tokens to a topic (Instance ID batchAdd)
 *
 * Never throws: every method returns ['ok' => bool, ...] and logs failures, because a push
 * always accompanies something that is already saved.
 */
class FcmClient
{
    public const TOPIC_ALL = 'all-users';
    private const TOKEN_CACHE_KEY = 'fcm_oauth_access_token';
    private const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    /** True when a readable service-account file is configured. */
    public static function isConfigured(): bool
    {
        return self::serviceAccount() !== null;
    }

    /**
     * Sends a notification. $target is ['topic' => 'all-users'] or ['token' => '<device token>'].
     * @return array{ok: bool, status?: int, error?: string, unregistered?: bool, name?: string}
     */
    public static function send(array $target, string $title, string $body, array $data = []): array
    {
        $account = self::serviceAccount();
        if ($account === null) {
            return self::fail('Firebase is not configured on this server (FCM_SERVICE_ACCOUNT).');
        }
        $accessToken = self::accessToken($account);
        if ($accessToken === null) {
            return self::fail('Could not sign in to Firebase with the service account.');
        }

        $message = array_merge($target, [
            'notification' => ['title' => $title, 'body' => $body],
            'data' => array_map('strval', $data),
            'android' => [
                'priority' => 'high',
                'notification' => [
                    'channel_id' => 'announcements',
                    'icon' => 'ic_stat_salah',
                    'color' => '#195147',
                    'sound' => 'default',
                ],
            ],
        ]);

        $url = 'https://fcm.googleapis.com/v1/projects/' . rawurlencode($account['project_id']) . '/messages:send';
        [$status, $response, $curlError] = self::post($url, ['message' => $message], [
            'Authorization: Bearer ' . $accessToken,
        ]);

        if ($status >= 200 && $status < 300) {
            return ['ok' => true, 'status' => $status, 'name' => $response['name'] ?? null];
        }

        $errorStatus = $response['error']['status'] ?? '';
        $errorCode = '';
        foreach (($response['error']['details'] ?? []) as $detail) {
            $errorCode = $detail['errorCode'] ?? $errorCode;
        }
        $reason = $curlError !== '' ? $curlError : (($response['error']['message'] ?? '') ?: 'HTTP ' . $status);
        Yii::warning(sprintf('FCM send failed (%s): HTTP %d %s %s', isset($target['topic']) ? 'topic ' . $target['topic'] : 'token', $status, $errorStatus ?: $errorCode, $reason), __METHOD__);

        return [
            'ok' => false,
            'status' => $status,
            'error' => $reason,
            // The app was uninstalled or the token expired: the caller deletes it.
            'unregistered' => $errorCode === 'UNREGISTERED' || ($status === 404 && $errorStatus === 'NOT_FOUND')
                || ($errorCode === 'INVALID_ARGUMENT' && stripos($reason, 'registration token') !== false),
        ];
    }

    /**
     * Subscribes device tokens to a topic (max 1000 per call).
     * @return array{ok: bool, error?: string}
     */
    public static function subscribeToTopic(array $tokens, string $topic = self::TOPIC_ALL): array
    {
        return self::topicMembership('batchAdd', $tokens, $topic);
    }

    public static function unsubscribeFromTopic(array $tokens, string $topic = self::TOPIC_ALL): array
    {
        return self::topicMembership('batchRemove', $tokens, $topic);
    }

    private static function topicMembership(string $operation, array $tokens, string $topic): array
    {
        $tokens = array_values(array_filter(array_map('strval', $tokens)));
        if (!$tokens) {
            return ['ok' => true];
        }
        $account = self::serviceAccount();
        $accessToken = $account ? self::accessToken($account) : null;
        if ($accessToken === null) {
            return self::fail('Firebase is not configured on this server (FCM_SERVICE_ACCOUNT).');
        }
        [$status, $response, $curlError] = self::post(
            'https://iid.googleapis.com/iid/v1:' . $operation,
            ['to' => '/topics/' . $topic, 'registration_tokens' => array_slice($tokens, 0, 1000)],
            ['Authorization: Bearer ' . $accessToken, 'access_token_auth: true']
        );
        $itemErrors = array_filter(array_column($response['results'] ?? [], 'error'));
        if ($status >= 200 && $status < 300 && !$itemErrors) {
            return ['ok' => true];
        }
        $reason = $curlError !== '' ? $curlError : ($itemErrors ? implode(', ', array_unique($itemErrors)) : ($response['error'] ?? 'HTTP ' . $status));
        Yii::warning(sprintf('FCM topic %s %s failed: HTTP %d %s', $operation, $topic, $status, is_string($reason) ? $reason : Json::encode($reason)), __METHOD__);
        return ['ok' => false, 'error' => is_string($reason) ? $reason : Json::encode($reason)];
    }

    /** The service-account JSON, or null when not configured / unreadable. */
    private static function serviceAccount(): ?array
    {
        static $account = false;
        if ($account !== false) {
            return $account;
        }
        $path = (string)(Yii::$app->params['fcmServiceAccount'] ?? '');
        $account = null;
        if ($path !== '' && is_readable($path)) {
            $json = json_decode((string)file_get_contents($path), true);
            if (is_array($json) && !empty($json['client_email']) && !empty($json['private_key']) && !empty($json['project_id'])) {
                $account = $json;
            } else {
                Yii::warning('FCM service-account file is not a valid service-account JSON.', __METHOD__);
            }
        } elseif ($path !== '') {
            Yii::warning('FCM service-account file not found or not readable.', __METHOD__);
        }
        return $account;
    }

    /** OAuth2 access token from a JWT signed with the service account's private key (RS256). */
    private static function accessToken(array $account): ?string
    {
        $cache = Yii::$app->cache;
        $cached = $cache ? $cache->get(self::TOKEN_CACHE_KEY) : false;
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $now = time();
        $b64 = static function (string $value): string {
            return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
        };
        $header = $b64(Json::encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claims = $b64(Json::encode([
            'iss' => $account['client_email'],
            'scope' => self::SCOPE,
            'aud' => $account['token_uri'] ?? 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));
        $signature = '';
        $key = openssl_pkey_get_private($account['private_key']);
        if ($key === false || !openssl_sign($header . '.' . $claims, $signature, $key, OPENSSL_ALGO_SHA256)) {
            Yii::warning('FCM: could not sign the JWT with the service-account key.', __METHOD__);
            return null;
        }
        $jwt = $header . '.' . $claims . '.' . $b64($signature);

        $ch = curl_init($account['token_uri'] ?? 'https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]),
        ]);
        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        $response = is_string($raw) ? json_decode($raw, true) : null;
        $token = is_array($response) ? (string)($response['access_token'] ?? '') : '';
        if ($token === '') {
            Yii::warning(sprintf('FCM OAuth token request failed: HTTP %d %s %s', $status, $error, is_array($response) ? ($response['error'] ?? '') : ''), __METHOD__);
            return null;
        }
        if ($cache) {
            $ttl = max(60, (int)($response['expires_in'] ?? 3600) - 600);
            $cache->set(self::TOKEN_CACHE_KEY, $token, $ttl);
        }
        return $token;
    }

    /** @return array{0: int, 1: array, 2: string} [HTTP status, decoded JSON body, cURL error] */
    private static function post(string $url, array $body, array $headers): array
    {
        if (!function_exists('curl_init')) {
            return [0, [], 'cURL is unavailable on the server.'];
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
            CURLOPT_POSTFIELDS => Json::encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);
        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        return [$status, is_array($decoded) ? $decoded : [], $error];
    }

    private static function fail(string $reason): array
    {
        Yii::warning('FCM: ' . $reason, __METHOD__);
        return ['ok' => false, 'error' => $reason];
    }
}
