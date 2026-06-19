<?php

return [
    // 'allowedOrigins' => [
    //     'http://localhost:4200',
    //     'http://walletplus.in', 
    //     'https://walletplus.in', 
    //     'https://app.walletplus.in',
    //     'http://app.walletplus.in', 
    //     'http://secure.walletplus.in',
    //     'https://secure.walletplus.in',
    //     'https://d7hdbmtfkygf8.cloudfront.net',
    //     'capacitor-electron://-'
    // ],
    // 'corsAllowCredentials' => true,
    'allowedOrigins' => ['*'],
    'corsAllowCredentials' => false,
    'productionMode' => true, 
    'adminEmail' => 'contact@salah-times.in',
    'senderEmail' => 'contact@salah-times.in',
    'senderName' => 'Salah Time',
    'frontendUrl' => 'https://salah-times.in',
    'googleClientId' => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
    'googleClientSecret' => $_ENV['GOOGLE_CLIENT_SECRET'] ?? '',
    'facebookClientId' => $_ENV['FACEBOOK_CLIENT_ID'] ?? '',
    'facebookClientSecret' => $_ENV['FACEBOOK_CLIENT_SECRET'] ?? '',
    'facebookGraphVersion' => $_ENV['FACEBOOK_GRAPH_VERSION'] ?? 'v20.0',
    'socialAuthStateKey' => $_ENV['SOCIAL_AUTH_STATE_KEY'] ?? '',
    'address' => 'address',
    'phone' => 'phone',
    'categoryImagePath' => 'https://api.salah-times.in/category/',
    'expenseImagePath' => 'https://api.salah-times.in/expenses/',
    'userImagePath' => 'https://api.salah-times.in/users/', //  Yii::$app->params['categoryImagePath']
    'cardImagePath' => 'https://api.salah-times.in/cards/'
];
