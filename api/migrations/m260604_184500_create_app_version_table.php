<?php

use yii\db\Migration;

class m260604_184500_create_app_version_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%app_version}}', [
            'id_app_version' => $this->primaryKey(),
            'version' => $this->string(50)->notNull(),
            'version_code' => $this->integer()->null(),
            'mandatory' => $this->boolean()->notNull()->defaultValue(false),
            'title' => $this->string(255)->null(),
            'message' => $this->text()->null(),
            'features_json' => $this->text()->null(),
            'bug_fixes_json' => $this->text()->null(),
            'apk_url' => $this->string(500)->null(),
            'update_url' => $this->string(500)->null(),
            'play_store_url' => $this->string(500)->null(),
            'release_date' => $this->dateTime()->null(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);

        $this->createIndex('idx-app-version-active-code', '{{%app_version}}', ['is_active', 'version_code']);

        $this->insert('{{%app_version}}', [
            'version' => '1.0.44',
            'version_code' => 44,
            'mandatory' => false,
            'title' => 'Update available',
            'message' => 'A newer Salah Time build is ready to install.',
            'features_json' => json_encode([
                'Clearer prayer timing updates',
                'Smoother navigation improvements',
            ]),
            'bug_fixes_json' => json_encode([
                'General stability fixes',
                'Notification reliability improvements',
            ]),
            'play_store_url' => 'https://play.google.com/store/apps/details?id=com.wallet.salahtime',
            'is_active' => true,
            'release_date' => date('Y-m-d H:i:s'),
        ]);
    }

    public function safeDown()
    {
        $this->dropTable('{{%app_version}}');
    }
}
