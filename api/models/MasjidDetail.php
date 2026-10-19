<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * @property string|null $whatsapp_group_url
 * @property string|null $map_url
 * @property string|null $imam_name
 * @property string|null $imam_phone
 * @property string|null $muazzin_name
 * @property string|null $muazzin_phone
 */
class MasjidDetail extends ActiveRecord
{
    /** API field => column for the ST-00013 contacts and links. */
    public const CONTACT_FIELDS = [
        'whatsappGroupUrl' => 'whatsapp_group_url',
        'mapUrl' => 'map_url',
        'imamName' => 'imam_name',
        'imamPhone' => 'imam_phone',
        'muazzinName' => 'muazzin_name',
        'muazzinPhone' => 'muazzin_phone',
    ];

    /** WhatsApp group invites and click-to-chat links only. */
    public const WHATSAPP_PATTERN = '~^https://(chat\.whatsapp\.com|wa\.me|(www\.)?whatsapp\.com)/\S+$~i';
    /** Google Maps share/place links only, so the field cannot carry other links. */
    public const MAP_PATTERN = '~^https://((www\.)?google\.[a-z.]{2,6}/maps|maps\.google\.[a-z.]{2,6}|maps\.app\.goo\.gl|goo\.gl/maps)(/|\?)\S*$~i';
    public const PHONE_PATTERN = '~^\+?[0-9][0-9 ()\-]{5,24}$~';

    public static function tableName()
    {
        return '{{%masjid_detail}}';
    }

    public function rules()
    {
        return [
            [['id_masjid'], 'required'],
            [['id_masjid'], 'integer'],
            [['location'], 'string'],
            [['qr_approved', 'stay_nearby', 'ladies_jamat', 'ladies_ramzan_access', 'wazu_khana', 'toilet', 'gusl_khana', 'air_conditioners', 'chairs'], 'boolean'],
            [['email', 'qr_approved_by'], 'string', 'max' => 255],
            [['contact'], 'string', 'max' => 100],
            [['temperature'], 'string', 'max' => 20],
            [['qr_code_url'], 'string', 'max' => 500],
            [['whatsapp_group_url', 'map_url'], 'string', 'max' => 500],
            [['imam_name', 'muazzin_name'], 'string', 'max' => 150],
            [['imam_phone', 'muazzin_phone'], 'string', 'max' => 30],
            ['whatsapp_group_url', 'match', 'pattern' => self::WHATSAPP_PATTERN,
                'message' => 'Enter a WhatsApp group link, e.g. https://chat.whatsapp.com/…'],
            ['map_url', 'match', 'pattern' => self::MAP_PATTERN,
                'message' => 'Enter a Google Maps link, e.g. https://maps.app.goo.gl/…'],
            [['imam_phone', 'muazzin_phone'], 'match', 'pattern' => self::PHONE_PATTERN,
                'message' => '{attribute} must be a phone number (digits, spaces, + or -).'],
        ];
    }

    public function attributeLabels()
    {
        return [
            'whatsapp_group_url' => 'WhatsApp group link',
            'map_url' => 'Google Maps link',
            'imam_name' => 'Imam name',
            'imam_phone' => 'Imam phone',
            'muazzin_name' => 'Muazzin name',
            'muazzin_phone' => 'Muazzin phone',
        ];
    }

    /**
     * Copies the contacts and links present in $data (trimmed, empty -> null). Fields an older app
     * version does not send are left as they are, so its saves do not wipe them.
     */
    public function applyContactFields(array $data): void
    {
        foreach (self::CONTACT_FIELDS as $field => $column) {
            if (array_key_exists($field, $data)) {
                $value = trim((string)($data[$field] ?? ''));
                $this->$column = $value === '' ? null : $value;
            }
        }
    }

    /** First validation error of the contacts and links, or null when they are fine. */
    public function contactFieldsError(): ?string
    {
        $this->validate(array_values(self::CONTACT_FIELDS));
        foreach (self::CONTACT_FIELDS as $column) {
            if ($this->hasErrors($column)) {
                return $this->getFirstError($column);
            }
        }
        return null;
    }

    /** Contacts and links for API responses. Phones only when $includePhones (signed-in viewers). */
    public static function contactPayload(?self $detail, bool $includePhones): array
    {
        return [
            'whatsappGroupUrl' => $detail->whatsapp_group_url ?? null,
            'mapUrl' => $detail->map_url ?? null,
            'imamName' => $detail->imam_name ?? null,
            'imamPhone' => $includePhones ? ($detail->imam_phone ?? null) : null,
            'muazzinName' => $detail->muazzin_name ?? null,
            'muazzinPhone' => $includePhones ? ($detail->muazzin_phone ?? null) : null,
            // Lets the app say "sign in to see the phone numbers" without revealing them.
            'hasHiddenPhones' => !$includePhones && $detail && ($detail->imam_phone || $detail->muazzin_phone),
        ];
    }
}
