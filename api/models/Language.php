<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * App languages, managed in the back office. The app offers the enabled ones it has a translation for.
 *
 * @property int $id_language
 * @property string $name
 * @property string|null $native_name
 * @property string $code e.g. "en", "hi-latn"
 * @property int $is_rtl 1 = right-to-left (Arabic, Urdu)
 * @property int $status 1 = enabled, 0 = disabled
 * @property int $sort_order
 */
class Language extends ActiveRecord
{
    /** Always enabled: the app falls back to it for any missing text. */
    public const FALLBACK_CODE = 'en';

    /**
     * Codes the app ships a translation file for (frontend/src/assets/i18n/<code>.json). A language
     * added here in the back office only shows in the app once its translation file is released.
     */
    public const APP_TRANSLATIONS = ['en', 'hi', 'hi-latn', 'te', 'te-latn', 'ta', 'ar', 'ur', 'fr', 'tr', 'id', 'ms', 'es'];

    public static function tableName()
    {
        return '{{%language}}';
    }

    public static function primaryKey()
    {
        return ['id_language'];
    }

    public function rules()
    {
        return [
            [['id_language', 'sort_order', 'status'], 'integer'],
            [['is_rtl'], 'boolean'],
            [['name', 'code'], 'required'],
            [['created_at', 'updated_at'], 'safe'],
            [['name', 'native_name'], 'string', 'max' => 191],
            [['code'], 'string', 'max' => 10],
            [['code'], 'unique'],
        ];
    }
}
