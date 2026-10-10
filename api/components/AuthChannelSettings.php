<?php

namespace app\components;

use Yii;

/**
 * "Login & OTP Channels" section of the back-office settings: which channels (email / mobile SMS)
 * registration and password recovery use. Until an admin saves the section,
 * the env-driven passwordRecoveryMethods param decides.
 */
class AuthChannelSettings
{
    public static function defaults(): array
    {
        $methods = Yii::$app->params['passwordRecoveryMethods'] ?? ['email'];
        return [
            'email' => in_array('email', $methods, true),
            'mobile' => in_array('mobile', $methods, true),
        ];
    }

    /**
     * Effective values: saved section over defaults, never both channels off.
     */
    public static function get(): array
    {
        $settings = self::normalize(AppSettings::section('authChannels') ?? self::defaults());
        if (!$settings['email'] && !$settings['mobile']) {
            $settings['email'] = true;
        }
        return $settings;
    }

    public static function normalize(array $values): array
    {
        return [
            'email' => filter_var($values['email'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'mobile' => filter_var($values['mobile'] ?? false, FILTER_VALIDATE_BOOLEAN),
        ];
    }

    public static function validate(array $values): ?string
    {
        if (!$values['email'] && !$values['mobile']) {
            return 'Keep at least one of Email or Mobile active.';
        }
        if ($values['mobile'] && !self::mobileConfigured()) {
            return 'SMS provider is not configured on the server, so Mobile cannot be activated.';
        }
        return null;
    }

    /**
     * Section payload for the back office: values plus read-only server facts.
     */
    public static function describe(array $values): array
    {
        return [
            'values' => $values,
            'meta' => ['mobileConfigured' => self::mobileConfigured()],
        ];
    }

    /**
     * @return string[] enabled channels, email first
     */
    public static function enabledMethods(): array
    {
        $settings = self::get();
        return array_values(array_filter(['email', 'mobile'], function ($method) use ($settings) {
            return $settings[$method];
        }));
    }

    public static function isEnabled(string $method): bool
    {
        return in_array($method, self::enabledMethods(), true);
    }

    public static function mobileConfigured(): bool
    {
        $provider = Yii::$app->params['smsProvider'] ?? 'log';
        return $provider === 'log'
            || ($provider === '2factor' && !empty(Yii::$app->params['twoFactorApiKey']));
    }
}
