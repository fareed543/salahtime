<?php

namespace app\controllers;

use Yii;
use app\models\AppVersion;
use yii\web\Response;

class HttpAppVersionController extends \yii\web\Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['GET', 'HEAD', 'OPTIONS'],
                'Access-Control-Allow-Credentials' => Yii::$app->params['corsAllowCredentials'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Max-Age' => 86400,
            ],
        ];
        return $behaviors;
    }

    public function actionLatest()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        if (Yii::$app->request->get('preview') === '1') {
            return [
                'version' => '1.0.45',
                'versionCode' => 45,
                'mandatory' => false,
                'title' => 'Update available',
                'message' => 'A newer Salah Time build is ready to install.',
                'features' => [
                    'Cleaner dashboard progress view',
                    'Improved Ramzan and Salah calendar handling',
                    'Better update management from API',
                ],
                'bugFixes' => [
                    'Fixed mobile Hijri month display inconsistencies',
                    'Improved dialog and navigation stability',
                ],
                'playStoreUrl' => 'https://play.google.com/store/apps/details?id=com.wallet.salahtime',
                'releaseDate' => date('Y-m-d H:i:s'),
            ];
        }

        $version = AppVersion::find()
            ->where(['is_active' => 1])
            ->orderBy([
                'version_code' => SORT_DESC,
                'release_date' => SORT_DESC,
                'id_app_version' => SORT_DESC,
            ])
            ->one();

        if (!$version) {
            Yii::$app->response->statusCode = 404;
            return [
                'message' => 'No app version is available.',
            ];
        }

        return $version;
    }
}
