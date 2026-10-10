<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * A masjid gallery photo. Stored pre-cropped to a fixed 16:9 frame plus a thumbnail,
 * so the slideshow never jumps between sizes.
 *
 * @property int $id_masjid_image
 * @property int $id_masjid
 * @property string $image_url
 * @property string $thumb_url
 * @property int $width
 * @property int $height
 * @property int $size_bytes
 * @property int $sort_order
 * @property int|null $id_customer
 * @property string $created_at
 */
class MasjidImage extends ActiveRecord
{
    public static function tableName()
    {
        return '{{%masjid_image}}';
    }

    public function rules()
    {
        return [
            [['id_masjid', 'image_url', 'thumb_url', 'width', 'height', 'size_bytes'], 'required'],
            [['id_masjid', 'width', 'height', 'size_bytes', 'sort_order', 'id_customer'], 'integer'],
            [['image_url', 'thumb_url'], 'string', 'max' => 500],
        ];
    }

    public function serialize(): array
    {
        return [
            'id' => (int)$this->id_masjid_image,
            'url' => $this->image_url,
            'thumbUrl' => $this->thumb_url,
            'width' => (int)$this->width,
            'height' => (int)$this->height,
            'sizeBytes' => (int)$this->size_bytes,
            'sortOrder' => (int)$this->sort_order,
        ];
    }
}
