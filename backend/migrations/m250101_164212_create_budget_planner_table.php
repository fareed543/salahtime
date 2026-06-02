<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%budget_planner}}`.
 */
class m250101_164212_create_budget_planner_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%budget_planner}}', [
            'id_planner' => $this->primaryKey(),
            'id_customer' => $this->integer()->notNull(),
            'id_category' => $this->integer()->notNull(),
            'amount' => $this->decimal(10, 2)->notNull(),
            'year' => $this->integer()->notNull(),
            'month' => $this->integer()->notNull(),
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP')->append('ON UPDATE CURRENT_TIMESTAMP'),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%budget_planner}}');
    }
}
