<?php

use yii\db\Migration;

/**
 * Map position of each masjid, so the app can list only the masjids near the user.
 * Existing masjids stay without one until their owner pins it from the edit form.
 */
class m261012_100000_add_coordinates_to_masjid_table extends Migration
{
    public function safeUp()
    {
        $this->addColumn('{{%masjid}}', 'latitude', $this->decimal(10, 7)->null()->after('country'));
        $this->addColumn('{{%masjid}}', 'longitude', $this->decimal(10, 7)->null()->after('latitude'));
        $this->createIndex('idx-masjid-latitude-longitude', '{{%masjid}}', ['latitude', 'longitude']);
    }

    public function safeDown()
    {
        $this->dropIndex('idx-masjid-latitude-longitude', '{{%masjid}}');
        $this->dropColumn('{{%masjid}}', 'longitude');
        $this->dropColumn('{{%masjid}}', 'latitude');
    }
}
