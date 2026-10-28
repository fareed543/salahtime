<?php

namespace app\components;

use app\models\PushSubscription;
use Yii;
use yii\helpers\Json;

/**
 * Sends a push notification to one user's registered devices, through the same FCM endpoint
 * as AdminController::dispatchPublishedNotification. Never throws: a missing key or token,
 * or an FCM error, is only logged, because the push always accompanies something already saved.
 */
class PushSender
{
    public static function toCustomer(int $customerId, string $title, string $body, array $data = []): bool
    {
        $tokens = PushSubscription::find()
            ->select(['push_token'])
            ->where(['customer_id' => $customerId, 'notifications_enabled' => 1])
            ->andWhere(['not', ['push_token' => null]])
            ->andWhere(['<>', 'push_token', ''])
            ->column();
        $tokens = array_values(array_unique(array_filter(array_map('strval', $tokens))));
        $serverKey = (string)(Yii::$app->params['fcmServerKey'] ?? '');

        if (!$tokens || $serverKey === '' || !function_exists('curl_init')) {
            Yii::info(sprintf('Push to customer %d skipped (%d tokens, key %s).', $customerId, count($tokens), $serverKey === '' ? 'missing' : 'set'), __METHOD__);
            return false;
        }

        $ch = curl_init('https://fcm.googleapis.com/fcm/send');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: key=' . $serverKey,
                'Content-Type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_POSTFIELDS => Json::encode([
                'registration_ids' => $tokens,
                'notification' => ['title' => $title, 'body' => $body, 'sound' => 'default'],
                'data' => array_map('strval', $data),
                'priority' => 'high',
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);
        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false || $httpCode < 200 || $httpCode >= 300) {
            Yii::warning(sprintf('Push to customer %d failed: HTTP %d %s', $customerId, $httpCode, $error), __METHOD__);
            return false;
        }
        return true;
    }
}
