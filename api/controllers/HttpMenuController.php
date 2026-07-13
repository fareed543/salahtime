<?php

namespace app\controllers;

use Yii;
use yii\helpers\Json;
use yii\web\Controller;
use yii\web\Response;

class HttpMenuController extends Controller
{
    private const MENU_STORAGE_PATH = '@app/data/frontend-menu.json';

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

    public function actionConfig()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return $this->readMenuConfig();
    }

    private function readMenuConfig(): array
    {
        $targetPath = Yii::getAlias(self::MENU_STORAGE_PATH);
        if (!file_exists($targetPath)) {
            return [
                'sidebarMenu' => [],
                'shortcutMenu' => [],
                'updatedAt' => null,
                'updatedBy' => null,
            ];
        }

        $decoded = Json::decode(file_get_contents($targetPath), true);
        if (!is_array($decoded)) {
            return [
                'sidebarMenu' => [],
                'shortcutMenu' => [],
                'updatedAt' => null,
                'updatedBy' => null,
            ];
        }

        return [
            'sidebarMenu' => $decoded['sidebarMenu'] ?? [],
            'shortcutMenu' => $decoded['shortcutMenu'] ?? [],
            'updatedAt' => $decoded['updatedAt'] ?? null,
            'updatedBy' => $decoded['updatedBy'] ?? null,
        ];
    }
}
