<?php

namespace app\controllers;

use Yii;
use app\models\Language;
use yii\web\Response;

/**
 * Public language list for the app's language picker, managed in the back office (Languages).
 * The app only offers the codes it ships a translation for.
 */
class HttpLanguageController extends \yii\web\Controller
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

    /** GET http-language/list → { items: [{ code, name, nativeName, rtl }] }, enabled only, in display order. */
    public function actionList()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $languages = Language::find()
            ->where(['status' => 1])
            ->orderBy(['sort_order' => SORT_ASC, 'id_language' => SORT_ASC])
            ->all();

        return [
            'items' => array_map(static function (Language $language): array {
                return [
                    'code' => (string)$language->code,
                    'name' => (string)$language->name,
                    'nativeName' => (string)($language->native_name ?: $language->name),
                    'rtl' => (int)($language->is_rtl ?? 0) === 1,
                ];
            }, $languages),
        ];
    }
}
