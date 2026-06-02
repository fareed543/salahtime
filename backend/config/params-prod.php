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
    'adminEmail' => 'info@walletplus.in',
    'senderEmail' => 'info@walletplus.in',
    'senderName' => 'Wallet Plus',
    'address' => 'address',
    'phone' => 'phone',
    'categoryImagePath' => 'https://walletplus.in/category/',
    'expenseImagePath' => 'https://walletplus.in/expenses/',
    'userImagePath' => 'https://walletplus.in/users/', //  Yii::$app->params['categoryImagePath']
    'cardImagePath' => 'https://walletplus.in/cards/'
];
