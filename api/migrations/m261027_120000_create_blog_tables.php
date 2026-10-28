<?php

use yii\db\Migration;

/**
 * NF-003 Blog: articles, their immutable versions, the review timeline and daily unique views.
 * Same tables as database/2026-10-27_blog_module.sql.
 */
class m261027_120000_create_blog_tables extends Migration
{
    public function safeUp()
    {
        $options = $this->db->driverName === 'mysql'
            ? 'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB'
            : null;

        if ($this->db->getTableSchema('{{%blog_article}}', true) === null) {
            $this->createTable('{{%blog_article}}', [
                'id' => $this->primaryKey(),
                'author_id' => $this->integer()->notNull(),
                'status' => $this->string(20)->notNull()->defaultValue('draft'),
                'is_public' => $this->boolean()->notNull()->defaultValue(0),
                'slug' => $this->string(190)->null(),
                'live_version_id' => $this->integer()->null(),
                'latest_version_id' => $this->integer()->null(),
                'proposal_version_id' => $this->integer()->null(),
                'views' => $this->integer()->notNull()->defaultValue(0),
                'reject_reason' => $this->text()->null(),
                'reviewed_by' => $this->integer()->null(),
                'submitted_at' => $this->dateTime()->null(),
                'published_at' => $this->dateTime()->null(),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
                'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ], $options);
            $this->createIndex('idx-blog-article-slug', '{{%blog_article}}', 'slug', true);
            $this->createIndex('idx-blog-article-author', '{{%blog_article}}', 'author_id');
            $this->createIndex('idx-blog-article-status', '{{%blog_article}}', 'status');
            $this->createIndex('idx-blog-article-public', '{{%blog_article}}', ['is_public', 'published_at']);
        }

        if ($this->db->getTableSchema('{{%blog_article_version}}', true) === null) {
            $this->createTable('{{%blog_article_version}}', [
                'id' => $this->primaryKey(),
                'article_id' => $this->integer()->notNull(),
                'version_no' => $this->integer()->notNull(),
                'source' => $this->string(20)->notNull()->defaultValue('author'),
                'title' => $this->string(190)->notNull(),
                'slug' => $this->string(190)->notNull(),
                'content_html' => 'MEDIUMTEXT NOT NULL',
                'meta_title' => $this->string(120)->null(),
                'meta_description' => $this->string(300)->null(),
                'focus_keyword' => $this->string(100)->null(),
                'category' => $this->string(40)->null(),
                'tags' => $this->string(300)->null(),
                'language' => $this->string(10)->null(),
                'cover_image_url' => $this->string(500)->null(),
                'cover_thumb_url' => $this->string(500)->null(),
                'cover_alt' => $this->string(190)->null(),
                'references_text' => $this->text()->null(),
                'seo_score' => $this->tinyInteger()->unsigned()->notNull()->defaultValue(0),
                'word_count' => $this->integer()->notNull()->defaultValue(0),
                'note' => $this->text()->null(),
                'created_by' => $this->integer()->notNull(),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ], $options);
            $this->createIndex('idx-blog-version-article-no', '{{%blog_article_version}}', ['article_id', 'version_no'], true);
        }

        if ($this->db->getTableSchema('{{%blog_article_event}}', true) === null) {
            $this->createTable('{{%blog_article_event}}', [
                'id' => $this->primaryKey(),
                'article_id' => $this->integer()->notNull(),
                'version_id' => $this->integer()->null(),
                'action' => $this->string(30)->notNull(),
                'from_status' => $this->string(20)->null(),
                'to_status' => $this->string(20)->null(),
                'actor_id' => $this->integer()->null(),
                'actor_role' => $this->string(10)->notNull()->defaultValue('author'),
                'note' => $this->text()->null(),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ], $options);
            $this->createIndex('idx-blog-event-article', '{{%blog_article_event}}', 'article_id');
        }

        if ($this->db->getTableSchema('{{%blog_article_view}}', true) === null) {
            $this->createTable('{{%blog_article_view}}', [
                'id' => $this->primaryKey(),
                'article_id' => $this->integer()->notNull(),
                'view_date' => $this->date()->notNull(),
                'visitor_hash' => $this->char(40)->notNull(),
            ], $options);
            $this->createIndex('idx-blog-view-unique', '{{%blog_article_view}}', ['article_id', 'view_date', 'visitor_hash'], true);
        }
    }

    public function safeDown()
    {
        $this->dropTable('{{%blog_article_view}}');
        $this->dropTable('{{%blog_article_event}}');
        $this->dropTable('{{%blog_article_version}}');
        $this->dropTable('{{%blog_article}}');
    }
}
