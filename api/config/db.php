<?php

$environment = $_ENV['YII_ENV'] ?? 'local';

$dbMap = [
    'local' => [
        'host' => 'localhost',
        'name' => 'salahtime',
        'username' => 'root',
        'password' => '',
    ],
    'dev' => [
        'host' => 'localhost',
        'name' => 'u596948110_dev_salahtime',
        'username' => 'u596948110_dev_salahtime',
        'password' => 'W7Hd6+/x3T#',
    ],
    'prod' => [
        'host' => 'localhost',
        'name' => 'u596948110_prod_salahtime',
        'username' => 'u596948110_prod_salahtime',
        'password' => 'e?#ZS5Tj?',
    ],
];

$selectedDb = $dbMap[$environment] ?? $dbMap['local'];

return [
    'class' => 'yii\db\Connection',
    'dsn' => sprintf(
        'mysql:host=%s;dbname=%s',
        $selectedDb['host'],
        $selectedDb['name']
    ),
    'username' => $selectedDb['username'],
    'password' => $selectedDb['password'],
    'charset' => 'utf8',
    'tablePrefix' => 'bt_'

    // Schema cache options (for production environment)
    //'enableSchemaCache' => true,
    //'schemaCacheDuration' => 60,
    //'schemaCache' => 'cache',
];
