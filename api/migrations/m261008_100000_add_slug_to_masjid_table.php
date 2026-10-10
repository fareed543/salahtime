<?php

use app\components\MasjidSlug;
use app\models\Masjid;
use yii\db\Migration;

/**
 * Public SEO-friendly masjid URLs: /masjid/<city_slug>/<slug>.
 * Existing masjids get their slugs here; new ones on save (see app\components\MasjidSlug).
 */
class m261008_100000_add_slug_to_masjid_table extends Migration
{
    public function safeUp()
    {
        $this->addColumn('{{%masjid}}', 'city_slug', $this->string(160)->null()->after('madhab'));
        $this->addColumn('{{%masjid}}', 'slug', $this->string(160)->null()->after('city_slug'));
        $this->createIndex('idx-masjid-city-slug-slug', '{{%masjid}}', ['city_slug', 'slug'], true);

        Yii::$app->db->schema->refreshTableSchema('{{%masjid}}');
        foreach (Masjid::find()->orderBy(['id' => SORT_ASC])->each() as $masjid) {
            MasjidSlug::ensure($masjid);
        }
    }

    public function safeDown()
    {
        $this->dropIndex('idx-masjid-city-slug-slug', '{{%masjid}}');
        $this->dropColumn('{{%masjid}}', 'slug');
        $this->dropColumn('{{%masjid}}', 'city_slug');
    }
}
