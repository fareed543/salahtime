<?php

namespace app\controllers;

use Yii;
use app\models\City;
use app\models\Customer;
use app\models\Masjid;
use app\models\Program;
use yii\db\Expression;
use yii\db\Query;
use yii\helpers\Json;
use yii\web\Controller;
use yii\web\Response;

class AdminController extends Controller
{
    private const MENU_STORAGE_PATH = '@app/data/frontend-menu.json';

    public function actions()
    {
        return [
            'options' => [
                'class' => 'yii\rest\OptionsAction',
            ],
        ];
    }

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

    public function actionDashboardSummary()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $userStatus = (new Query())
            ->select([
                'active' => new Expression('SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END)'),
                'inactive' => new Expression('SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END)')
            ])
            ->from(Customer::tableName())
            ->one();

        $masjidStatus = (new Query())
            ->select([
                'active' => new Expression('SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END)'),
                'inactive' => new Expression('SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END)')
            ])
            ->from(Masjid::tableName())
            ->one();

        $programStatus = (new Query())
            ->select([
                'label' => new Expression('COALESCE(NULLIF(status, ""), "Not set")'),
                'count' => new Expression('COUNT(*)')
            ])
            ->from(Program::tableName())
            ->groupBy(new Expression('COALESCE(NULLIF(status, ""), "Not set")'))
            ->orderBy(['count' => SORT_DESC])
            ->all();

        $programTypes = (new Query())
            ->select([
                'label' => new Expression('COALESCE(NULLIF(program_type, ""), "General")'),
                'count' => new Expression('COUNT(*)')
            ])
            ->from(Program::tableName())
            ->groupBy(new Expression('COALESCE(NULLIF(program_type, ""), "General")'))
            ->orderBy(['count' => SORT_DESC])
            ->all();

