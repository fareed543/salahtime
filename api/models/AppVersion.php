<?php

namespace app\models;

use Yii;

class AppVersion extends \yii\db\ActiveRecord
{
    public static function tableName()
    {
        return 'bt_app_version';
    }

    public function rules()
    {
        return [
            [['version'], 'required'],
            [['version_code'], 'integer'],
            [['mandatory', 'is_active'], 'boolean'],
            [['message', 'features_json', 'bug_fixes_json'], 'string'],
            [['release_date', 'created_at', 'updated_at'], 'safe'],
            [['version'], 'string', 'max' => 50],
            [['title'], 'string', 'max' => 255],
            [['apk_url', 'update_url', 'play_store_url'], 'string', 'max' => 500],
        ];
    }

    public function fields()
    {
        return [
            'version',
            'versionCode' => fn () => $this->version_code,
            'mandatory',
            'title',
            'message',
            'features' => fn () => $this->decodeJsonList($this->features_json),
            'bugFixes' => fn () => $this->decodeJsonList($this->bug_fixes_json),
            'apkUrl' => fn () => $this->apk_url,
            'updateUrl' => fn () => $this->update_url,
            'playStoreUrl' => fn () => $this->play_store_url,
            'releaseDate' => fn () => $this->release_date,
        ];
    }

    private function decodeJsonList(?string $value): array
    {
        if (!$value) {
            return [];
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? array_values($decoded) : [];
    }
}
