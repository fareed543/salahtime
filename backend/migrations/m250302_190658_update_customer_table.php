<?php

use yii\db\Migration;

/**
 * Class m250302_190658_update_customer_table
 */
class m250302_190658_update_customer_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->addColumn('{{%customer}}', 'occupation', $this->string(255)->notNull());
        $this->addColumn('{{%customer}}', 'college_name', $this->string(255)->defaultValue(null));
        $this->addColumn('{{%customer}}', 'company_name', $this->text()->defaultValue(null));
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropColumn('{{%customer}}', 'occupation');
        $this->dropColumn('{{%customer}}', 'college_name');
        $this->dropColumn('{{%customer}}', 'company_name');
    }

   
}
