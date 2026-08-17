<?php

defined('YII_DEBUG') or define('YII_DEBUG', false);
defined('YII_ENV') or define('YII_ENV', 'dev');

require '/home/u596948110/api-app/vendor/autoload.php';
require '/home/u596948110/api-app/vendor/yiisoft/yii2/Yii.php';

$config = require '/home/u596948110/api-app/config/web.php';

(new yii\web\Application($config))->run();