<?php

use yii\db\Migration;

class m260607_090000_drop_knowledge_tables extends Migration
{
    public function safeUp()
    {
        $schema = $this->db->schema;
        $hadithTable = $schema->getTableSchema('{{%knowledge_hadith}}', true);
        $translationTable = $schema->getTableSchema('{{%knowledge_hadith_translation}}', true);
        $tagTable = $schema->getTableSchema('{{%knowledge_tag}}', true);
        $pivotTable = $schema->getTableSchema('{{%knowledge_hadith_tag}}', true);

        if ($pivotTable !== null) {
            $this->dropForeignKeyIfExists('fk-knowledge-hadith-tag-tag', '{{%knowledge_hadith_tag}}');
            $this->dropForeignKeyIfExists('fk-knowledge-hadith-tag-hadith', '{{%knowledge_hadith_tag}}');
            $this->dropTable('{{%knowledge_hadith_tag}}');
        }

        if ($translationTable !== null) {
            $this->dropForeignKeyIfExists('fk-knowledge-hadith-translation-hadith', '{{%knowledge_hadith_translation}}');
            $this->dropTable('{{%knowledge_hadith_translation}}');
        }

        if ($tagTable !== null) {
            $this->dropTable('{{%knowledge_tag}}');
        }

        if ($hadithTable !== null) {
            $this->dropTable('{{%knowledge_hadith}}');
        }
    }

    public function safeDown()
    {
        echo "m260607_090000_drop_knowledge_tables cannot be reverted.\n";
        return false;
    }

    private function dropForeignKeyIfExists(string $name, string $table): void
    {
        try {
            $this->dropForeignKey($name, $table);
        } catch (\Throwable $exception) {
        }
    }
}
