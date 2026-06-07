<?php

use yii\db\Migration;

class m260607_140000_seed_walletplus_community_data extends Migration
{
    private const SOURCE_DB_ENV = 'WALLETPLUS_IMPORT_DB';
    private const DEFAULT_SOURCE_DB = 'walletplus_import';

    private function sourceDb(): string
    {
        return getenv(self::SOURCE_DB_ENV) ?: self::DEFAULT_SOURCE_DB;
    }

    private function sourceTableExists(string $sourceDb, string $table): bool
    {
        $query = (new \yii\db\Query())
            ->from('information_schema.TABLES')
            ->where([
                'TABLE_SCHEMA' => $sourceDb,
                'TABLE_NAME' => $table,
            ]);

        return $query->exists($this->db);
    }

    private function targetTableExists(string $table): bool
    {
        return $this->db->getTableSchema($table, true) !== null;
    }

    private function ensureSourceDatabaseExists(string $sourceDb): void
    {
        $exists = (new \yii\db\Query())
            ->from('information_schema.SCHEMATA')
            ->where(['SCHEMA_NAME' => $sourceDb])
            ->exists($this->db);

        if (!$exists) {
            throw new \RuntimeException("Source database '{$sourceDb}' does not exist. Import the Wallet Plus dump there first.");
        }
    }

    private function copyTable(string $sourceDb, string $table, array $columns): void
    {
        if (!$this->sourceTableExists($sourceDb, $table)) {
            echo "Skipping {$table}: source table not found in {$sourceDb}.\n";
            return;
        }

        $columnList = implode(', ', $columns);
        if ($table === 'bt_customer') {
            $selectColumns = [];
            foreach ($columns as $column) {
                $selectColumns[] = $column === 'active' ? '1 AS active' : $column;
            }
            $selectList = implode(', ', $selectColumns);
            $this->execute("INSERT INTO {$table} ({$columnList}) SELECT {$selectList} FROM {$sourceDb}.{$table}");
            return;
        }

        $this->execute("INSERT INTO {$table} ({$columnList}) SELECT {$columnList} FROM {$sourceDb}.{$table}");
    }

    public function safeUp()
    {
        $sourceDb = $this->sourceDb();
        $this->ensureSourceDatabaseExists($sourceDb);

        $communityTables = [
            'bt_customer_type' => ['id_customer_type', 'name', 'status'],
            'bt_customer' => [
                'id', 'id_customer_type', 'firstname', 'lastname', 'gender', 'date_of_birth',
                'username', 'image', 'email', 'password', 'otp', 'phone',
                'email_verification_code', 'email_verified', 'mobile_verification_code',
                'mobile_verified', 'ipaddress', 'authKey', 'date_created', 'created_by',
                'updated_by', 'date_updated', 'active', 'offline_access', 'email_notification',
                'address', 'pincode', 'masjid', 'landmark', 'street', 'notes',
                'occupation', 'designation', 'college_name', 'company_name',
            ],
            'bt_halqa' => ['id', 'name', 'address', 'description', 'city', 'state', 'country', 'id_customer', 'status', 'created_at', 'updated_at'],
            'bt_masjid' => ['id', 'name', 'address', 'area', 'city', 'state', 'pincode', 'country', 'status', 'id_customer', 'id_halqa', 'created_at', 'updated_at'],
            'bt_halqa_masjid' => ['id', 'id_halqa', 'id_masjid'],
            'bt_program' => ['id', 'id_customer', 'id_halqa', 'name', 'code', 'start_date', 'end_date', 'contact_number', 'email', 'registration_allowed', 'max_participants', 'waitlist_enabled', 'description', 'status', 'created_at'],
            'bt_program_customer' => ['id', 'role', 'id_program', 'id_customer', 'created_at'],
            'bt_member' => ['id_member', 'firstname', 'lastname', 'phone_number', 'id_customer', 'date_created', 'date_updated', 'email', 'birthday', 'address', 'notes', 'photo', 'document', 'halka', 'masjid'],
            'bt_subscriber_packets' => ['id', 'id_program', 'token', 'id_customer', 'date', 'packets', 'created_at', 'updated_at'],
            'bt_ramadan_sehri_subscription' => ['id', 'id_customer', 'date', 'opt', 'created_at'],
        ];

        $this->execute('SET FOREIGN_KEY_CHECKS = 0');

        $truncateOrder = [
            'bt_program_customer',
            'bt_subscriber_packets',
            'bt_member',
            'bt_halqa_masjid',
            'bt_program',
            'bt_masjid',
            'bt_halqa',
            'bt_ramadan_sehri_subscription',
            'bt_customer',
            'bt_customer_type',
        ];

        foreach ($truncateOrder as $table) {
            if ($this->targetTableExists($table)) {
                $this->truncateTable($table);
            }
        }

        foreach ($communityTables as $table => $columns) {
            $this->copyTable($sourceDb, $table, $columns);
        }

        $this->execute('SET FOREIGN_KEY_CHECKS = 1');
    }

    public function safeDown()
    {
        $this->execute('SET FOREIGN_KEY_CHECKS = 0');

        foreach ([
            'bt_program_customer',
            'bt_subscriber_packets',
            'bt_member',
            'bt_halqa_masjid',
            'bt_program',
            'bt_masjid',
            'bt_halqa',
            'bt_ramadan_sehri_subscription',
            'bt_customer',
            'bt_customer_type',
        ] as $table) {
            if ($this->targetTableExists($table)) {
                $this->truncateTable($table);
            }
        }

        $this->execute('SET FOREIGN_KEY_CHECKS = 1');
    }
}
