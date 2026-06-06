<?php

return [
    // 'allowedOrigins' => ['http://localhost:4200', 'http://secure.walletplus.in', 'http://walletplus.in','http://app.walletplus.in'],
    // 'corsAllowCredentials' => true,
    'allowedOrigins' => ['*'],
    'corsAllowCredentials' => false,
    'productionMode' => false, 
    'adminEmail' => 'info@walletplus.in',
    'senderEmail' => 'info@walletplus.in',
    'senderName' => 'Wallet Plus',
    'address' => 'address',
    'phone' => 'phone',
    'categoryImagePath' => 'http://localhost/salah-time/api/category/',
    'expenseImagePath' => 'http://localhost/salah-time/api/expenses/',
    'userImagePath' => 'http://localhost/salah-time/api/users/', //  Yii::$app->params['categoryImagePath']
    'cardImagePath' => 'http://localhost/salah-time/api/cards/'
];
