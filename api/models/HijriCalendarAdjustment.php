<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property string $title
 * @property int|null $hijri_year
 * @property int|null $hijri_month
 * @property string|null $original_start_date
 * @property string|null $original_end_date
 * @property string|null $updated_start_date
 * @property string|null $updated_end_date
 * @property string $start_date
 * @property string $end_date
 * @property int $adjustment_days
 * @property string|null $notes
 * @property int $is_active
 * @property string|null $created_at
 * @property string|null $updated_at
 */
class HijriCalendarAdjustment extends ActiveRecord
{
    public static function tableName()
    {
        return 'bt_hijri_calendar_adjustment';
    }

    public function rules()
    {
        return [
            [['title', 'start_date', 'end_date'], 'required'],
            [['start_date', 'end_date', 'original_start_date', 'original_end_date', 'updated_start_date', 'updated_end_date', 'created_at', 'updated_at'], 'safe'],
            [['hijri_year'], 'integer', 'min' => 1300, 'max' => 1700],
            [['hijri_month'], 'integer', 'min' => 1, 'max' => 12],
            [['adjustment_days'], 'integer', 'min' => -5, 'max' => 5],
            [['notes'], 'string'],
            [['is_active'], 'boolean'],
            [['title'], 'string', 'max' => 255],
            ['end_date', 'compare', 'compareAttribute' => 'start_date', 'operator' => '>=', 'type' => 'date'],
            ['updated_end_date', 'compare', 'compareAttribute' => 'updated_start_date', 'operator' => '>=', 'type' => 'date'],
        ];
    }

    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'title' => 'Title',
            'hijri_year' => 'Hijri Year',
            'hijri_month' => 'Hijri Month',
            'original_start_date' => 'Original Start Date',
            'original_end_date' => 'Original End Date',
            'updated_start_date' => 'Updated Start Date',
            'updated_end_date' => 'Updated End Date',
            'start_date' => 'Start Date',
            'end_date' => 'End Date',
            'adjustment_days' => 'Adjustment Days',
            'notes' => 'Notes',
            'is_active' => 'Active',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
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
