<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%halqa}}`.
 */
class m250314_140915_create_halqa_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%halqa}}', [
            'id' => $this->primaryKey(),
            'name' => $this->string(255)->notNull(),
            'address' => $this->text()->null(),
            'description' => $this->text()->null(),
            'city' => $this->text()->null(),
            'state' => $this->text()->null(),
            'country' => $this->text()->null(),
            'id_customer' => $this->integer()->null(),
            'status' => $this->tinyInteger(1)->defaultValue(1)->notNull(),
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        ]);
        
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%halqa}}');
    }
}
