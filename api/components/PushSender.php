<?php

namespace app\components;

use app\models\PushSubscription;
use Yii;

/**
 * Sends a push notification to one user's registered devices (FCM HTTP v1, see FcmClient).
 * Never throws: a missing configuration or token, or an FCM error, is only logged, because the
 * push always accompanies something already saved. Tokens FCM reports as gone are deleted.
 */
class PushSender
{
    /** @return array{sent: int, failed: int, removed: int, reason?: string} */
    public static function toCustomerResult(int $customerId, string $title, string $body, array $data = []): array
    {
        $subscriptions = PushSubscription::find()
            ->where(['customer_id' => $customerId, 'notifications_enabled' => 1])
            ->andWhere(['not', ['push_token' => null]])
            ->andWhere(['<>', 'push_token', ''])
            ->all();
        if (!$subscriptions) {
            Yii::info(sprintf('Push to customer %d skipped: no device tokens.', $customerId), __METHOD__);
            return ['sent' => 0, 'failed' => 0, 'removed' => 0, 'reason' => 'No devices with notifications on for this account.'];
        }
        if (!FcmClient::isConfigured()) {
            return ['sent' => 0, 'failed' => 0, 'removed' => 0, 'reason' => 'Firebase is not configured on this server.'];
        }

        $result = ['sent' => 0, 'failed' => 0, 'removed' => 0];
        $seen = [];
        foreach ($subscriptions as $subscription) {
            $token = (string)$subscription->push_token;
            if (isset($seen[$token])) {
                continue;
            }
            $seen[$token] = true;
            $send = FcmClient::send(['token' => $token], $title, $body, $data);
            if ($send['ok']) {
                $result['sent']++;
            } elseif (!empty($send['unregistered'])) {
                // The app was uninstalled or the token expired.
                $subscription->updateAttributes(['push_token' => null, 'notifications_enabled' => 0]);
                $result['removed']++;
            } else {
                $result['failed']++;
                $result['reason'] = $send['error'] ?? 'Unknown error';
            }
        }
        return $result;
    }

    public static function toCustomer(int $customerId, string $title, string $body, array $data = []): bool
    {
        return self::toCustomerResult($customerId, $title, $body, $data)['sent'] > 0;
    }
}
