<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * A full snapshot of a masjid's salah timings at one point in time.
 *
 * @property int $id_masjid_timing_version
 * @property int $id_masjid
 * @property int $version_no
 * @property string $timings JSON array of {salah, azan, jamat}
 * @property string $source manual | capture | restore | admin | initial
 * @property string|null $image_url
 * @property int|null $restored_from
 * @property int|null $id_customer
 * @property string $created_at
 */
class MasjidTimingVersion extends ActiveRecord
{
    public const SOURCES = ['manual', 'capture', 'restore', 'admin', 'initial'];

    public static function tableName()
    {
        return '{{%masjid_timing_version}}';
    }

    public function rules()
    {
        return [
            [['id_masjid', 'version_no', 'timings', 'source'], 'required'],
            [['id_masjid', 'version_no', 'restored_from', 'id_customer'], 'integer'],
            [['timings'], 'string'],
            [['source'], 'in', 'range' => self::SOURCES],
            [['image_url'], 'string', 'max' => 500],
        ];
    }

    public function getTimingRows(): array
    {
        $decoded = json_decode((string)$this->timings, true);
        return is_array($decoded) ? $decoded : [];
    }
}
