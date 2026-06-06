<?php

use yii\db\Migration;

/**
 * Class m250301_060636_update_member_table
 */
class m250301_060636_update_member_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->addColumn('{{%member}}', 'email', $this->string(255)->notNull());
        $this->addColumn('{{%member}}', 'birthday', $this->date()->defaultValue(null));
        $this->addColumn('{{%member}}', 'address', $this->string(255)->notNull());
        $this->addColumn('{{%member}}', 'notes', $this->text()->defaultValue(null));
        $this->addColumn('{{%member}}', 'photo', $this->string(255)->defaultValue(null));
        $this->addColumn('{{%member}}', 'document', $this->string(255)->defaultValue(null));
        $this->addColumn('{{%member}}', 'halka', $this->string(255)->defaultValue(null));
        $this->addColumn('{{%member}}', 'masjid', $this->string(255)->defaultValue(null));
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropColumn('{{%member}}', 'email');
        $this->dropColumn('{{%member}}', 'birthday');
        $this->dropColumn('{{%member}}', 'address');
        $this->dropColumn('{{%member}}', 'notes');
        $this->dropColumn('{{%member}}', 'photo');
        $this->dropColumn('{{%member}}', 'document');
        $this->dropColumn('{{%member}}', 'halka');
        $this->dropColumn('{{%member}}', 'masjid');
    }

    /*
    // Use up()/down() to run migration code without a transaction.
    public function up()
    {

    }

    public function down()
    {
        echo "m250301_060636_update_member_table cannot be reverted.\n";

        return false;
    }
    */
}
