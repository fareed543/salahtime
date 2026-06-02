<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%city}}`.
 */
class m250128_191827_create_city_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%city}}', [
            'id_city' => $this->primaryKey(),
            'name' => $this->string()->notNull(),
            'id_state' => $this->integer()->notNull(),
            'state_code' => $this->string(10)->notNull(),
            'id_country' => $this->integer()->notNull(),
            'country_code' => $this->string(10)->notNull(),
            'latitude' => $this->float()->notNull(),
            'longitude' => $this->float()->notNull(),
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            'flag' => $this->integer()->notNull()->defaultValue(1),
            'wikiDataId' => $this->string()->null(),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%cities}}');
    }
}
