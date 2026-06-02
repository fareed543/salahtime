<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%category_configuration}}`.
 */
class m250203_185711_create_category_configuration_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%category_configuration}}', [
            'id_category_configuration' => $this->primaryKey(),
            'id_category' => $this->integer()->notNull(),
            'id_city' => $this->integer()->defaultValue(null),
            'min' => $this->decimal(10,2)->defaultValue(null),
            'max' => $this->decimal(10,2)->defaultValue(null),
            'percentage' => $this->decimal(10,2)->defaultValue(null),
            'units' => $this->string(100)->notNull(),
            'zakat_units' => $this->string(100)->notNull(),
            'description' => $this->string(255)->notNull(),
        ]);

       
    }

    public function safeDown()
    {
        $this->dropForeignKey('fk-category_configuration-id_category', '{{%category_configuration}}');
        $this->dropForeignKey('fk-category_configuration-id_city', '{{%category_configuration}}');
        $this->dropTable('{{%category_configuration}}');
    }
}