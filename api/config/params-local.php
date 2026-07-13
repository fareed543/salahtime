<?php

return [
    'allowedOrigins' => [
        'http://localhost:4200',
        'http://localhost:4201',
        'https://salah-times.in',
        'https://www.salah-times.in',
        'https://backoffice.salah-times.in',
        'https://api.salah-times.in',
    ],
    'corsAllowCredentials' => false,
    'productionMode' => false, 
    'adminEmail' => 'contact@salah-times.in',
    'senderEmail' => 'contact@salah-times.in',
    'senderName' => 'Salah Time',
    'frontendUrl' => 'http://localhost:4200',
    'googleClientId' => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
    'googleClientSecret' => $_ENV['GOOGLE_CLIENT_SECRET'] ?? '',
    'socialAuthStateKey' => $_ENV['SOCIAL_AUTH_STATE_KEY'] ?? '',
    'passwordRecoveryMethods' => [in_array($_ENV['PASSWORD_RECOVERY_METHOD'] ?? 'email', ['email', 'mobile'], true)
        ? ($_ENV['PASSWORD_RECOVERY_METHOD'] ?? 'email')
        : 'email'],
    'passwordResetOtpLength' => 4,
    'passwordResetOtpTtl' => 600,
    'smsProvider' => $_ENV['SMS_PROVIDER'] ?? 'log',
    'smsDefaultCountryCode' => $_ENV['SMS_DEFAULT_COUNTRY_CODE'] ?? '+91',
    'twoFactorApiKey' => $_ENV['TWO_FACTOR_API_KEY'] ?? '',
    'address' => 'address',
    'phone' => 'phone',
    'categoryImagePath' => 'http://localhost/salah-time/api/category/',
    'expenseImagePath' => 'http://localhost/salah-time/api/expenses/',
    'userImagePath' => 'http://localhost/salah-time/api/users/', //  Yii::$app->params['categoryImagePath']
    'cardImagePath' => 'http://localhost/salah-time/api/cards/'
];
