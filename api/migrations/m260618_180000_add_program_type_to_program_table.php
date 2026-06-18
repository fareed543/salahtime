<?php

use yii\db\Migration;

class m260618_180000_add_program_type_to_program_table extends Migration
{
    public function safeUp()
    {
        $this->addColumn(
            '{{%program}}',
            'program_type',
            $this->string(20)->notNull()->defaultValue('general')->after('code')
        );
        $this->createIndex('idx-program-program_type', '{{%program}}', 'program_type');
    }

    public function safeDown()
    {
        $this->dropIndex('idx-program-program_type', '{{%program}}');
        $this->dropColumn('{{%program}}', 'program_type');
    }
}
