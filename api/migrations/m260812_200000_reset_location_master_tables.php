<?php

use yii\db\Migration;

class m260812_200000_reset_location_master_tables extends Migration
{
    public function safeUp()
    {
        $this->dropLocationTablesIfPresent();

        $this->createTable('{{%countries}}', [
            'id' => $this->bigPrimaryKey(),
            'name' => $this->string(100)->notNull(),
            'code' => $this->string(3)->notNull()->unique(),
            'slug' => $this->string(120)->notNull()->unique(),
            'timezone' => $this->string(100)->null(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ]);

        $this->createTable('{{%states}}', [
            'id' => $this->bigPrimaryKey(),
            'country_id' => $this->bigInteger()->notNull(),
            'name' => $this->string(150)->notNull(),
            'code' => $this->string(50)->null(),
            'slug' => $this->string(180)->notNull(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ]);

        $this->createTable('{{%cities}}', [
            'id' => $this->bigPrimaryKey(),
            'geoname_id' => $this->bigInteger()->null()->unique(),
            'country_id' => $this->bigInteger()->notNull(),
            'state_id' => $this->bigInteger()->null(),
            'name' => $this->string(150)->notNull(),
            'ascii_name' => $this->string(150)->null(),
            'slug' => $this->string(180)->notNull(),
            'latitude' => $this->decimal(10, 7)->notNull(),
            'longitude' => $this->decimal(10, 7)->notNull(),
            'timezone' => $this->string(100)->notNull(),
            'population' => $this->bigInteger()->notNull()->defaultValue(0),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
        ]);

        $this->createIndex('idx_states_country', '{{%states}}', 'country_id');
        $this->createIndex('idx_states_country_slug', '{{%states}}', ['country_id', 'slug'], true);

        $this->createIndex('idx_cities_country', '{{%cities}}', 'country_id');
        $this->createIndex('idx_cities_state', '{{%cities}}', 'state_id');
        $this->createIndex('idx_cities_name', '{{%cities}}', 'name');
        $this->createIndex('idx_cities_geoname', '{{%cities}}', 'geoname_id');
        $this->createIndex('idx_cities_country_state_slug', '{{%cities}}', ['country_id', 'state_id', 'slug'], true);

        $this->addForeignKey(
            'fk_states_country',
            '{{%states}}',
            'country_id',
            '{{%countries}}',
            'id',
            'RESTRICT',
            'CASCADE'
        );

        $this->addForeignKey(
            'fk_cities_country',
            '{{%cities}}',
            'country_id',
            '{{%countries}}',
            'id',
            'RESTRICT',
            'CASCADE'
        );

        $this->addForeignKey(
            'fk_cities_state',
            '{{%cities}}',
            'state_id',
            '{{%states}}',
            'id',
            'SET NULL',
            'CASCADE'
        );
    }

    public function safeDown()
    {
        $this->dropLocationTablesIfPresent();
    }

    private function dropLocationTablesIfPresent(): void
    {
        $schema = $this->db->schema;

        if ($schema->getTableSchema('{{%cities}}', true) !== null) {
            $this->dropForeignKeyIfExists('fk_cities_state', '{{%cities}}');
            $this->dropForeignKeyIfExists('fk_cities_country', '{{%cities}}');
            $this->dropTable('{{%cities}}');
        }

        if ($schema->getTableSchema('{{%states}}', true) !== null) {
            $this->dropForeignKeyIfExists('fk_states_country', '{{%states}}');
            $this->dropTable('{{%states}}');
        }

        if ($schema->getTableSchema('{{%countries}}', true) !== null) {
            $this->dropTable('{{%countries}}');
        }
    }

    private function dropForeignKeyIfExists(string $name, string $table): void
    {
        try {
            $this->dropForeignKey($name, $table);
        } catch (\Throwable $exception) {
        }
    }
}
