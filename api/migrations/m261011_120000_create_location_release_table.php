<?php

use yii\db\Migration;

/**
 * Location releases: each back-office "Release" writes web/locations/locations-v<version>.json
 * (the city list the app downloads) and records it here.
 */
class m261011_120000_create_location_release_table extends Migration
{
    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%location_release}}', true) !== null) {
            return;
        }

        $this->createTable('{{%location_release}}', [
            'id' => $this->primaryKey(),
            'version' => $this->integer()->notNull(),
            'file_name' => $this->string(120)->notNull(),
            'checksum' => $this->char(64)->notNull(),
            'country_count' => $this->integer()->notNull(),
            'city_count' => $this->integer()->notNull(),
            'changes' => $this->text()->null(),
            'notes' => $this->string(500)->null(),
            'released_by' => $this->integer()->null(),
            'released_by_name' => $this->string(150)->null(),
            'released_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ], 'CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci ENGINE=InnoDB');

        $this->createIndex('idx-location-release-version', '{{%location_release}}', 'version', true);
    }

    public function safeDown()
    {
        $this->dropTable('{{%location_release}}');
    }
}
