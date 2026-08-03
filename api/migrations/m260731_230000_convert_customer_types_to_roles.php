<?php

use yii\db\Migration;

class m260731_230000_convert_customer_types_to_roles extends Migration
{
    public function safeUp()
    {
        $customerTypeTable = '{{%customer_type}}';
        $customerSchema = $this->db->schema->getTableSchema('{{%customer}}', true);
        $roleSchema = $this->db->schema->getTableSchema('{{%role}}', true);

        // Legacy dumps already upgraded to the final role schema should not be converted back.
        if ($roleSchema !== null && $customerSchema !== null && isset($customerSchema->columns['id_role'])) {
            return;
        }

        if ($this->db->schema->getTableSchema($customerTypeTable, true) === null) {
            return;
        }

        $schema = $this->db->schema->getTableSchema($customerTypeTable, true);

        if (!isset($schema->columns['code'])) {
            $this->addColumn($customerTypeTable, 'code', $this->string(255)->null()->after('name'));
        }

        if (!isset($schema->columns['description'])) {
            $this->addColumn($customerTypeTable, 'description', $this->text()->null()->after('code'));
        }

        if (!isset($schema->columns['is_system'])) {
            $this->addColumn($customerTypeTable, 'is_system', $this->boolean()->notNull()->defaultValue(0)->after('status'));
        }

        if (!isset($schema->columns['created_at'])) {
            $this->addColumn($customerTypeTable, 'created_at', $this->dateTime()->null()->after('is_system'));
        }

        if (!isset($schema->columns['updated_at'])) {
            $this->addColumn($customerTypeTable, 'updated_at', $this->dateTime()->null()->after('created_at'));
        }

        $this->execute("
            UPDATE {$customerTypeTable}
            SET code = CASE id_customer_type
                WHEN 1 THEN 'administrator'
                WHEN 2 THEN 'manager'
                WHEN 3 THEN 'users'
                WHEN 4 THEN 'support'
                WHEN 5 THEN 'restricted-user'
                ELSE LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(REPLACE(REPLACE(COALESCE(name, ''), '&', 'and'), ' ', '-'), '[^a-z0-9-]+', '-')))
            END
            WHERE code IS NULL OR code = ''
        ");

        $this->execute("
            UPDATE {$customerTypeTable}
            SET description = CASE id_customer_type
                WHEN 1 THEN 'Full back office access.'
                WHEN 2 THEN 'Operations and user management access.'
                WHEN 3 THEN 'General user operations access.'
                WHEN 4 THEN 'Support access for day-to-day follow-up.'
                WHEN 5 THEN 'Restricted visibility access.'
                ELSE description
            END
            WHERE description IS NULL OR description = ''
        ");

        $this->execute("
            UPDATE {$customerTypeTable}
            SET is_system = CASE
                WHEN id_customer_type IN (1, 2, 3, 4, 5) THEN 1
                ELSE COALESCE(is_system, 0)
            END
        ");

        $this->createIndex('idx-customer-type-code-unique', $customerTypeTable, 'code', true);

        if ($this->db->schema->getTableSchema('{{%customer_type_permission}}', true) === null) {
            $this->createTable('{{%customer_type_permission}}', [
                'id' => $this->primaryKey(),
                'customer_type_id' => $this->integer()->notNull(),
                'permission_id' => $this->integer()->notNull(),
                'created_at' => $this->dateTime()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            ]);
            $this->createIndex('idx-customer-type-permission-unique', '{{%customer_type_permission}}', ['customer_type_id', 'permission_id'], true);
            $this->addForeignKey('fk-customer-type-permission-role', '{{%customer_type_permission}}', 'customer_type_id', $customerTypeTable, 'id_customer_type', 'CASCADE', 'CASCADE');
            $this->addForeignKey('fk-customer-type-permission-permission', '{{%customer_type_permission}}', 'permission_id', '{{%permission}}', 'id', 'CASCADE', 'CASCADE');
        }

        if ($this->db->schema->getTableSchema('{{%role}}', true) !== null && $this->db->schema->getTableSchema('{{%role_permission}}', true) !== null) {
            $this->execute("
                INSERT IGNORE INTO {{%customer_type_permission}} (customer_type_id, permission_id, created_at)
                SELECT ct.id_customer_type, rp.permission_id, CURRENT_TIMESTAMP
                FROM {{%role_permission}} rp
                INNER JOIN {{%role}} r ON r.id = rp.role_id
                INNER JOIN {$customerTypeTable} ct ON ct.code = r.code
            ");
        }

        if ($this->db->schema->getTableSchema('{{%customer_type_permission}}', true) !== null && $this->db->schema->getTableSchema('{{%permission}}', true) !== null) {
            $this->execute("
                INSERT IGNORE INTO {{%customer_type_permission}} (customer_type_id, permission_id, created_at)
                SELECT ct.id_customer_type, p.id, CURRENT_TIMESTAMP
                FROM {$customerTypeTable} ct
                INNER JOIN {{%permission}} p
                    ON (
                        (ct.code = 'administrator')
                        OR (ct.code = 'manager' AND p.code IN ('dashboard.view', 'users.manage', 'users.view', 'calendar.manage', 'notifications.manage'))
                        OR (ct.code IN ('users', 'support', 'restricted-user') AND p.code IN ('dashboard.view'))
                        OR (ct.code = 'developer' AND p.code IN ('dashboard.view', 'app-versions.manage', 'menu.manage'))
                    )
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM {{%customer_type_permission}} ctp
                    WHERE ctp.customer_type_id = ct.id_customer_type
                      AND ctp.permission_id = p.id
                )
            ");
        }

        if ($this->db->schema->getTableSchema('{{%user_role}}', true) !== null) {
            $this->dropTable('{{%user_role}}');
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
        if ($this->db->schema->getTableSchema('{{%customer_type_permission}}', true) !== null) {
            $this->dropForeignKey('fk-customer-type-permission-permission', '{{%customer_type_permission}}');
            $this->dropForeignKey('fk-customer-type-permission-role', '{{%customer_type_permission}}');
            $this->dropTable('{{%customer_type_permission}}');
        }

        $customerTypeTable = '{{%customer_type}}';
        $schema = $this->db->schema->getTableSchema($customerTypeTable, true);
        if ($schema !== null) {
            if (isset($schema->columns['updated_at'])) {
                $this->dropColumn($customerTypeTable, 'updated_at');
            }
            if (isset($schema->columns['created_at'])) {
                $this->dropColumn($customerTypeTable, 'created_at');
            }
            if (isset($schema->columns['is_system'])) {
                $this->dropColumn($customerTypeTable, 'is_system');
            }
            if (isset($schema->columns['description'])) {
                $this->dropColumn($customerTypeTable, 'description');
            }
            if (isset($schema->columns['code'])) {
                $this->dropIndex('idx-customer-type-code-unique', $customerTypeTable);
                $this->dropColumn($customerTypeTable, 'code');
            }
        }
    }
}
