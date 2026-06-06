<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%masjid}}`.
 */
class m250314_150313_create_masjid_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%masjid}}', [
            'id' => $this->primaryKey(),
            'name' => $this->string(255)->notNull(),
            'address' => $this->text()->null(),
            'area' => $this->text()->null(),
            'city' => $this->text()->null(),
            'state' => $this->text()->null(),
            'pincode' => $this->text()->null(),
            'country' => $this->text()->null(),
            'status' => $this->tinyInteger(1)->defaultValue(1)->notNull()->comment('1=Active, 0=Inactive'),
            'id_customer' => $this->integer()->null(),
            'id_halqa' => $this->integer()->null(),
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%masjid}}');
    }
}
