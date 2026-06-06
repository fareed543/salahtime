<?php

namespace app\controllers;

use Yii;
use app\models\AppMenu;
use app\models\Customer;
use yii\web\Controller;
use yii\web\Response;

class HttpMenuController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                'Access-Control-Allow-Credentials' => Yii::$app->params['corsAllowCredentials'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Max-Age' => 86400,
            ],
        ];

        return $behaviors;
    }

    public function beforeAction($action)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return parent::beforeAction($action);
    }

    public function actionIndex()
    {
        return [
            'modules' => $this->serializeMenus(),
        ];
    }

    public function actionSave()
    {
        if ($this->requireSuperAdmin() === null) {
            return Yii::$app->response->data;
        }

        $data = Yii::$app->request->getBodyParams();
        $modules = $data['modules'] ?? [];

        if (!is_array($modules)) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Invalid modules payload.'];
        }

        $menuMap = AppMenu::find()->indexBy('code')->all();

        foreach ($modules as $module) {
            $code = $module['code'] ?? null;
            if (!$code || !isset($menuMap[$code])) {
                continue;
            }

            $menu = $menuMap[$code];
            $menu->enabled = !empty($module['enabled']) ? 1 : 0;
            $menu->sort_order = isset($module['sortOrder']) ? (int)$module['sortOrder'] : (int)$menu->sort_order;
            $menu->save(false);
        }

        return [
            'message' => 'Menu configuration saved successfully.',
            'modules' => $this->serializeMenus(),
        ];
    }

    private function serializeMenus(): array
    {
        $menus = AppMenu::find()
            ->orderBy(['sort_order' => SORT_ASC, 'id' => SORT_ASC])
            ->all();

        return array_map(static function (AppMenu $menu) {
            return [
                'id' => (int)$menu->id,
                'code' => $menu->code,
                'labelKey' => $menu->label_key,
                'icon' => $menu->icon,
                'route' => $menu->route,
                'enabled' => (bool)$menu->enabled,
                'sortOrder' => (int)$menu->sort_order,
            ];
        }, $menus);
    }

    private function requireSuperAdmin(): ?Customer
    {
        $user = $this->findAuthUser();
        if ($user === null) {
            Yii::$app->response->statusCode = 401;
            Yii::$app->response->data = ['error' => 'Unauthorized user'];
            return null;
        }

        if ((int)$user->id_customer_type !== 1) {
            Yii::$app->response->statusCode = 403;
            Yii::$app->response->data = ['error' => 'Only Super Admin can manage menu'];
            return null;
        }

        return $user;
    }

    private function findAuthUser(): ?Customer
    {
        $authorizationHeader = Yii::$app->request->headers->get('Authorization', '');
        if (!$authorizationHeader) {
            return null;
        }

        $token = str_replace('Bearer ', '', $authorizationHeader);
        if ($token === '') {
            return null;
        }

        return Customer::find()->where(['authKey' => $token])->one();
    }
}
