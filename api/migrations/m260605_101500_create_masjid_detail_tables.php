<?php

use yii\db\Migration;

class m260605_101500_create_masjid_detail_tables extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%masjid_detail}}', [
            'id_masjid_detail' => $this->primaryKey(),
            'id_masjid' => $this->integer()->notNull(),
            'email' => $this->string(255)->null(),
            'contact' => $this->string(100)->null(),
            'location' => $this->text()->null(),
            'temperature' => $this->string(20)->null(),
            'qr_code_url' => $this->string(500)->null(),
            'qr_approved' => $this->boolean()->notNull()->defaultValue(false),
            'qr_approved_by' => $this->string(255)->null(),
            'stay_nearby' => $this->boolean()->notNull()->defaultValue(false),
            'ladies_jamat' => $this->boolean()->notNull()->defaultValue(false),
            'ladies_ramzan_access' => $this->boolean()->notNull()->defaultValue(false),
            'wazu_khana' => $this->boolean()->notNull()->defaultValue(false),
            'toilet' => $this->boolean()->notNull()->defaultValue(false),
            'gusl_khana' => $this->boolean()->notNull()->defaultValue(false),
            'air_conditioners' => $this->boolean()->notNull()->defaultValue(false),
            'chairs' => $this->boolean()->notNull()->defaultValue(false),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);

        $this->createIndex('idx-masjid-detail-masjid', '{{%masjid_detail}}', 'id_masjid', true);
        $this->addForeignKey(
            'fk-masjid-detail-masjid',
            '{{%masjid_detail}}',
            'id_masjid',
            '{{%masjid}}',
            'id',
            'CASCADE',
            'CASCADE'
        );

        $this->createTable('{{%masjid_committee_member}}', [
            'id_masjid_committee_member' => $this->primaryKey(),
            'id_masjid' => $this->integer()->notNull(),
            'name' => $this->string(255)->notNull(),
            'role' => $this->string(255)->notNull(),
            'phone' => $this->string(50)->null(),
            'sort_order' => $this->integer()->notNull()->defaultValue(0),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);

        $this->createIndex('idx-masjid-committee-masjid', '{{%masjid_committee_member}}', 'id_masjid');
        $this->addForeignKey(
            'fk-masjid-committee-masjid',
            '{{%masjid_committee_member}}',
            'id_masjid',
            '{{%masjid}}',
            'id',
            'CASCADE',
            'CASCADE'
        );

        $this->createTable('{{%masjid_timing}}', [
            'id_masjid_timing' => $this->primaryKey(),
            'id_masjid' => $this->integer()->notNull(),
            'salah' => $this->string(100)->notNull(),
            'azan_time' => $this->string(50)->null(),
            'jamat_time' => $this->string(50)->null(),
            'sort_order' => $this->integer()->notNull()->defaultValue(0),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);

        $this->createIndex('idx-masjid-timing-masjid', '{{%masjid_timing}}', 'id_masjid');
        $this->addForeignKey(
            'fk-masjid-timing-masjid',
            '{{%masjid_timing}}',
            'id_masjid',
            '{{%masjid}}',
            'id',
            'CASCADE',
            'CASCADE'
        );
    }

    public function safeDown()
    {
        $this->dropTable('{{%masjid_timing}}');
        $this->dropTable('{{%masjid_committee_member}}');
        $this->dropTable('{{%masjid_detail}}');
    }
}
