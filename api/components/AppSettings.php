<?php

namespace app\components;

use app\models\Customer;
use Yii;
use yii\helpers\Json;

/**
 * Back-office "General Settings", stored as one JSON document keyed by section
 * (e.g. "authChannels") so no migration is needed when a section is added.
 *
 * To add a section: give it defaults/normalisation in a small class like AuthChannelSettings,
 * register it in SECTIONS, and add its card to backoffice/src/app/settings.
 */
class AppSettings
{
    private const STORAGE_PATH = '@app/data/app-settings.json';

    /** section key => class with defaults(), normalize(array), validate(array) and describe(array) */
    public const SECTIONS = [
        'authChannels' => AuthChannelSettings::class,
    ];

    /**
     * @return array|null the stored values of one section, or null when never saved
     */
    public static function section(string $key): ?array
    {
        $stored = self::readAll();
        return isset($stored[$key]['values']) && is_array($stored[$key]['values']) ? $stored[$key]['values'] : null;
    }

    /**
     * Every section with its effective values plus who saved it last, for the back office.
     */
    public static function all(): array
    {
        $stored = self::readAll();
        $sections = [];
        foreach (self::SECTIONS as $key => $class) {
            $sections[$key] = $class::describe($class::get()) + [
                'updatedAt' => $stored[$key]['updatedAt'] ?? null,
                'updatedBy' => $stored[$key]['updatedBy'] ?? null,
            ];
        }
        return $sections;
    }

    /**
     * @return array{0: array|null, 1: string|null} [saved section, error message]
     */
    public static function saveSection(string $key, array $values, Customer $admin): array
    {
        $class = self::SECTIONS[$key] ?? null;
        if ($class === null) {
            return [null, 'Unknown settings section.'];
        }

        $normalized = $class::normalize($values);
        $error = $class::validate($normalized);
        if ($error !== null) {
            return [null, $error];
        }

        $stored = self::readAll();
        $stored[$key] = [
            'values' => $normalized,
            'updatedAt' => gmdate(DATE_ATOM),
            'updatedBy' => [
                'id' => (int)$admin->id,
                'name' => trim(($admin->firstname ?? '') . ' ' . ($admin->lastname ?? '')),
            ],
        ];

        $path = Yii::getAlias(self::STORAGE_PATH);
        if (!is_dir(dirname($path))) {
            mkdir(dirname($path), 0775, true);
        }
        file_put_contents($path, Json::encode($stored, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

        return [self::all()[$key], null];
    }

    private static function readAll(): array
    {
        $path = Yii::getAlias(self::STORAGE_PATH);
        if (!file_exists($path)) {
            return [];
        }
        try {
            $decoded = Json::decode((string)file_get_contents($path), true);
        } catch (\Throwable $e) {
            Yii::error('Unreadable ' . self::STORAGE_PATH . ': ' . $e->getMessage(), __METHOD__);
            return [];
        }
        return is_array($decoded) ? $decoded : [];
    }
}
