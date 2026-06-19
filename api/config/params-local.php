<?php

return [
    // 'allowedOrigins' => ['http://localhost:4200', 'http://secure.walletplus.in', 'http://walletplus.in','http://app.walletplus.in'],
    // 'corsAllowCredentials' => true,
    'allowedOrigins' => ['*'],
    'corsAllowCredentials' => false,
    'productionMode' => false, 
    'adminEmail' => 'contact@salah-times.in',
    'senderEmail' => 'contact@salah-times.in',
    'senderName' => 'Salah Time',
    'frontendUrl' => 'http://localhost:4200',
    'googleClientId' => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
    'googleClientSecret' => $_ENV['GOOGLE_CLIENT_SECRET'] ?? '',
    'facebookClientId' => $_ENV['FACEBOOK_CLIENT_ID'] ?? '',
    'facebookClientSecret' => $_ENV['FACEBOOK_CLIENT_SECRET'] ?? '',
    'facebookGraphVersion' => $_ENV['FACEBOOK_GRAPH_VERSION'] ?? 'v20.0',
    'socialAuthStateKey' => $_ENV['SOCIAL_AUTH_STATE_KEY'] ?? '',
    'address' => 'address',
    'phone' => 'phone',
    'categoryImagePath' => 'http://localhost/salah-time/api/category/',
    'expenseImagePath' => 'http://localhost/salah-time/api/expenses/',
    'userImagePath' => 'http://localhost/salah-time/api/users/', //  Yii::$app->params['categoryImagePath']
    'cardImagePath' => 'http://localhost/salah-time/api/cards/'
];
