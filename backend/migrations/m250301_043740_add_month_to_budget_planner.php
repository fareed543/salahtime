<?php

use yii\db\Migration;

/**
 * Class m250301_043740_add_month_to_budget_planner
 */
class m250301_043740_add_month_to_budget_planner extends Migration
{
    public function safeUp()
    {
        $this->addColumn('{{%budget_planner}}', 'month', $this->integer()->notNull()->after('year'));
    }

    public function safeDown()
    {
        $this->dropColumn('{{%budget_planner}}', 'month');
    }
}
