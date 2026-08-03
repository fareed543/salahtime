<?php

use yii\db\Migration;

class m260801_010000_rename_customer_type_to_user_role extends Migration
{
    public function safeUp()
    {
        $customerTable = '{{%customer}}';
        $legacyRoleTable = '{{%customer_type}}';
        $newRoleTable = '{{%user_role}}';
        $legacyPermissionMap = '{{%customer_type_permission}}';
        $newPermissionMap = '{{%user_role_permission}}';

        $customerSchema = $this->db->schema->getTableSchema($customerTable, true);
        $finalRoleSchema = $this->db->schema->getTableSchema('{{%role}}', true);
        $roleSchema = $this->db->schema->getTableSchema($legacyRoleTable, true);
        $newRoleSchema = $this->db->schema->getTableSchema($newRoleTable, true);

        // The current app expects bt_role + bt_customer.id_role. Skip the legacy rename path once that schema exists.
        if ($finalRoleSchema !== null && $customerSchema !== null && isset($customerSchema->columns['id_role'])) {
            return;
        }

        if ($roleSchema === null) {
            return;
        }

        if ($newRoleSchema !== null
            && isset($newRoleSchema->columns['customer_id'])
            && isset($newRoleSchema->columns['role_id'])) {
            $this->dropTable($newRoleTable);
            $newRoleSchema = null;
        }

        if ($roleSchema !== null) {
            if (!isset($roleSchema->columns['code'])) {
                $this->addColumn($legacyRoleTable, 'code', $this->string(255)->null()->after('name'));
            }
            if (!isset($roleSchema->columns['description'])) {
                $this->addColumn($legacyRoleTable, 'description', $this->text()->null()->after('code'));
            }
            if (!isset($roleSchema->columns['is_system'])) {
                $this->addColumn($legacyRoleTable, 'is_system', $this->boolean()->notNull()->defaultValue(0)->after('status'));
            }
            if (!isset($roleSchema->columns['created_at'])) {
                $this->addColumn($legacyRoleTable, 'created_at', $this->dateTime()->null()->after('is_system'));
            }
            if (!isset($roleSchema->columns['updated_at'])) {
                $this->addColumn($legacyRoleTable, 'updated_at', $this->dateTime()->null()->after('created_at'));
            }

            $this->execute("
                UPDATE {$legacyRoleTable}
                SET code = CASE id_customer_type
                    WHEN 1 THEN 'administrator'
                    WHEN 2 THEN 'manager'
                    WHEN 3 THEN 'users'
                    WHEN 4 THEN 'support'
                    WHEN 5 THEN 'restricted-user'
                    ELSE LOWER(REPLACE(REPLACE(TRIM(COALESCE(name, '')), '&', 'and'), ' ', '-'))
                END
                WHERE code IS NULL OR code = ''
            ");

            $this->execute("
                UPDATE {$legacyRoleTable}
                SET is_system = CASE
                    WHEN id_customer_type IN (1, 2, 3, 4, 5) THEN 1
                    ELSE COALESCE(is_system, 0)
                END
            ");

            if (!$this->indexExists($legacyRoleTable, 'idx-customer-type-code-unique')) {
                $this->createIndex('idx-customer-type-code-unique', $legacyRoleTable, 'code', true);
            }
        }

        if ($this->db->schema->getTableSchema($legacyPermissionMap, true) === null) {
            $this->createTable($legacyPermissionMap, [
                'id' => $this->primaryKey(),
                'customer_type_id' => $this->integer()->notNull(),
                'permission_id' => $this->integer()->notNull(),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ]);
            $this->createIndex('idx-customer-type-permission-unique', $legacyPermissionMap, ['customer_type_id', 'permission_id'], true);
            if ($this->db->schema->getTableSchema($legacyRoleTable, true) !== null) {
                $this->addForeignKey('fk-customer-type-permission-role', $legacyPermissionMap, 'customer_type_id', $legacyRoleTable, 'id_customer_type', 'CASCADE', 'CASCADE');
            }
            if ($this->db->schema->getTableSchema('{{%permission}}', true) !== null) {
                $this->addForeignKey('fk-customer-type-permission-permission', $legacyPermissionMap, 'permission_id', '{{%permission}}', 'id', 'CASCADE', 'CASCADE');
            }
        }

        if ($this->db->schema->getTableSchema('{{%role}}', true) !== null && $this->db->schema->getTableSchema('{{%role_permission}}', true) !== null) {
            $this->execute("
                INSERT IGNORE INTO {$legacyPermissionMap} (customer_type_id, permission_id, created_at)
                SELECT ct.id_customer_type, rp.permission_id, CURRENT_TIMESTAMP
                FROM {{%role_permission}} rp
                INNER JOIN {{%role}} r ON r.id = rp.role_id
                INNER JOIN {$legacyRoleTable} ct ON ct.code = r.code
            ");
        }

        if ($roleSchema !== null && $newRoleSchema === null) {
            $this->renameTable($legacyRoleTable, $newRoleTable);
        }

        $roleSchema = $this->db->schema->getTableSchema($newRoleTable, true);
        if ($roleSchema !== null && isset($roleSchema->columns['id_customer_type']) && !isset($roleSchema->columns['id_user_role'])) {
            $this->renameColumn($newRoleTable, 'id_customer_type', 'id_user_role');
        }

        if ($customerSchema !== null && isset($customerSchema->columns['id_customer_type']) && !isset($customerSchema->columns['id_user_role'])) {
            $this->renameColumn($customerTable, 'id_customer_type', 'id_user_role');
        }

        if ($this->db->schema->getTableSchema($legacyPermissionMap, true) !== null && $this->db->schema->getTableSchema($newPermissionMap, true) === null) {
            $this->dropForeignKey('fk-customer-type-permission-permission', $legacyPermissionMap);
            $this->dropForeignKey('fk-customer-type-permission-role', $legacyPermissionMap);
            $this->renameTable($legacyPermissionMap, $newPermissionMap);
        }

        $permissionSchema = $this->db->schema->getTableSchema($newPermissionMap, true);
        if ($permissionSchema !== null && isset($permissionSchema->columns['customer_type_id']) && !isset($permissionSchema->columns['user_role_id'])) {
            $this->renameColumn($newPermissionMap, 'customer_type_id', 'user_role_id');
        }

        if ($permissionSchema !== null) {
            if ($this->indexExists($newPermissionMap, 'idx-customer-type-permission-unique')) {
                $this->dropIndex('idx-customer-type-permission-unique', $newPermissionMap);
            }
            if (!$this->indexExists($newPermissionMap, 'idx-user-role-permission-unique')) {
                $this->createIndex('idx-user-role-permission-unique', $newPermissionMap, ['user_role_id', 'permission_id'], true);
            }
            $this->addForeignKey('fk-user-role-permission-role', $newPermissionMap, 'user_role_id', $newRoleTable, 'id_user_role', 'CASCADE', 'CASCADE');
            $this->addForeignKey('fk-user-role-permission-permission', $newPermissionMap, 'permission_id', '{{%permission}}', 'id', 'CASCADE', 'CASCADE');
        }

        if ($this->db->schema->getTableSchema('{{%role_permission}}', true) !== null) {
            $this->dropTable('{{%role_permission}}');
        }
        if ($this->db->schema->getTableSchema('{{%role}}', true) !== null) {
            $this->dropTable('{{%role}}');
        }
    }

    public function safeDown()
    {
        return false;
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $resolvedTable = $this->db->schema->getRawTableName($table);
        $query = 'SHOW INDEX FROM ' . $this->db->quoteTableName($resolvedTable) . ' WHERE Key_name = :indexName';
        return (bool)$this->db->createCommand($query, [':indexName' => $indexName])->queryOne();
    }
}
