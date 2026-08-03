<?php

use yii\db\Migration;

class m260801_140000_finalize_customer_role_schema extends Migration
{
    public function safeUp()
    {
        $customerTable = '{{%customer}}';
        $roleTable = '{{%role}}';
        $legacyUserRoleTable = '{{%user_role}}';

        $customerSchema = $this->db->schema->getTableSchema($customerTable, true);
        if ($customerSchema === null) {
            return;
        }

        if (!isset($customerSchema->columns['id_role'])) {
            if (isset($customerSchema->columns['id_user_role'])) {
                $this->renameColumn($customerTable, 'id_user_role', 'id_role');
            } elseif (isset($customerSchema->columns['id_customer_type'])) {
                $this->renameColumn($customerTable, 'id_customer_type', 'id_role');
            } else {
                $this->addColumn($customerTable, 'id_role', $this->integer()->notNull()->defaultValue(3)->after('id'));
            }
        }

        $customerSchema = $this->db->schema->getTableSchema($customerTable, true);
        $legacyUserRoleSchema = $this->db->schema->getTableSchema($legacyUserRoleTable, true);
        if ($legacyUserRoleSchema !== null
            && isset($legacyUserRoleSchema->columns['customer_id'])
            && isset($legacyUserRoleSchema->columns['role_id'])
            && isset($customerSchema->columns['id_role'])) {
            $this->execute("
                UPDATE {$customerTable} customer
                INNER JOIN {$legacyUserRoleTable} userRole ON userRole.customer_id = customer.id
                SET customer.id_role = userRole.role_id
                WHERE customer.id_role IS NULL OR customer.id_role = 0
            ");
        }

        if ($this->db->schema->getTableSchema($roleTable, true) !== null) {
            if (!$this->indexExists($customerTable, 'idx-customer-id-role')) {
                $this->createIndex('idx-customer-id-role', $customerTable, 'id_role');
            }

            if (!$this->foreignKeyExists($customerTable, 'fk-customer-role')) {
                $this->addForeignKey('fk-customer-role', $customerTable, 'id_role', $roleTable, 'id', 'RESTRICT', 'CASCADE');
            }
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

    private function foreignKeyExists(string $table, string $foreignKeyName): bool
    {
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
