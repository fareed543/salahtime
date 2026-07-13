<?php

namespace app\controllers;

use Yii;
use app\models\City;
use app\models\Customer;
use app\models\CustomerType;
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

    public function actionUsers()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $page = max(1, (int)Yii::$app->request->get('page', 1));
        $perPage = max(1, min(100, (int)Yii::$app->request->get('perPage', 10)));
        $search = trim((string)Yii::$app->request->get('search', ''));
        $customerTypeId = (int)Yii::$app->request->get('customerTypeId', 0);
        $gender = trim((string)Yii::$app->request->get('gender', ''));
        $status = trim((string)Yii::$app->request->get('status', ''));

        $query = Customer::find()
            ->alias('customer')
            ->select([
                'customer.id',
                'customer.firstname',
                'customer.lastname',
                'customer.username',
                'customer.gender',
                'customer.email',
                'customer.phone',
                'customer.active',
                'customer.email_verified',
                'customer.mobile_verified',
                'customer.date_created',
                'customer.id_customer_type',
                'customerTypeName' => 'customerType.name',
            ])
            ->leftJoin(
                CustomerType::tableName() . ' customerType',
                'customerType.id_customer_type = customer.id_customer_type'
            );

        if ($search !== '') {
            $query->andWhere([
                'or',
                ['like', 'customer.firstname', $search],
                ['like', 'customer.lastname', $search],
                ['like', 'customer.email', $search],
                ['like', 'customer.phone', $search],
            ]);
        }

        if ($customerTypeId > 0) {
            $query->andWhere(['customer.id_customer_type' => $customerTypeId]);
        }

        if (in_array($gender, ['m', 'f'], true)) {
            $query->andWhere(['customer.gender' => $gender]);
        }

        if ($status === 'active') {
            $query->andWhere(['customer.active' => 1]);
        } elseif ($status === 'inactive') {
            $query->andWhere(['customer.active' => 0]);
        }

        $total = (clone $query)->count();
        $records = $query
            ->orderBy(['customer.id' => SORT_DESC])
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->asArray()
            ->all();

        return [
            'items' => array_map(static function (array $user): array {
                return [
                    'id' => (int)$user['id'],
                    'fullName' => trim(($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? '')) ?: 'Unnamed user',
                    'firstName' => (string)($user['firstname'] ?? ''),
                    'lastName' => (string)($user['lastname'] ?? ''),
                    'email' => (string)($user['email'] ?? ''),
                    'phone' => (string)($user['phone'] ?? ''),
                    'createdAt' => (string)($user['date_created'] ?? ''),
                    'customerType' => (string)($user['customerTypeName'] ?? 'Unknown'),
                    'customerTypeId' => (int)($user['id_customer_type'] ?? 0),
                    'gender' => (string)($user['gender'] ?? ''),
                    'statusLabel' => ((int)($user['active'] ?? 0) === 1 ? 'Active' : 'Inactive'),
                    'active' => ((int)($user['active'] ?? 0) === 1),
                    'emailVerified' => ((int)($user['email_verified'] ?? 0) === 1),
                    'mobileVerified' => ((int)($user['mobile_verified'] ?? 0) === 1),
                ];
            }, $records),
            'summary' => [
                'totalUsers' => (int)Customer::find()->count(),
                'activeUsers' => (int)Customer::find()->where(['active' => 1])->count(),
                'inactiveUsers' => (int)Customer::find()->where(['active' => 0])->count(),
                'adminUsers' => (int)Customer::find()->where(['id_customer_type' => 1])->count(),
            ],
            'filterOptions' => [
                'customerTypes' => array_map(static function (CustomerType $type): array {
                    return [
                        'label' => (string)($type->name ?? 'Unknown'),
                        'value' => (int)$type->id_customer_type,
                    ];
                }, CustomerType::find()->orderBy(['name' => SORT_ASC])->all()),
                'genders' => [
                    ['label' => 'Male', 'value' => 'm'],
                    ['label' => 'Female', 'value' => 'f'],
                ],
                'statuses' => [
                    ['label' => 'Active', 'value' => 'active'],
                    ['label' => 'Inactive', 'value' => 'inactive'],
                ],
            ],
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => (int)$total,
                'totalPages' => max(1, (int)ceil(((int)$total) / $perPage)),
            ],
        ];
    }

    public function actionUserDetail()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)Yii::$app->request->get('id', 0);
        $user = Customer::find()->where(['id' => $id])->asArray()->one();

        if (!$user) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'User not found.'];
        }

        return [
            'id' => (int)$user['id'],
            'firstname' => (string)($user['firstname'] ?? ''),
            'lastname' => (string)($user['lastname'] ?? ''),
            'username' => (string)($user['username'] ?? ''),
            'gender' => (string)($user['gender'] ?? 'm'),
            'email' => (string)($user['email'] ?? ''),
            'phone' => (string)($user['phone'] ?? ''),
            'password' => '',
            'id_customer_type' => (int)($user['id_customer_type'] ?? 3),
            'designation' => (string)($user['designation'] ?? ''),
            'occupation' => (string)($user['occupation'] ?? ''),
            'company_name' => (string)($user['company_name'] ?? ''),
            'college_name' => (string)($user['college_name'] ?? ''),
            'address' => (string)($user['address'] ?? ''),
            'street' => (string)($user['street'] ?? ''),
            'landmark' => (string)($user['landmark'] ?? ''),
            'masjid' => (string)($user['masjid'] ?? ''),
            'pincode' => (string)($user['pincode'] ?? ''),
            'notes' => (string)($user['notes'] ?? ''),
            'active' => ((int)($user['active'] ?? 0) === 1),
            'mobile_verified' => ((int)($user['mobile_verified'] ?? 0) === 1),
            'email_verified' => ((int)($user['email_verified'] ?? 0) === 1),
            'offline_access' => ((int)($user['offline_access'] ?? 0) === 1),
            'email_notification' => ((int)($user['email_notification'] ?? 0) === 1),
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
        if (in_array($action->id, ['options', 'dashboard-summary', 'users', 'user-detail', 'menu-config', 'public-menu-config', 'save-menu-config'], true)) {
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
