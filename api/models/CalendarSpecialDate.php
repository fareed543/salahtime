<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property string $title
 * @property string $event_date
 * @property string|null $description
 * @property string|null $category
 * @property int $is_active
 * @property int|null $sort_order
 * @property string|null $created_at
 * @property string|null $updated_at
 */
class CalendarSpecialDate extends ActiveRecord
{
    private static $categoryColumnExists;

    public static function tableName()
    {
        return 'bt_calendar_special_date';
    }

    public function rules()
    {
        $rules = [
            [['title', 'event_date'], 'required'],
            [['event_date', 'created_at', 'updated_at'], 'safe'],
            [['description'], 'string'],
            [['is_active'], 'boolean'],
            [['sort_order'], 'integer'],
            [['title'], 'string', 'max' => 255],
        ];

        if (self::hasCategoryColumn()) {
            $rules[] = [['category'], 'string', 'max' => 50];
        }

        return $rules;
    }

    public function attributeLabels()
    {
        $labels = [
            'id' => 'ID',
            'title' => 'Title',
            'event_date' => 'Event Date',
            'description' => 'Description',
            'is_active' => 'Active',
            'sort_order' => 'Sort Order',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];

        if (self::hasCategoryColumn()) {
            $labels['category'] = 'Category';
        }

        return $labels;
    }

    public static function hasCategoryColumn(): bool
    {
        if (self::$categoryColumnExists !== null) {
            return self::$categoryColumnExists;
        }

        $schema = static::getTableSchema();
        self::$categoryColumnExists = $schema !== null && isset($schema->columns['category']);

        return self::$categoryColumnExists;
    }

    public function beforeSave($insert)
    {
        if (!parent::beforeSave($insert)) {
            return false;
        }

        $now = date('Y-m-d H:i:s');
        if ($insert && empty($this->created_at)) {
            $this->created_at = $now;
        }
        $this->updated_at = $now;

        return true;
    }
}
