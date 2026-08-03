<?php

use yii\db\Migration;

class m260801_120000_normalize_language_table extends Migration
{
    private const TABLE = '{{%language}}';

    public function safeUp()
    {
        $tableSchema = $this->db->getTableSchema(self::TABLE, true);

        if ($tableSchema === null) {
            $this->createTable(self::TABLE, [
                'id_language' => $this->primaryKey(),
                'name' => $this->string(191)->notNull(),
                'native_name' => $this->string(191)->null(),
                'code' => $this->string(10)->notNull(),
                'status' => $this->tinyInteger(1)->notNull()->defaultValue(1)->comment('1:Enable;0:Disable'),
                'sort_order' => $this->integer()->notNull()->defaultValue(0),
                'created_at' => $this->dateTime()->null(),
                'updated_at' => $this->dateTime()->null(),
            ]);
            $this->createIndex('idx_bt_language_code_unique', self::TABLE, 'code', true);
        } else {
            $columns = $tableSchema->columns;

            if (!isset($columns['native_name'])) {
                $this->addColumn(self::TABLE, 'native_name', $this->string(191)->null()->after('name'));
            }

            if (!isset($columns['sort_order'])) {
                $this->addColumn(self::TABLE, 'sort_order', $this->integer()->notNull()->defaultValue(0)->after('status'));
            }

            if (!isset($columns['created_at'])) {
                $this->addColumn(self::TABLE, 'created_at', $this->dateTime()->null()->after('sort_order'));
            }

            if (!isset($columns['updated_at'])) {
                $this->addColumn(self::TABLE, 'updated_at', $this->dateTime()->null()->after('created_at'));
            }

            try {
                $this->createIndex('idx_bt_language_code_unique', self::TABLE, 'code', true);
            } catch (\Throwable $exception) {
                // Legacy installs may already have a matching unique index.
            }
        }

        $timestamp = date('Y-m-d H:i:s');
        $this->delete(self::TABLE);
        $this->batchInsert(
            self::TABLE,
            ['id_language', 'name', 'native_name', 'code', 'status', 'sort_order', 'created_at', 'updated_at'],
            [
                [1, 'English', 'English', 'en', 1, 1, $timestamp, $timestamp],
                [2, 'Telugu', 'తెలుగు', 'te', 1, 2, $timestamp, $timestamp],
                [3, 'Arabic', 'العربية', 'ar', 1, 3, $timestamp, $timestamp],
                [4, 'Urdu', 'اردو', 'ur', 1, 4, $timestamp, $timestamp],
            ]
        );
    }

    public function safeDown()
    {
        $this->delete(self::TABLE, ['code' => ['en', 'te', 'ar', 'ur']]);
    }
}
