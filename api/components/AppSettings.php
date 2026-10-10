<?php

namespace app\components;

use app\models\Customer;
use Yii;
use yii\helpers\Json;

/**
 * Back-office "General Settings", stored in bt_app_setting (one row per section, values as JSON),
 * so values change at runtime without a build or deploy.
 *
 * To add a section: create a class like SmsProviderSettings (defaults/get/normalize/validate/describe),
 * register it in SECTIONS, and add its card to backoffice/src/app/settings.
 */
class AppSettings
{
    /** section key => settings class */
    public const SECTIONS = [
        'authChannels' => AuthChannelSettings::class,
        'smsProvider' => SmsProviderSettings::class,
    ];

    /** @var array|null section => row, cached for the request */
    private static $rows;

    /**
     * @return array|null the stored values of one section, or null when never saved
     */
    public static function section(string $key): ?array
    {
        $row = self::rows()[$key] ?? null;
        if ($row === null) {
            return null;
        }
        try {
            $values = Json::decode((string)$row['settings'], true);
        } catch (\Throwable $e) {
            Yii::error("Unreadable app setting {$key}: " . $e->getMessage(), __METHOD__);
            return null;
        }
        return is_array($values) ? $values : null;
    }

    /**
     * Every section with its effective values plus who saved it last, for the back office.
     */
    public static function all(): array
    {
        $rows = self::rows();
        $sections = [];
        foreach (self::SECTIONS as $key => $class) {
            $row = $rows[$key] ?? null;
            $sections[$key] = $class::describe($class::get()) + [
                'updatedAt' => $row ? gmdate(DATE_ATOM, strtotime((string)$row['updated_at'])) : null,
                'updatedBy' => $row && $row['updated_by_name'] !== null
                    ? ['id' => (int)$row['updated_by'], 'name' => (string)$row['updated_by_name']]
                    : null,
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
        if (!self::tableExists()) {
            return [null, 'Settings table is missing. Run the database migration (bt_app_setting) first.'];
        }

        $normalized = $class::normalize($values, self::section($key));
        $error = $class::validate($normalized);
        if ($error !== null) {
            return [null, $error];
        }

        $db = Yii::$app->db;
        $data = [
            'settings' => Json::encode($normalized, JSON_UNESCAPED_SLASHES),
            'updated_by' => (int)$admin->id,
            'updated_by_name' => trim(($admin->firstname ?? '') . ' ' . ($admin->lastname ?? '')),
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        $exists = (new \yii\db\Query())->from('{{%app_setting}}')->where(['section' => $key])->exists($db);
        if ($exists) {
            $db->createCommand()->update('{{%app_setting}}', $data, ['section' => $key])->execute();
        } else {
            $db->createCommand()->insert('{{%app_setting}}', $data + ['section' => $key])->execute();
        }

        self::$rows = null;
        return [self::all()[$key], null];
    }

    private static function rows(): array
    {
        if (self::$rows !== null) {
            return self::$rows;
        }
        self::$rows = [];
        if (!self::tableExists()) {
            return self::$rows;
        }
        foreach ((new \yii\db\Query())->from('{{%app_setting}}')->all() as $row) {
            self::$rows[$row['section']] = $row;
        }
        return self::$rows;
    }

    private static function tableExists(): bool
    {
        // Until the migration runs, every section falls back to its .env/params defaults.
        return Yii::$app->db->getTableSchema('{{%app_setting}}') !== null;
    }
}
