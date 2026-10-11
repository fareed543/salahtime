<?php

use yii\db\Migration;

/**
 * SalahTime has no states/provinces concept: locations are country -> city.
 * Drops bt_states, bt_cities.state_id and bt_location_observance.state_id (where they exist).
 * City slugs become unique per country; a duplicate (same name in two former states) gets "-<state>"
 * appended so no city is lost. Irreversible.
 */
class m261011_100000_remove_states_from_locations extends Migration
{
    public function safeUp()
    {
        $cities = $this->db->getTableSchema('{{%cities}}', true);
        if ($cities !== null && isset($cities->columns['state_id'])) {
            $this->renameDuplicateCitySlugs();
            $this->dropForeignKeysOn('{{%cities}}', 'state_id');
            $this->dropIndexIfExists('idx_cities_country_state_slug', '{{%cities}}');
            $this->dropIndexIfExists('idx_cities_state', '{{%cities}}');
            $this->dropColumn('{{%cities}}', 'state_id');
            $this->createIndex('idx_cities_country_slug', '{{%cities}}', ['country_id', 'slug'], true);
        }

        $observance = $this->db->getTableSchema('{{%location_observance}}', true);
        if ($observance !== null && isset($observance->columns['state_id'])) {
            $this->dropForeignKeysOn('{{%location_observance}}', 'state_id');
            $this->dropIndexesOn('{{%location_observance}}', 'state_id');
            $this->dropColumn('{{%location_observance}}', 'state_id');
        }

        if ($this->db->getTableSchema('{{%states}}', true) !== null) {
            $this->dropForeignKeysOn('{{%states}}', 'country_id');
            $this->dropTable('{{%states}}');
        }
    }

    public function safeDown()
    {
        echo "m261011_100000_remove_states_from_locations cannot be reverted: states were removed.\n";
        return false;
    }

    /** Keep the oldest city per (country, slug); suffix the others with their state's slug (or id). */
    private function renameDuplicateCitySlugs(): void
    {
        $query = (new \yii\db\Query())
            ->select(['c.id', 'c.country_id', 'c.slug'])
            ->from(['c' => '{{%cities}}'])
            ->orderBy(['c.country_id' => SORT_ASC, 'c.slug' => SORT_ASC, 'c.id' => SORT_ASC]);
        if ($this->db->getTableSchema('{{%states}}', true) !== null) {
            $query->addSelect(['stateSlug' => 's.slug'])->leftJoin(['s' => '{{%states}}'], 's.id = c.state_id');
        }
        $rows = $query->all($this->db);

        $taken = [];
        foreach ($rows as $row) {
            $taken[$row['country_id'] . '|' . $row['slug']] = ($taken[$row['country_id'] . '|' . $row['slug']] ?? 0) + 1;
        }
        $seen = [];
        foreach ($rows as $row) {
            $key = $row['country_id'] . '|' . $row['slug'];
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                continue;
            }
            $base = $row['slug'] . '-' . (($row['stateSlug'] ?? null) ?: $row['id']);
            $slug = $base;
            for ($n = 2; isset($taken[$row['country_id'] . '|' . $slug]); $n++) {
                $slug = $base . '-' . $n;
            }
            $taken[$row['country_id'] . '|' . $slug] = 1;
            $this->update('{{%cities}}', ['slug' => $slug], ['id' => (int)$row['id']]);
            echo "    > city #{$row['id']}: slug '{$row['slug']}' renamed to '{$slug}' (duplicate in its country)\n";
        }
    }

    private function dropForeignKeysOn(string $table, string $column): void
    {
        $tableName = $this->db->schema->getRawTableName($table);
        $names = $this->db->createCommand(
            'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c AND REFERENCED_TABLE_NAME IS NOT NULL',
            [':t' => $tableName, ':c' => $column]
        )->queryColumn();
        foreach (array_unique($names) as $name) {
            $this->dropForeignKey($name, $table);
        }
    }

    private function dropIndexesOn(string $table, string $column): void
    {
        $tableName = $this->db->schema->getRawTableName($table);
        $names = $this->db->createCommand(
            "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c AND INDEX_NAME <> 'PRIMARY'",
            [':t' => $tableName, ':c' => $column]
        )->queryColumn();
        foreach ($names as $name) {
            $this->dropIndex($name, $table);
        }
    }

    private function dropIndexIfExists(string $name, string $table): void
    {
        $tableName = $this->db->schema->getRawTableName($table);
        $exists = $this->db->createCommand(
            'SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND INDEX_NAME = :i',
            [':t' => $tableName, ':i' => $name]
        )->queryScalar();
        if ($exists) {
            $this->dropIndex($name, $table);
        }
    }
}
