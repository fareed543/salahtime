<?php

use yii\db\Migration;

class m260731_180000_create_backoffice_role_permission_tables extends Migration
{
    public function safeUp()
    {
        $this->ensureRoleTable();
        $this->seedRoles();

        $this->ensurePermissionTable();
        $this->seedPermissions();

        $this->ensureRolePermissionTable();
        $this->seedRolePermissions();

        $this->ensureUserRoleTable();
        $this->backfillLegacyUserRoleAssignments();
    }

    public function safeDown()
    {
        if ($this->foreignKeyExists('{{%user_role}}', 'fk-user-role-role')) {
            $this->dropForeignKey('fk-user-role-role', '{{%user_role}}');
        }
        if ($this->foreignKeyExists('{{%user_role}}', 'fk-user-role-customer')) {
            $this->dropForeignKey('fk-user-role-customer', '{{%user_role}}');
        }
        if ($this->foreignKeyExists('{{%role_permission}}', 'fk-role-permission-permission')) {
            $this->dropForeignKey('fk-role-permission-permission', '{{%role_permission}}');
        }
        if ($this->foreignKeyExists('{{%role_permission}}', 'fk-role-permission-role')) {
            $this->dropForeignKey('fk-role-permission-role', '{{%role_permission}}');
        }

        if ($this->tableExists('{{%user_role}}')) {
            $this->dropTable('{{%user_role}}');
        }
        if ($this->tableExists('{{%role_permission}}')) {
            $this->dropTable('{{%role_permission}}');
        }
        if ($this->tableExists('{{%permission}}')) {
            $this->dropTable('{{%permission}}');
        }
        if ($this->tableExists('{{%role}}')) {
            $this->dropTable('{{%role}}');
        }
    }