        return [
            'generatedAt' => gmdate(DATE_ATOM),
            'counts' => [
                'masjids' => (int)Masjid::find()->count(),
                'users' => (int)Customer::find()->count(),
                'programs' => (int)Program::find()->count(),
                'locations' => (int)City::find()->count(),
            ],
            'statusBreakdown' => [
                'users' => [
                    'active' => (int)($userStatus['active'] ?? 0),
                    'inactive' => (int)($userStatus['inactive'] ?? 0),
                ],
                'masjids' => [
                    'active' => (int)($masjidStatus['active'] ?? 0),
                    'inactive' => (int)($masjidStatus['inactive'] ?? 0),
                ],
                'programs' => array_map([$this, 'normalizeBreakdown'], $programStatus),
                'programTypes' => array_map([$this, 'normalizeBreakdown'], $programTypes),
            ],
            'recent' => [
                'users' => $this->getRecentUsers(),
                'masjids' => $this->getRecentMasjids(),
                'programs' => $this->getRecentPrograms(),
            ],
        ];
    }

    public function actionMenuConfig()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        return $this->readMenuConfig();
    }

    public function actionPublicMenuConfig()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        return $this->readMenuConfig();
    }

    public function actionSaveMenuConfig()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $sidebarMenu = $this->sanitizeMenuItems($payload['sidebarMenu'] ?? []);
        $shortcutMenu = $this->sanitizeMenuItems($payload['shortcutMenu'] ?? []);

        if ($sidebarMenu === null || $shortcutMenu === null) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Invalid menu configuration payload.'];
        }

        $data = [
            'sidebarMenu' => $sidebarMenu,
            'shortcutMenu' => $shortcutMenu,
            'updatedAt' => gmdate(DATE_ATOM),
            'updatedBy' => [
                'id' => (int)$admin->id,
                'name' => trim(($admin->firstname ?? '') . ' ' . ($admin->lastname ?? '')),
            ],
        ];

        $targetPath = Yii::getAlias(self::MENU_STORAGE_PATH);
        $targetDir = dirname($targetPath);
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0775, true);
        }

        file_put_contents($targetPath, Json::encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        return $data;
    }

    public function beforeAction($action)
    {
        if (in_array($action->id, ['options', 'dashboard-summary', 'menu-config', 'public-menu-config', 'save-menu-config'], true)) {
            $this->enableCsrfValidation = false;
        }

        return parent::beforeAction($action);
    }

    private function requireAdmin()
    {
        $headers = Yii::$app->request->headers;
        if (!$headers->has('Authorization')) {
            Yii::$app->response->statusCode = 401;
            return ['error' => 'Authorization header missing.'];
        }

        $token = str_replace('Bearer ', '', (string)$headers->get('Authorization'));
        $user = Customer::find()->where(['authKey' => $token])->one();

        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return ['error' => 'Unauthorized'];
        }

        if ((int)$user->id_customer_type !== 1) {
            Yii::$app->response->statusCode = 403;
            return ['error' => 'Admin access required'];
        }

        return $user;
    }

    private function getRecentUsers(): array
    {
        $records = Customer::find()
            ->select(['id', 'firstname', 'lastname', 'email', 'phone', 'date_created', 'active'])
            ->orderBy(['id' => SORT_DESC])
            ->limit(5)
            ->asArray()
            ->all();

        return array_map(static function (array $user): array {
            return [
                'id' => (int)$user['id'],
                'title' => trim(($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? '')) ?: 'Unnamed user',
                'subtitle' => $user['email'] ?: ($user['phone'] ?: 'No contact provided'),
                'meta' => ((int)($user['active'] ?? 0) === 1 ? 'Active' : 'Inactive') . ' • ' . ($user['date_created'] ?? 'Recently created'),
            ];
        }, $records);
    }

    private function getRecentMasjids(): array
    {
        $records = Masjid::find()
            ->select(['id', 'name', 'city', 'area', 'created_at', 'status'])
            ->orderBy(['id' => SORT_DESC])
            ->limit(5)
            ->asArray()
            ->all();

        return array_map(static function (array $masjid): array {
            $location = trim(($masjid['area'] ?? '') . ', ' . ($masjid['city'] ?? ''), ', ');
            return [
                'id' => (int)$masjid['id'],
                'title' => $masjid['name'] ?? 'Unnamed masjid',
                'subtitle' => $location ?: 'Location not added',
                'meta' => ((int)($masjid['status'] ?? 0) === 1 ? 'Active' : 'Inactive') . ' • ' . ($masjid['created_at'] ?? 'Recently added'),
            ];
        }, $records);
    }

    private function getRecentPrograms(): array
    {
        $records = Program::find()
            ->select(['id', 'name', 'program_type', 'status', 'start_date', 'created_at'])
            ->orderBy(['id' => SORT_DESC])
            ->limit(5)
            ->asArray()
            ->all();

        return array_map(static function (array $program): array {
            return [
                'id' => (int)$program['id'],
                'title' => $program['name'] ?? 'Untitled program',
                'subtitle' => ucfirst($program['program_type'] ?: 'general') . ' program',
                'meta' => ($program['status'] ?: 'Not set') . ' • Starts ' . ($program['start_date'] ?: $program['created_at'] ?: 'soon'),
            ];
        }, $records);
    }

    private function normalizeBreakdown(array $row): array
    {
        return [
            'label' => (string)($row['label'] ?? 'Unknown'),
            'count' => (int)($row['count'] ?? 0),
        ];
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

    private function sanitizeMenuItems($items): ?array
    {
        if (!is_array($items)) {
            return null;
        }

        $sanitized = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                return null;
            }

            $sanitizedItem = [
                'id' => isset($item['id']) ? (int)$item['id'] : null,
                'code' => isset($item['code']) ? trim((string)$item['code']) : '',
                'labelKey' => trim((string)($item['labelKey'] ?? '')),
                'icon' => trim((string)($item['icon'] ?? '')),
                'route' => trim((string)($item['route'] ?? '')),
                'enabled' => (bool)($item['enabled'] ?? false),
                'sortOrder' => isset($item['sortOrder']) ? (int)$item['sortOrder'] : 0,
                'exact' => (bool)($item['exact'] ?? false),
                'requiresAuth' => (bool)($item['requiresAuth'] ?? false),
            ];

            if ($sanitizedItem['labelKey'] === '' || $sanitizedItem['route'] === '') {
                return null;
            }

            $sanitized[] = $sanitizedItem;
        }

        return $sanitized;
    }
}
