<?php

use yii\db\Migration;
use yii\db\Query;

/**
 * Makes bt_language the source of the app's language list: adds the RTL flag and makes sure every
 * language the app ships a translation for has a row. Existing rows keep their status and order,
 * so a language the back office disabled stays disabled.
 */
class m261012_110000_add_rtl_and_app_languages extends Migration
{
    private const TABLE = '{{%language}}';

    /** code => [name, native name, rtl] — the translations bundled in the app (frontend/src/assets/i18n). */
    private const APP_LANGUAGES = [
        'en' => ['English', 'English', 0],
        'hi' => ['Hindi', 'हिन्दी', 0],
        'hi-latn' => ['Hindi (Roman)', 'Hinglish', 0],
        'te' => ['Telugu', 'తెలుగు', 0],
        'te-latn' => ['Telugu (Roman)', 'Tinglish', 0],
        'ta' => ['Tamil', 'தமிழ்', 0],
        'ar' => ['Arabic', 'العربية', 1],
        'ur' => ['Urdu', 'اردو', 1],
        'fr' => ['French', 'Français', 0],
        'tr' => ['Turkish', 'Türkçe', 0],
        'id' => ['Indonesian', 'Bahasa Indonesia', 0],
        'ms' => ['Malay', 'Bahasa Melayu', 0],
        'es' => ['Spanish', 'Español', 0],
    ];

    public function safeUp()
    {
        // Legacy tables have code varchar(2), too short for "hi-latn".
        $this->alterColumn(self::TABLE, 'code', $this->string(10)->notNull());
        if (!isset($this->db->getTableSchema(self::TABLE, true)->columns['is_rtl'])) {
            $this->addColumn(self::TABLE, 'is_rtl', $this->tinyInteger(1)->notNull()->defaultValue(0)->after('code'));
        }

        $now = date('Y-m-d H:i:s');
        $order = 0;
        foreach (self::APP_LANGUAGES as $code => [$name, $nativeName, $rtl]) {
            $order++;
            $existing = (new Query())->from(self::TABLE)->where(['code' => $code])->one($this->db);
            if ($existing) {
                $this->update(self::TABLE, [
                    'is_rtl' => $rtl,
                    'native_name' => ($existing['native_name'] ?? '') !== '' ? $existing['native_name'] : $nativeName,
                ], ['code' => $code]);
                continue;
            }

            // Older tables have no auto-increment on id_language.
            $nextId = (int)(new Query())->from(self::TABLE)->max('id_language', $this->db) + 1;
            $this->insert(self::TABLE, [
                'id_language' => $nextId,
                'name' => $name,
                'native_name' => $nativeName,
                'code' => $code,
                'is_rtl' => $rtl,
                'status' => 1,
                'sort_order' => $order,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function safeDown()
    {
        $this->dropColumn(self::TABLE, 'is_rtl');
    }
}