    private function ensureRoleTable(): void
    {
        if ($this->tableExists('{{%role}}')) {
            return;
        }

        $this->createTable('{{%role}}', [
            'id' => $this->primaryKey(),
            'name' => $this->string(191)->notNull(),
            'code' => $this->string(191)->notNull(),
            'description' => $this->text()->null(),
            'status' => $this->boolean()->notNull()->defaultValue(1),
            'is_system' => $this->boolean()->notNull()->defaultValue(0),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        $this->createIndex('idx-role-code-unique', '{{%role}}', 'code', true);
    }

    private function seedRoles(): void
    {
        $defaults = [
            1 => ['Administrator', 'administrator', 'Full back office access.'],
            2 => ['Manager', 'manager', 'Operations and user management access.'],
            3 => ['Users', 'users', 'General user operations access.'],
            4 => ['Support', 'support', 'Support access for day-to-day follow-up.'],
            5 => ['Restricted User', 'restricted-user', 'Restricted visibility access.'],
            6 => ['Developer', 'developer', 'Developer and configuration access.'],
            7 => ['Subscriber', 'subscriber', 'Subscriber access.'],
            8 => ['Organizer', 'organizer', 'Organizer access.'],
        ];

        foreach ($defaults as $id => [$name, $code, $description]) {
            $this->upsert('{{%role}}', ['id' => $id], [
                'name' => $name,
                'code' => $code,
                'description' => $description,
                'status' => 1,
                'is_system' => 1,
                'updated_at' => new \yii\db\Expression('CURRENT_TIMESTAMP'),
            ]);
        }

        if (!$this->tableExists('{{%customer_type}}')) {
            return;
        }

        $rows = (new \yii\db\Query())
            ->from('{{%customer_type}}')
            ->orderBy(['id_customer_type' => SORT_ASC])
            ->all($this->db);

        foreach ($rows as $row) {
            $roleId = (int)($row['id_customer_type'] ?? 0);
            if ($roleId <= 0) {
                continue;
            }

            $name = trim((string)($row['name'] ?? ''));
            if ($name === '') {
                $name = $defaults[$roleId][0] ?? ('Role ' . $roleId);
            }

            $code = $defaults[$roleId][1] ?? $this->normalizeCode($name);
            $description = $defaults[$roleId][2] ?? $name;

            $this->upsert('{{%role}}', ['id' => $roleId], [
                'name' => $name,
                'code' => $code,
                'description' => $description,
                'status' => (int)($row['status'] ?? 1) ?: 1,
                'is_system' => isset($defaults[$roleId]) ? 1 : 0,
                'updated_at' => new \yii\db\Expression('CURRENT_TIMESTAMP'),
            ]);
        }
    }

    private function ensurePermissionTable(): void
    {
        if ($this->tableExists('{{%permission}}')) {
            return;
        }

        $this->createTable('{{%permission}}', [
            'id' => $this->primaryKey(),
            'name' => $this->string(191)->notNull(),
            'code' => $this->string(191)->notNull(),
            'group_key' => $this->string(191)->null(),
            'description' => $this->text()->null(),
            'status' => $this->boolean()->notNull()->defaultValue(1),
            'is_system' => $this->boolean()->notNull()->defaultValue(0),
            'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        $this->createIndex('idx-permission-code-unique', '{{%permission}}', 'code', true);
    }

    private function seedPermissions(): void
    {
        $permissions = [
            ['View Dashboard', 'dashboard.view', 'dashboard', 'Access dashboard view.'],
            ['Manage Users', 'users.manage', 'users', 'Create, edit, and delete users.'],
            ['View Users', 'users.view', 'users', 'View user records.'],
            ['Manage Roles', 'roles.manage', 'roles', 'Create, edit, and delete roles.'],
            ['View Roles', 'roles.view', 'roles', 'View roles.'],
            ['Manage Permissions', 'permissions.manage', 'permissions', 'Create, edit, and delete permissions.'],
            ['View Permissions', 'permissions.view', 'permissions', 'View permissions.'],
            ['Manage Calendar', 'calendar.manage', 'calendar', 'Maintain calendar data.'],
            ['Manage App Versions', 'app-versions.manage', 'app-versions', 'Maintain app versions.'],
            ['Manage Notifications', 'notifications.manage', 'notifications', 'Create and publish notifications.'],
            ['Manage Menu', 'menu.manage', 'developer', 'Maintain menu configuration.'],
        ];

        foreach ($permissions as [$name, $code, $groupKey, $description]) {
            $this->upsert('{{%permission}}', ['code' => $code], [
                'name' => $name,
                'group_key' => $groupKey,
                'description' => $description,
                'status' => 1,
                'is_system' => 1,
                'updated_at' => new \yii\db\Expression('CURRENT_TIMESTAMP'),
            ]);
        }
    }

    private function ensureRolePermissionTable(): void
    {
        if (!$this->tableExists('{{%role_permission}}')) {
            $this->createTable('{{%role_permission}}', [
                'id' => $this->primaryKey(),
                'role_id' => $this->integer()->notNull(),
                'permission_id' => $this->integer()->notNull(),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ]);
        }

        if (!$this->indexExists('{{%role_permission}}', 'idx-role-permission-unique')) {
            $this->createIndex('idx-role-permission-unique', '{{%role_permission}}', ['role_id', 'permission_id'], true);
        }

        if (!$this->foreignKeyExists('{{%role_permission}}', 'fk-role-permission-role')) {
            $this->addForeignKey('fk-role-permission-role', '{{%role_permission}}', 'role_id', '{{%role}}', 'id', 'CASCADE', 'CASCADE');
        }

        if (!$this->foreignKeyExists('{{%role_permission}}', 'fk-role-permission-permission')) {
            $this->addForeignKey('fk-role-permission-permission', '{{%role_permission}}', 'permission_id', '{{%permission}}', 'id', 'CASCADE', 'CASCADE');
        }
    }

    private function seedRolePermissions(): void
    {
        $permissionIds = (new \yii\db\Query())
            ->from('{{%permission}}')
            ->select(['id', 'code'])
            ->indexBy('code')
            ->all($this->db);

        $roleIds = (new \yii\db\Query())
            ->from('{{%role}}')
            ->select(['id', 'code'])
            ->indexBy('code')
            ->all($this->db);

        $map = [
            'administrator' => array_keys($permissionIds),
            'manager' => ['dashboard.view', 'users.manage', 'users.view', 'calendar.manage', 'notifications.manage'],
            'users' => ['dashboard.view'],
            'support' => ['dashboard.view'],
            'restricted-user' => ['dashboard.view'],
            'developer' => ['dashboard.view', 'app-versions.manage', 'menu.manage'],
        ];

        foreach ($map as $roleCode => $permissionCodes) {
            $roleId = (int)($roleIds[$roleCode]['id'] ?? 0);
            if ($roleId <= 0) {
                continue;
            }

            foreach ($permissionCodes as $permissionCode) {
                $permissionId = (int)($permissionIds[$permissionCode]['id'] ?? 0);
                if ($permissionId <= 0) {
                    continue;
                }

                $this->upsert('{{%role_permission}}', [
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                ], [
                    'created_at' => new \yii\db\Expression('CURRENT_TIMESTAMP'),
                ]);
            }
        }
    }

    private function ensureUserRoleTable(): void
    {
        if (!$this->tableExists('{{%user_role}}')) {
            $this->createTable('{{%user_role}}', [
                'id' => $this->primaryKey(),
                'customer_id' => $this->integer()->notNull(),
                'role_id' => $this->integer()->notNull(),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ]);
        }

        if (!$this->indexExists('{{%user_role}}', 'idx-user-role-unique')) {
            $this->createIndex('idx-user-role-unique', '{{%user_role}}', ['customer_id', 'role_id'], true);
        }

        if ($this->tableExists('{{%customer}}') && !$this->foreignKeyExists('{{%user_role}}', 'fk-user-role-customer')) {
            $this->addForeignKey('fk-user-role-customer', '{{%user_role}}', 'customer_id', '{{%customer}}', 'id', 'CASCADE', 'CASCADE');
        }

        if (!$this->foreignKeyExists('{{%user_role}}', 'fk-user-role-role')) {
            $this->addForeignKey('fk-user-role-role', '{{%user_role}}', 'role_id', '{{%role}}', 'id', 'CASCADE', 'CASCADE');
        }
    }

    private function backfillLegacyUserRoleAssignments(): void
    {
        $customerSchema = $this->db->schema->getTableSchema('{{%customer}}', true);
        if ($customerSchema === null) {
            return;
        }

        $roleColumn = null;
        if (isset($customerSchema->columns['id_role'])) {
            $roleColumn = 'id_role';
        } elseif (isset($customerSchema->columns['id_user_role'])) {
            $roleColumn = 'id_user_role';
        } elseif (isset($customerSchema->columns['id_customer_type'])) {
            $roleColumn = 'id_customer_type';
        }

        if ($roleColumn === null) {
            return;
        }

        $conditions = ["customer.`{$roleColumn}` IS NOT NULL", "customer.`{$roleColumn}` > 0"];
        if (isset($customerSchema->columns['deleted'])) {
            $conditions[] = 'customer.deleted = 0';
        }

        $this->execute(sprintf(
            'INSERT IGNORE INTO {{%%user_role}} (customer_id, role_id, created_at)
             SELECT customer.id, customer.`%s`, CURRENT_TIMESTAMP
             FROM {{%%customer}} customer
             WHERE %s',
            $roleColumn,
            implode(' AND ', $conditions)
        ));
    }

    private function normalizeCode(string $name): string
    {
        $normalized = strtolower(trim($name));
        $normalized = str_replace('&', 'and', $normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?: '';
        return trim($normalized, '-');
    }

    private function tableExists(string $table): bool
    {
        return $this->db->schema->getTableSchema($table, true) !== null;
    }

    private function indexExists(string $table, string $indexName): bool
    {
        if (!$this->tableExists($table)) {
            return false;
        }

        $resolvedTable = $this->db->schema->getRawTableName($table);
        $query = 'SHOW INDEX FROM ' . $this->db->quoteTableName($resolvedTable) . ' WHERE Key_name = :indexName';
        return (bool)$this->db->createCommand($query, [':indexName' => $indexName])->queryOne();
    }

    private function foreignKeyExists(string $table, string $foreignKeyName): bool
    {
        if (!$this->tableExists($table)) {
            return false;
        }

        $resolvedTable = $this->db->schema->getRawTableName($table);
        $query = "
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE()
              AND TABLE_NAME = :tableName
              AND CONSTRAINT_NAME = :constraintName
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ";

        return (bool)$this->db->createCommand($query, [
            ':tableName' => $resolvedTable,
            ':constraintName' => $foreignKeyName,
        ])->queryOne();
    }
}
