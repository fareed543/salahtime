<?php

use yii\db\Migration;

class m260607_136000_add_id_program_to_subscriber_packets extends Migration
{
    public function safeUp()
    {
        $schema = $this->db->getTableSchema('{{%subscriber_packets}}', true);

        if ($schema !== null && !isset($schema->columns['id_program'])) {
            $this->addColumn('{{%subscriber_packets}}', 'id_program', $this->integer()->notNull()->after('id'));
        }
    }

    public function safeDown()
    {
        $schema = $this->db->getTableSchema('{{%subscriber_packets}}', true);

        if ($schema !== null && isset($schema->columns['id_program'])) {
            $this->dropColumn('{{%subscriber_packets}}', 'id_program');
        }
    }
}
