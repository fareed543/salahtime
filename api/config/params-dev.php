<?php

return [
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
    'categoryImagePath' => 'https://dev-api.salah-times.in/category/',
    'expenseImagePath' => 'https://dev-api.salah-times.in/expenses/',
    'userImagePath' => 'https://dev-api.salah-times.in/users/',
    'cardImagePath' => 'https://dev-api.salah-times.in/cards/'
];
