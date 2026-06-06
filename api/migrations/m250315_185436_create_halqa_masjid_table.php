<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%halqa_masjid}}`.
 */
class m250315_185436_create_halqa_masjid_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%halqa_masjid}}', [
            'id' => $this->primaryKey(),
            'id_halqa' => $this->integer()->notNull(),
            'id_masjid' => $this->integer()->notNull(),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%halqa_masjid}}');
    }
}
