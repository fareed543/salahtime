<?php

require __DIR__ . '/../vendor/autoload.php';
use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$environment = $_ENV['YII_ENV'] ?? 'local';
$paramsFile = __DIR__ . '/params-local.php';
if ($environment === 'prod') {
    $paramsFile = __DIR__ . '/params-prod.php';
} elseif ($environment === 'dev') {
    $paramsFile = __DIR__ . '/params-dev.php';
}
$params = require $paramsFile;

$mailer = [
    'class' => 'yii\swiftmailer\Mailer',
    'useFileTransport' => true,
];

$db = require __DIR__ . '/db.php';
use \yii\web\Request;
$baseUrl = str_replace('/web', '', (new Request)->getBaseUrl());

$config = [
    'name' => 'Wallet Plus',
    'id' => 'basic',
    'basePath' => dirname(__DIR__),
    'bootstrap' => ['log'],
    'timeZone' => 'Asia/Kolkata',
    //    Enable for HTTPS
    //    'on beforeRequest' => function ($event) {
    //        if(!Yii::$app->request->isSecureConnection){
    //            $url = Yii::$app->request->getAbsoluteUrl();
    //            $url = str_replace('http:', 'https:', $url);
    //            Yii::$app->getResponse()->redirect($url);
    //            Yii::$app->end();
    //        }
    //    },
    
    'aliases' => [
        '@bower' => '@vendor/bower-asset',
        '@npm'   => '@vendor/npm-asset',
    ],
    'components' => [
        'request' => [
            // !!! insert a secret key in the following (if it is empty) - this is required by cookie validation
            'cookieValidationKey' => 'ibe1aX7XjGmKEiO09cqEsvIkluQlIo1_',
            'baseUrl' => $baseUrl,
            'parsers' => [
                'application/json' => 'yii\web\JsonParser',
            ],
        ],
        'cache' => [
            'class' => 'yii\caching\FileCache',
        ],
        'user' => [
            'identityClass' => 'app\models\Customer',
            'enableAutoLogin' => false,
            'enableSession' => false,
        ],
        'mailer' => $mailer,
        'log' => [
            'traceLevel' => YII_DEBUG ? 3 : 0,
            'targets' => [
                [
                    'class' => 'yii\log\FileTarget',
                    'levels' => ['error', 'warning'],
                ],
            ],
        ],
        'db' => $db,
        /*
        'urlManager' => [
            'enablePrettyUrl' => true,
            'showScriptName' => false,
            'rules' => [
            ],
        ],
        */
        'urlManager' => [
            'class' => 'yii\web\UrlManager',
            // Disable index.php
            'showScriptName' => false,
            // Disable r= routes
            'enablePrettyUrl' => true,
            'rules' => array(
                    '<controller:\w+>/<id:\d+>' => '<controller>/view',
                    '<controller:\w+>/<action:\w+>/<id:\d+>' => '<controller>/<action>',
                    '<controller:\w+>/<action:\w+>' => '<controller>/<action>',
            ),
        ],
        'formatter' => [
            'dateFormat' => 'php:d/m/Y',
            'datetimeFormat' => 'php:d/m/Y H:i:s',
            'timeFormat' => 'php:H:i:s',
            'decimalSeparator' => '.',
            'thousandSeparator' => ',',
            'currencyCode' => 'INR',
        ],
    ],
    'params' => $params,
];

if (YII_ENV_DEV) {
    // configuration adjustments for 'dev' environment
    $config['bootstrap'][] = 'debug';
    $config['modules']['debug'] = [
        'class' => 'yii\debug\Module',
        // uncomment the following to add your IP if you are not connecting from localhost.
        //'allowedIPs' => ['127.0.0.1', '::1'],
    ];

    $config['bootstrap'][] = 'gii';
    $config['modules']['gii'] = [
        'class' => 'yii\gii\Module',
        // uncomment the following to add your IP if you are not connecting from localhost.
        //'allowedIPs' => ['127.0.0.1', '::1'],
    ];
}

return $config;
