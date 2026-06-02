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
    'categoryImagePath' => 'http://localhost/w2/backend/category/',
    'expenseImagePath' => 'http://localhost/w2/backend/expenses/',
    'userImagePath' => 'http://localhost/w2/backend/users/', //  Yii::$app->params['categoryImagePath']
    'cardImagePath' => 'http://localhost/w2/backend/cards/'
];
