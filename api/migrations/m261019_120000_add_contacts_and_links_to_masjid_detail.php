<?php

use yii\db\Migration;

/**
 * ST-00013: a masjid's WhatsApp group, Google Maps link and its Imam's and Muazzin's contacts.
 * The phones are shown to signed-in app users only.
 */
class m261019_120000_add_contacts_and_links_to_masjid_detail extends Migration
{
    private const COLUMNS = [
        'whatsapp_group_url' => 500,
        'map_url' => 500,
        'imam_name' => 150,
        'imam_phone' => 30,
        'muazzin_name' => 150,
        'muazzin_phone' => 30,
    ];

    public function safeUp()
    {
        $table = '{{%masjid_detail}}';
        $schema = $this->db->getTableSchema($table, true);
        if ($schema === null) {
            return;
        }

        $after = 'contact';
        foreach (self::COLUMNS as $column => $length) {
            if (!isset($schema->columns[$column])) {
                $this->addColumn($table, $column, $this->string($length)->null()->after($after));
            }
            $after = $column;
        }
    }

    public function safeDown()
    {
        foreach (array_keys(self::COLUMNS) as $column) {
            $this->dropColumn('{{%masjid_detail}}', $column);
        }
    }
}
