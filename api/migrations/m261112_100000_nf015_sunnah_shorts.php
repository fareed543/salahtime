<?php

use yii\db\Migration;

/**
 * NF-015 Sunnah Shorts: categories (book chapters), reference books, cards, card references and
 * per-device likes. Same tables as database/2026-11-12_nf015_sunnah_shorts.sql.
 *
 * Multi-language fields (category name, card headline / text, zikr) are JSON objects keyed by
 * language code, stored as TEXT so MariaDB and MySQL behave the same.
 */
class m261112_100000_nf015_sunnah_shorts extends Migration
{
    public function safeUp()
    {
        $options = $this->db->driverName === 'mysql'
            ? 'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB'
            : null;

        if ($this->db->getTableSchema('{{%sunnah_category}}', true) === null) {
            $this->createTable('{{%sunnah_category}}', [
                'id' => $this->primaryKey(),
                'name' => $this->text()->notNull(),
                'sort_order' => $this->integer()->notNull()->defaultValue(0),
                'active' => $this->boolean()->notNull()->defaultValue(1),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
                'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ], $options);
        }

        if ($this->db->getTableSchema('{{%sunnah_reference_book}}', true) === null) {
            $this->createTable('{{%sunnah_reference_book}}', [
                'id' => $this->primaryKey(),
                'name' => $this->string(80)->notNull(),
                'sort_order' => $this->integer()->notNull()->defaultValue(0),
                'active' => $this->boolean()->notNull()->defaultValue(1),
            ], $options);
            $this->createIndex('idx-sunnah-book-name', '{{%sunnah_reference_book}}', 'name', true);
            $order = 0;
            foreach (['Tirmizi', 'Mishkaat', 'Ibne Maaja', 'Eela us Sunan', 'Ithaf', 'Bukhari', 'Muslim', 'Abu Dawood', 'Nasai'] as $name) {
                $this->insert('{{%sunnah_reference_book}}', ['name' => $name, 'sort_order' => ++$order, 'active' => 1]);
            }
        }

        if ($this->db->getTableSchema('{{%sunnah_card}}', true) === null) {
            $this->createTable('{{%sunnah_card}}', [
                'id' => $this->primaryKey(),
                'category_id' => $this->integer()->notNull(),
                'slug' => $this->string(120)->notNull(),
                'headline' => $this->text()->notNull(),
                'body' => $this->text()->notNull(),
                'zikr' => $this->text()->null(),
                'template' => $this->string(10)->notNull()->defaultValue('t01'),
                'image_url' => $this->string(500)->null(),
                'thumb_url' => $this->string(500)->null(),
                'source_page' => $this->string(100)->null(),
                'sort_order' => $this->integer()->notNull()->defaultValue(0),
                'status' => $this->string(12)->notNull()->defaultValue('draft'),
                'likes' => $this->integer()->notNull()->defaultValue(0),
                'created_by' => $this->integer()->null(),
                'updated_by' => $this->integer()->null(),
                'published_at' => $this->dateTime()->null(),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
                'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ], $options);
            $this->createIndex('idx-sunnah-card-slug', '{{%sunnah_card}}', 'slug', true);
            $this->createIndex('idx-sunnah-card-category', '{{%sunnah_card}}', ['category_id', 'sort_order']);
            $this->createIndex('idx-sunnah-card-status', '{{%sunnah_card}}', 'status');
        }

        if ($this->db->getTableSchema('{{%sunnah_card_reference}}', true) === null) {
            $this->createTable('{{%sunnah_card_reference}}', [
                'id' => $this->primaryKey(),
                'card_id' => $this->integer()->notNull(),
                'book_id' => $this->integer()->notNull(),
                'number' => $this->string(40)->notNull(),
                'sort_order' => $this->integer()->notNull()->defaultValue(0),
            ], $options);
            $this->createIndex('idx-sunnah-ref-card', '{{%sunnah_card_reference}}', ['card_id', 'sort_order']);
        }

        if ($this->db->getTableSchema('{{%sunnah_like}}', true) === null) {
            $this->createTable('{{%sunnah_like}}', [
                'id' => $this->primaryKey(),
                'card_id' => $this->integer()->notNull(),
                'device_id' => $this->string(64)->notNull(),
                'ip' => $this->string(45)->null(),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ], $options);
            $this->createIndex('idx-sunnah-like-card-device', '{{%sunnah_like}}', ['card_id', 'device_id'], true);
            $this->createIndex('idx-sunnah-like-ip-time', '{{%sunnah_like}}', ['ip', 'created_at']);
        }
    }

    public function safeDown()
    {
        foreach (['sunnah_like', 'sunnah_card_reference', 'sunnah_card', 'sunnah_reference_book', 'sunnah_category'] as $table) {
            if ($this->db->getTableSchema('{{%' . $table . '}}', true) !== null) {
                $this->dropTable('{{%' . $table . '}}');
            }
        }
    }
}
