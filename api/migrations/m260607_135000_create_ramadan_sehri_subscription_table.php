<?php

use yii\db\Migration;

class m260607_135000_create_ramadan_sehri_subscription_table extends Migration
{
    public function safeUp()
    {
        if ($this->db->getTableSchema('{{%ramadan_sehri_subscription}}', true) !== null) {
            return;
        }

        $this->createTable('{{%ramadan_sehri_subscription}}', [
            'id' => $this->primaryKey(),
            'id_customer' => $this->integer()->notNull(),
            'date' => $this->date()->notNull(),
            'opt' => "ENUM('yes','no') NOT NULL",
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
    }

    public function safeDown()
    {
        $this->dropTable('{{%ramadan_sehri_subscription}}');
    }
}
