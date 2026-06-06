<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%city_price}}`.
 */
class m250128_192147_create_city_price_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%city_price}}', [
            'id_city_price' => $this->primaryKey(),
            'id_city' => $this->integer()->null(),
            'id_category' => $this->integer()->notNull(),
            'price' => $this->float()->null(),
            'created_at' => $this->timestamp()->null(),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%city_price}}');
    }
}
