<?php

use yii\db\Migration;

/**
 * Class m250301_043740_add_month_to_budget_planner
 */
class m250301_043740_add_month_to_budget_planner extends Migration
{
    public function safeUp()
    {
        $schema = $this->db->getTableSchema('{{%budget_planner}}', true);

        if ($schema !== null && !isset($schema->columns['month'])) {
            $this->addColumn('{{%budget_planner}}', 'month', $this->integer()->notNull()->after('year'));
        }
    }

    public function safeDown()
    {
        $schema = $this->db->getTableSchema('{{%budget_planner}}', true);

        if ($schema !== null && isset($schema->columns['month'])) {
            $this->dropColumn('{{%budget_planner}}', 'month');
        }
    }
}
