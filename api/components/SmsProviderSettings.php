<?php

namespace app\components;

use Yii;

/**
 * "SMS Provider" section of the back-office settings: who delivers mobile OTPs and with which credentials.
 * Until an admin saves the section, the .env values (SMS_PROVIDER, TWO_FACTOR_API_KEY) are used.
 */
class SmsProviderSettings
{
    public const PROVIDERS = [
        '2factor' => '2Factor.in',
        'log' => 'Log only (testing, no SMS is sent)',
        'none' => 'Disabled',
    ];

    public static function defaults(): array
    {
        $provider = (string)(Yii::$app->params['smsProvider'] ?? '');
        return [
            'provider' => isset(self::PROVIDERS[$provider]) ? $provider : 'none',
            'apiKey' => (string)(Yii::$app->params['twoFactorApiKey'] ?? ''),
            'otpTemplate' => '',
        ];
    }

    public static function get(): array
    {
        $stored = AppSettings::section('smsProvider');
        return $stored === null ? self::defaults() : self::normalize($stored);
    }

    /**
     * A blank apiKey keeps the key already in use, so the secret never has to round-trip through the browser.
     */
    public static function normalize(array $values, ?array $current = null): array
    {
        $provider = (string)($values['provider'] ?? 'none');
        $apiKey = trim((string)($values['apiKey'] ?? ''));
        if ($apiKey === '') {
            // Keep the saved key, or the .env key when the section has never been saved.
            $apiKey = (string)(($current ?? self::defaults())['apiKey'] ?? '');
        }

        return [
            'provider' => isset(self::PROVIDERS[$provider]) ? $provider : 'none',
            'apiKey' => $apiKey,
            'otpTemplate' => trim((string)($values['otpTemplate'] ?? '')),
        ];
    }

    public static function validate(array $values): ?string
    {
        if ($values['provider'] === '2factor' && $values['apiKey'] === '') {
            return 'Enter the 2Factor API key.';
        }
        if ($values['apiKey'] !== '' && !preg_match('/^[A-Za-z0-9-]{8,100}$/', $values['apiKey'])) {
            return 'The API key may only contain letters, numbers and hyphens.';
        }
        if ($values['otpTemplate'] !== '' && !preg_match('/^[A-Za-z0-9 _-]{1,60}$/', $values['otpTemplate'])) {
            return 'The OTP template name may only contain letters, numbers, spaces, hyphens and underscores.';
        }
        if ($values['provider'] !== '2factor' && $values['provider'] !== 'log' && AuthChannelSettings::get()['channel'] === 'mobile') {
            return 'Mobile is the active OTP channel. Switch Login & OTP Channels to Email before disabling SMS.';
        }
        return null;
    }

    /**
     * Back-office payload: the API key itself is never returned, only whether one is set and its last 4 characters.
     */
    public static function describe(array $values): array
    {
        $key = $values['apiKey'];
        return [
            'values' => [
                'provider' => $values['provider'],
                'apiKey' => '',
                'otpTemplate' => $values['otpTemplate'],
            ],
            'meta' => [
                'providers' => self::PROVIDERS,
                'apiKeySet' => $key !== '',
                'apiKeyHint' => $key !== '' ? substr($key, -4) : '',
            ],
        ];
    }

    public static function isConfigured(): bool
    {
        $settings = self::get();
        return $settings['provider'] === 'log'
            || ($settings['provider'] === '2factor' && $settings['apiKey'] !== '');
    }
}
