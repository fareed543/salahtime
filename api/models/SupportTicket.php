<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * An issue reported through "Report an Issue" (Support Desk).
 *
 * @property int $id
 * @property string|null $reference   ST-00042, set after the first save
 * @property string $category
 * @property string $message
 * @property string|null $name
 * @property string|null $email
 * @property int|null $customer_id
 * @property string|null $page_url
 * @property string|null $platform
 * @property string|null $app_version
 * @property string|null $language
 * @property string|null $location
 * @property string|null $context      JSON with app settings at the time of the report
 * @property string|null $user_agent
 * @property string|null $ip_address
 * @property string $status
 * @property string|null $admin_note
 * @property int|null $handled_by
 * @property string|null $resolved_at
 * @property string $created_at
 * @property string $updated_at
 */
class SupportTicket extends ActiveRecord
{
    public const CATEGORIES = [
        'prayer_time' => 'Wrong prayer time',
        'notification' => 'Azan / notification problem',
        'qibla' => 'Qibla direction',
        'masjid' => 'Masjid details',
        'app_problem' => 'App problem or crash',
        'suggestion' => 'Suggestion',
        'other' => 'Other',
    ];

    public const STATUSES = [
        'new' => 'New',
        'in_progress' => 'In progress',
        'resolved' => 'Resolved',
        'closed' => 'Closed',
    ];

    public const PLATFORMS = ['web', 'android', 'ios'];

    public static function tableName()
    {
        return '{{%support_ticket}}';
    }

    public function rules()
    {
        return [
            [['category', 'message'], 'required'],
            [['category', 'message', 'name', 'email', 'page_url', 'platform', 'app_version', 'language', 'location', 'admin_note'], 'trim', 'skipOnEmpty' => true],
            ['category', 'in', 'range' => array_keys(self::CATEGORIES)],
            ['status', 'in', 'range' => array_keys(self::STATUSES)],
            ['platform', 'in', 'range' => self::PLATFORMS],
            ['message', 'string', 'min' => 10, 'max' => 3000],
            ['name', 'string', 'max' => 120],
            ['email', 'email'],
            ['email', 'string', 'max' => 190],
            ['page_url', 'string', 'max' => 500],
            ['app_version', 'string', 'max' => 30],
            ['language', 'string', 'max' => 10],
            ['location', 'string', 'max' => 190],
            ['admin_note', 'string', 'max' => 5000],
            [['customer_id', 'handled_by'], 'integer'],
        ];
    }

    public static function formatReference(int $id): string
    {
        return 'ST-' . str_pad((string)$id, 5, '0', STR_PAD_LEFT);
    }

    public function getCategoryLabel(): string
    {
        return self::CATEGORIES[$this->category] ?? $this->category;
    }

    public function getStatusLabel(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /** Settings captured with the report (calculation method, madhab, offsets...), as an array. */
    public function getContextData(): array
    {
        $data = json_decode((string)$this->context, true);
        return is_array($data) ? $data : [];
    }
}
