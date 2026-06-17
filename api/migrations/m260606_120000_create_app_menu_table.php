<?php

use yii\db\Migration;

class m260606_120000_create_app_menu_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%app_menu}}', [
            'id' => $this->primaryKey(),
            'code' => $this->string(100)->notNull()->unique(),
            'label_key' => $this->string(255)->notNull(),
            'icon' => $this->string(255)->notNull(),
            'route' => $this->string(255)->notNull(),
            'enabled' => $this->boolean()->notNull()->defaultValue(0),
            'sort_order' => $this->integer()->notNull()->defaultValue(0),
        ]);

        $this->batchInsert('{{%app_menu}}', ['code', 'label_key', 'icon', 'route', 'enabled', 'sort_order'], [
            ['programs', 'MENU.PROGRAMS', 'bi-calendar-event', '/programs', 1, 10],
            ['subscription', 'MENU.SUBSCRIPTION', 'bi-person-lines-fill', '/subscription', 1, 20],
            ['masjid', 'MENU.MASJID', 'bi-building', '/masjid', 1, 30],
            ['area', 'MENU.HALQA', 'bi-geo-alt', '/area', 1, 40],
            ['zakat-calculator', 'MENU.ZAKAT_CALCULATOR', 'bi-calculator', '/zakat-calculator', 1, 50],
        ]);
    }

    public function safeDown()
    {
        $this->dropTable('{{%app_menu}}');
    }
}
