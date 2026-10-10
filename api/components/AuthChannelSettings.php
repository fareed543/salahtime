<?php

namespace app\components;

use Yii;

/**
 * "Login & OTP Channels" section of the back-office settings: the single channel (email or mobile SMS)
 * that registration and password recovery use. Until an admin saves the section,
 * the env-driven passwordRecoveryMethods param decides.
 */
class AuthChannelSettings
{
    public const CHANNELS = ['email', 'mobile'];

    public static function defaults(): array
    {
        $methods = Yii::$app->params['passwordRecoveryMethods'] ?? ['email'];
        return ['channel' => in_array('email', $methods, true) ? 'email' : 'mobile'];
    }

    public static function get(): array
    {
        return self::normalize(AppSettings::section('authChannels') ?? self::defaults());
    }

    public static function normalize(array $values, ?array $current = null): array
    {
        $channel = $values['channel'] ?? null;
        if (!in_array($channel, self::CHANNELS, true)) {
            // Rows saved by the earlier two-switch version ({email, mobile}): email wins.
            $channel = !empty($values['email']) || empty($values['mobile']) ? 'email' : 'mobile';
        }
        return ['channel' => $channel];
    }

    public static function validate(array $values): ?string
    {
        if ($values['channel'] === 'mobile' && !SmsProviderSettings::isConfigured()) {
            return 'Configure the SMS Provider section first, then switch the channel to Mobile.';
        }
        return null;
    }

    public static function describe(array $values): array
    {
        return [
            'values' => $values,
            'meta' => ['mobileConfigured' => SmsProviderSettings::isConfigured()],
        ];
    }

    /**
     * @return string[] the active channel (a list for API compatibility with older app builds)
     */
    public static function enabledMethods(): array
    {
        return [self::get()['channel']];
    }

    public static function isEnabled(string $method): bool
    {
        return self::get()['channel'] === $method;
    }

    public static function mobileConfigured(): bool
    {
        return SmsProviderSettings::isConfigured();
    }
}
