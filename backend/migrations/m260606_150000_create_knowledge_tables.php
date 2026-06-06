<?php

use yii\db\Migration;

class m260606_150000_create_knowledge_tables extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%knowledge_hadith}}', [
            'id' => $this->primaryKey(),
            'title' => $this->string(255)->notNull(),
            'arabic_text' => $this->text()->notNull(),
            'reference_source' => $this->string(255)->null(),
            'reference_link' => $this->string(255)->null(),
            'rule_type' => $this->string(100)->null(),
            'is_farz' => $this->boolean()->notNull()->defaultValue(0),
            'status' => $this->boolean()->notNull()->defaultValue(1),
            'sort_order' => $this->integer()->notNull()->defaultValue(0),
        ]);

        $this->createTable('{{%knowledge_hadith_translation}}', [
            'id' => $this->primaryKey(),
            'id_hadith' => $this->integer()->notNull(),
            'language_code' => $this->string(10)->notNull(),
            'meaning_text' => $this->text()->null(),
        ]);

        $this->createTable('{{%knowledge_tag}}', [
            'id' => $this->primaryKey(),
            'code' => $this->string(255)->notNull()->unique(),
            'name' => $this->string(255)->notNull(),
            'status' => $this->boolean()->notNull()->defaultValue(1),
            'sort_order' => $this->integer()->notNull()->defaultValue(0),
        ]);

        $this->createTable('{{%knowledge_hadith_tag}}', [
            'id' => $this->primaryKey(),
            'id_hadith' => $this->integer()->notNull(),
            'id_tag' => $this->integer()->notNull(),
        ]);

        $this->createIndex('idx-knowledge-hadith-translation-hadith', '{{%knowledge_hadith_translation}}', 'id_hadith');
        $this->createIndex('idx-knowledge-hadith-tag-hadith', '{{%knowledge_hadith_tag}}', 'id_hadith');
        $this->createIndex('idx-knowledge-hadith-tag-tag', '{{%knowledge_hadith_tag}}', 'id_tag');

        $this->addForeignKey('fk-knowledge-hadith-translation-hadith', '{{%knowledge_hadith_translation}}', 'id_hadith', '{{%knowledge_hadith}}', 'id', 'CASCADE');
        $this->addForeignKey('fk-knowledge-hadith-tag-hadith', '{{%knowledge_hadith_tag}}', 'id_hadith', '{{%knowledge_hadith}}', 'id', 'CASCADE');
        $this->addForeignKey('fk-knowledge-hadith-tag-tag', '{{%knowledge_hadith_tag}}', 'id_tag', '{{%knowledge_tag}}', 'id', 'CASCADE');

        $this->batchInsert('{{%knowledge_tag}}', ['code', 'name', 'status', 'sort_order'], [
            ['gusl', 'Gusl Ka Tareeqa', 1, 10],
            ['gusl-farz', 'Gusl ke Farz', 1, 20],
            ['gusl-sunnat', 'Gusl ke Sunnate', 1, 30],
            ['wazu', 'Wazku Ka Tareeqa', 1, 40],
            ['wazu-farz', 'Wazu ke Farz', 1, 50],
            ['wazu-sunnat', 'Wazu ke Sunnate', 1, 60],
            ['namaz', 'Namaz Ka Tareeqa', 1, 70],
            ['namaz-shart', 'Namaz ke Sharaith', 1, 80],
            ['namaz-farz', 'Namaz ke Farz', 1, 90],
            ['namaz-wajib', 'Namaz ke Wajib', 1, 100],
            ['namaz-sunnat', 'Namaz ke Sunnate', 1, 110],
            ['namaz-mustahab', 'Namaz ke Mustahab', 1, 120],
        ]);
    }

    public function safeDown()
    {
        $this->dropForeignKey('fk-knowledge-hadith-tag-tag', '{{%knowledge_hadith_tag}}');
        $this->dropForeignKey('fk-knowledge-hadith-tag-hadith', '{{%knowledge_hadith_tag}}');
        $this->dropForeignKey('fk-knowledge-hadith-translation-hadith', '{{%knowledge_hadith_translation}}');
        $this->dropTable('{{%knowledge_hadith_tag}}');
        $this->dropTable('{{%knowledge_tag}}');
        $this->dropTable('{{%knowledge_hadith_translation}}');
        $this->dropTable('{{%knowledge_hadith}}');
    }
}
