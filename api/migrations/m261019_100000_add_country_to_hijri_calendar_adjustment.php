<?php

use yii\db\Migration;
use yii\db\Query;

/**
 * Hijri months start on each country's own moon sighting (India is often a day behind Saudi Arabia),
 * so an adjustment now belongs to one country and the app applies only its own country's.
 * Adjustments entered before this followed India's sighting, so they become India's.
 */
class m261019_100000_add_country_to_hijri_calendar_adjustment extends Migration
{
    public function safeUp()
    {
        $table = '{{%hijri_calendar_adjustment}}';
        $schema = $this->db->getTableSchema($table, true);
        if ($schema === null || isset($schema->columns['country_id'])) {
            return;
        }

        $this->addColumn($table, 'country_id', $this->integer()->null()->after('title'));
        $this->createIndex('idx-hijri-calendar-adjustment-country', $table, 'country_id');

        $indiaId = (new Query())->select('id')->from('{{%countries}}')->where(['slug' => 'india'])->scalar($this->db);
        if ($indiaId) {
            $this->update($table, ['country_id' => (int)$indiaId], ['country_id' => null]);
        }
    }

    public function safeDown()
    {
        $this->dropIndex('idx-hijri-calendar-adjustment-country', '{{%hijri_calendar_adjustment}}');
        $this->dropColumn('{{%hijri_calendar_adjustment}}', 'country_id');
    }
}
