<?php

use yii\db\Migration;

class m260801_150000_sync_role_names_from_customer_type extends Migration
{
    public function safeUp()
    {
        $roleTable = '{{%role}}';
        $legacyRoleTable = '{{%customer_type}}';

        $roleSchema = $this->db->schema->getTableSchema($roleTable, true);
        $legacySchema = $this->db->schema->getTableSchema($legacyRoleTable, true);

        if ($roleSchema === null || $legacySchema === null) {
            return;
        }

        $rows = (new \yii\db\Query())
            ->from($legacyRoleTable)
            ->orderBy(['id_customer_type' => SORT_ASC])
            ->all($this->db);

        foreach ($rows as $row) {
            $roleId = (int)($row['id_customer_type'] ?? 0);
            if ($roleId <= 0) {
                continue;
            }

            $this->upsert($roleTable, [
                'id' => $roleId,
                'name' => (string)($row['name'] ?? ''),
                'code' => $this->resolveRoleCode($roleId, (string)($row['name'] ?? '')),
                'description' => (string)($row['name'] ?? ''),
                'status' => (int)($row['status'] ?? 1),
                'is_system' => 1,
                'created_at' => new \yii\db\Expression('NOW()'),
                'updated_at' => new \yii\db\Expression('NOW()'),
            ], [
                'name' => (string)($row['name'] ?? ''),
                'description' => (string)($row['name'] ?? ''),
                'status' => (int)($row['status'] ?? 1),
                'is_system' => 1,
                'updated_at' => new \yii\db\Expression('NOW()'),
            ]);
        }

        $this->dropTable($legacyRoleTable);
    }

    public function safeDown()
    {
        return false;
    }

    private function resolveRoleCode(int $roleId, string $name): string
    {
        $systemCodes = [
            1 => 'administrator',
            2 => 'manager',
            3 => 'users',
            4 => 'support',
            5 => 'restricted-user',
            6 => 'developer',
            7 => 'subscriber',
            8 => 'organizer',
        ];

        if (isset($systemCodes[$roleId])) {
            return $systemCodes[$roleId];
        }

        $normalized = strtolower(trim($name));
        $normalized = str_replace('&', 'and', $normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?: '';
        return trim($normalized, '-');
    }
}
