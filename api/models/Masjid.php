<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_masjid".
 *
 * @property int $id
 * @property string $name
 * @property string|null $address
 * @property string|null $area
 * @property string|null $city
 * @property string|null $state
 * @property string|null $pincode
 * @property string|null $country
 * @property float|null $latitude Map position, for the "near me" distance filter
 * @property float|null $longitude
 * @property string|null $madhab hanafi | shafi
 * @property string|null $display_colors Owner-set display screen colours, JSON {"bg","card","accent"} of #rrggbb
 * @property string|null $city_slug Public URL: /masjid/<city_slug>/<slug>
 * @property string|null $slug
 * @property int $status 1=Active (approved), 0=Inactive, 2=Waiting for approval
 * @property int|null $id_customer
 * @property int|null $id_halqa
 * @property string $created_at
 * @property string $updated_at
 */
class Masjid extends \yii\db\ActiveRecord
{
    public const STATUS_INACTIVE = 0;
    public const STATUS_ACTIVE = 1;
    /** Submitted from the app; hidden from others until approved in the back office. */
    public const STATUS_PENDING = 2;

    public const MADHABS = ['hanafi', 'shafi'];

    /** Keys of the display colours JSON, in the order the edit form shows them. */
    public const DISPLAY_COLOR_KEYS = ['bg', 'card', 'accent'];

    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_masjid';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['name'], 'required'],
            [['address', 'area', 'city', 'state', 'pincode', 'country'], 'string'],
            [['status', 'id_customer', 'id_halqa'], 'integer'],
            [['created_at', 'updated_at'], 'safe'],
            [['name'], 'string', 'max' => 255],
            [['madhab'], 'in', 'range' => self::MADHABS],
            [['latitude'], 'number', 'min' => -90, 'max' => 90],
            [['longitude'], 'number', 'min' => -180, 'max' => 180],
            [['city_slug', 'slug'], 'string', 'max' => 160],
            [['display_colors'], 'string', 'max' => 64],
        ];
    }

    /**
     * Turns the app's display colours into the stored JSON. Null/empty clears them (back to the
     * built-in themes); false means the value is not three #rrggbb colours.
     *
     * @param mixed $value array {"bg","card","accent"} or its JSON
     * @return string|null|false
     */
    public static function normalizeDisplayColors($value)
    {
        if (is_string($value)) {
            $value = trim($value) === '' ? null : json_decode($value, true);
        }
        if ($value === null || $value === []) {
            return null;
        }
        if (!is_array($value)) {
            return false;
        }

        $colors = [];
        foreach (self::DISPLAY_COLOR_KEYS as $key) {
            $color = strtolower(trim((string)($value[$key] ?? '')));
            if (!preg_match('/^#[0-9a-f]{6}$/', $color)) {
                return false;
            }
            $colors[$key] = $color;
        }
        return json_encode($colors);
    }

    /** The saved display colours, or null when the masjid uses the built-in themes. */
    public function getDisplayColorsArray(): ?array
    {
        // Until database/2026-10-27_masjid_display_colors.sql runs, the column does not exist.
        if (!$this->hasAttribute('display_colors')) {
            return null;
        }
        $colors = $this->display_colors ? json_decode($this->display_colors, true) : null;
        return is_array($colors) ? $colors : null;
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'name' => 'Name',
            'address' => 'Address',
            'area' => 'Area',
            'city' => 'City',
            'state' => 'State',
            'pincode' => 'Pincode',
            'country' => 'Country',
            'madhab' => 'Madhab',
            'display_colors' => 'Display Colours',
            'latitude' => 'Latitude',
            'longitude' => 'Longitude',
            'status' => 'Status',
            'id_customer' => 'Id Customer',
            'id_halqa' => 'Id Halqa',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }
}
