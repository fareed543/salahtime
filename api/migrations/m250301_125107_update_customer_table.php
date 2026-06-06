<?php

use yii\db\Migration;

/**
 * Class m250301_125107_update_customer_table
 */
class m250301_125107_update_customer_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->addColumn('{{%customer}}', 'address', $this->string(255)->notNull());
        $this->addColumn('{{%customer}}', 'masjid', $this->string(255)->defaultValue(null));
        $this->addColumn('{{%customer}}', 'landmark', $this->text()->defaultValue(null));
        $this->addColumn('{{%customer}}', 'notes', $this->text()->defaultValue(null));
        $this->addColumn('{{%customer}}', 'designation', $this->text()->defaultValue(null));

    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropColumn('{{%customer}}', 'address');
        $this->dropColumn('{{%customer}}', 'masjid');
        $this->dropColumn('{{%customer}}', 'landmark');
        $this->dropColumn('{{%customer}}', 'notes');
        $this->dropColumn('{{%customer}}', 'designation');
    }

}
