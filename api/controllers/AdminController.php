<?php

namespace app\controllers;

use Yii;
use app\models\AppVersion;
use app\models\CalendarSpecialDate;
use app\models\City;
use app\models\Customer;
use app\models\CustomerType;
use app\models\HijriCalendarAdjustment;
use app\models\Masjid;
use app\models\NotificationBroadcast;
use app\models\Program;
use app\models\ProgramCustomer;
use app\models\PushSubscription;
use yii\db\Expression;
use yii\db\Query;
use yii\helpers\Json;
use yii\web\Controller;
use yii\web\Response;

class AdminController extends Controller
{
    private const MENU_STORAGE_PATH = '@app/data/frontend-menu.json';
    private const ACTION_ROLE_ACCESS = [
        'dashboard-summary' => ['administrator', 'manager', 'support', 'developer', 'users', 'restricted-user'],
        'users' => ['administrator', 'manager'],
        'user-detail' => ['administrator', 'manager'],
        'delete-user' => ['administrator'],
        'bulk-delete-users' => ['administrator'],
        'menu-config' => ['administrator', 'developer'],
        'save-menu-config' => ['administrator', 'developer'],
        'calendar-adjustments' => ['administrator', 'manager'],
        'save-calendar-adjustments' => ['administrator', 'manager'],
        'calendar-special-dates' => ['administrator', 'manager'],
        'save-calendar-special-dates' => ['administrator', 'manager'],
        'app-versions' => ['administrator', 'developer'],
        'save-app-version' => ['administrator', 'developer'],
        'activate-app-version' => ['administrator', 'developer'],
        'delete-app-version' => ['administrator', 'developer'],
        'notifications' => ['administrator', 'manager'],
        'save-notification' => ['administrator', 'manager'],
        'publish-notification' => ['administrator', 'manager'],
    ];

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
            ->where(['deleted' => 0])
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
                'users' => (int)Customer::find()->where(['deleted' => 0])->count(),
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
            'visitorStats' => $this->buildVisitorStats(),
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
            )
            ->andWhere(['customer.deleted' => 0]);

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
                'totalUsers' => (int)Customer::find()->where(['deleted' => 0])->count(),
                'activeUsers' => (int)Customer::find()->where(['active' => 1, 'deleted' => 0])->count(),
                'inactiveUsers' => (int)Customer::find()->where(['active' => 0, 'deleted' => 0])->count(),
                'adminUsers' => (int)Customer::find()->where(['id_customer_type' => 1, 'deleted' => 0])->count(),
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
        $user = Customer::find()->where(['id' => $id, 'deleted' => 0])->asArray()->one();

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
            'createdAt' => (string)($user['date_created'] ?? ''),
            'updatedAt' => (string)($user['date_updated'] ?? ''),
        ];
    }

    public function actionDeleteUser()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)(Yii::$app->request->post('id', Yii::$app->request->getBodyParam('id', 0)));
        if ($id <= 0) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'User id is required.'];
        }

        if ((int)$admin->id === $id) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'You cannot delete your own admin account.'];
        }

        $customer = Customer::find()->where(['id' => $id, 'deleted' => 0])->one();
        if (!$customer) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'User not found.'];
        }

        $customer->deleted = 1;
        $customer->active = 0;
        if (!$customer->save(false, ['deleted', 'active', 'date_updated'])) {
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Failed to delete user.'];
        }

        return ['message' => 'User deleted successfully.'];
    }

    public function actionBulkDeleteUsers()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $ids = Yii::$app->request->post('ids', Yii::$app->request->getBodyParam('ids', []));
        if (!is_array($ids) || !$ids) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'At least one user id is required.'];
        }

        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static function (int $id): bool {
            return $id > 0;
        })));

        if (!$ids) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'At least one valid user id is required.'];
        }

        if (in_array((int)$admin->id, $ids, true)) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'You cannot delete your own admin account.'];
        }

        $customers = Customer::find()
            ->where(['id' => $ids, 'deleted' => 0])
            ->all();

        if (!$customers) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'No users found for deletion.'];
        }

        $deletedCount = 0;
        foreach ($customers as $customer) {
            $customer->deleted = 1;
            $customer->active = 0;

            if (!$customer->save(false, ['deleted', 'active', 'date_updated'])) {
                Yii::$app->response->statusCode = 500;
                return ['error' => 'Failed to delete selected users.'];
            }

            $deletedCount++;
        }

        return [
            'message' => $deletedCount === 1
                ? '1 user deleted successfully.'
                : $deletedCount . ' users deleted successfully.',
            'deletedCount' => $deletedCount,
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

    public function actionCalendarAdjustments()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        return [
            'items' => array_map([$this, 'serializeCalendarAdjustment'], HijriCalendarAdjustment::find()
                ->orderBy(['hijri_year' => SORT_DESC, 'hijri_month' => SORT_ASC, 'id' => SORT_DESC])
                ->all()),
        ];
    }

    public function actionPublicCalendarAdjustments()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        return [
            'items' => array_map([$this, 'serializeCalendarAdjustment'], HijriCalendarAdjustment::find()
                ->where(['is_active' => 1])
                ->orderBy(['hijri_year' => SORT_DESC, 'hijri_month' => SORT_ASC, 'id' => SORT_ASC])
                ->all()),
        ];
    }

    public function actionSaveCalendarAdjustments()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $items = $payload['items'] ?? null;

        if (!is_array($items)) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Invalid calendar adjustment payload.'];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            HijriCalendarAdjustment::deleteAll();

            foreach ($items as $item) {
                $model = new HijriCalendarAdjustment();
                $month = (int)($item['hijriMonth'] ?? 0);
                $year = (int)($item['hijriYear'] ?? 0);
                $originalStart = (string)($item['originalStartDate'] ?? '');
                $originalEnd = (string)($item['originalEndDate'] ?? '');
                $updatedStart = (string)($item['updatedStartDate'] ?? '');
                $updatedEnd = (string)($item['updatedEndDate'] ?? '');

                $model->title = trim((string)($item['title'] ?? $this->buildHijriAdjustmentTitle($month, $year)));
                $model->hijri_month = $month;
                $model->hijri_year = $year;
                $model->original_start_date = $originalStart;
                $model->original_end_date = $originalEnd;
                $model->updated_start_date = $updatedStart;
                $model->updated_end_date = $updatedEnd;
                $model->start_date = $updatedStart;
                $model->end_date = $updatedEnd;
                $model->adjustment_days = (int)($item['adjustmentDays'] ?? 0);
                $model->notes = trim((string)($item['notes'] ?? ''));
                $model->is_active = !empty($item['isActive']) ? 1 : 0;

                if (!$model->save()) {
                    throw new \RuntimeException($this->firstModelError($model) ?: 'Unable to save calendar adjustment.');
                }
            }

            $transaction->commit();
        } catch (\Throwable $exception) {
            $transaction->rollBack();
            Yii::$app->response->statusCode = 422;
            return ['error' => $exception->getMessage()];
        }

        return $this->actionCalendarAdjustments();
    }

    public function actionCalendarSpecialDates()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        return [
            'items' => array_map([$this, 'serializeCalendarSpecialDate'], CalendarSpecialDate::find()
                ->orderBy(['event_date' => SORT_ASC, 'sort_order' => SORT_ASC, 'id' => SORT_ASC])
                ->all()),
        ];
    }

    public function actionAppVersions()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        return $this->buildAppVersionAdminResponse();
    }

    public function actionNotifications()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        return $this->buildNotificationAdminResponse();
    }

    public function actionPublicNotifications()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $sinceId = max(0, (int)Yii::$app->request->get('sinceId', 0));
        $limit = max(1, min(50, (int)Yii::$app->request->get('limit', 20)));

        $query = NotificationBroadcast::find()
            ->where(['is_published' => 1])
            ->orderBy([
                'published_at' => SORT_ASC,
                'id' => SORT_ASC,
            ])
            ->limit($limit);

        if ($sinceId > 0) {
            $query->andWhere(['>', 'id', $sinceId]);
        }

        return [
            'items' => array_map([$this, 'serializePublishedNotification'], $query->all()),
            'serverTime' => gmdate(DATE_ATOM),
        ];
    }

    public function actionSaveNotification()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $model = $this->loadNotificationBroadcastModel($payload, false);
        if (!$model instanceof NotificationBroadcast) {
            return $model;
        }

        $model->title = trim((string)($payload['title'] ?? ''));
        $model->message = trim((string)($payload['message'] ?? ''));
        $model->audience = $this->normalizeNullableString($payload['audience'] ?? 'all') ?? 'all';
        $model->is_published = 0;
        if ($model->getIsNewRecord()) {
            $model->created_by_customer_id = (int)$admin->id;
        }

        if (!$model->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($model) ?: 'Unable to save notification.'];
        }

        return $this->buildNotificationAdminResponse((int)$model->id);
    }

    public function actionPublishNotification()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $model = $this->loadNotificationBroadcastModel($payload, true);
        if (!$model instanceof NotificationBroadcast) {
            return $model;
        }

        $model->title = trim((string)($payload['title'] ?? ''));
        $model->message = trim((string)($payload['message'] ?? ''));
        $model->audience = $this->normalizeNullableString($payload['audience'] ?? 'all') ?? 'all';
        $model->is_published = 1;
        $model->published_at = date('Y-m-d H:i:s');
        $model->published_by_customer_id = (int)$admin->id;
        if ($model->getIsNewRecord()) {
            $model->created_by_customer_id = (int)$admin->id;
        }

        if (!$model->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($model) ?: 'Unable to publish notification.'];
        }

        $dispatch = $this->dispatchPublishedNotification($model);

        return array_merge(
            $this->buildNotificationAdminResponse((int)$model->id),
            ['publishDispatch' => $dispatch]
        );
    }

    public function actionRegisterPushSubscription()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $payload = Yii::$app->request->getBodyParams();
        $installId = trim((string)($payload['installId'] ?? ''));
        if ($installId === '') {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Install id is required.'];
        }

        $subscription = PushSubscription::findOne(['install_id' => $installId]) ?? new PushSubscription();
        $subscription->install_id = $installId;
        $subscription->customer_id = $this->resolveOptionalAuthorizedCustomerId();
        $subscription->platform = $this->normalizeNullableString($payload['platform'] ?? null);
        $subscription->push_token = $this->normalizeNullableString($payload['pushToken'] ?? null);
        $subscription->notifications_enabled = !empty($payload['notificationsEnabled']) ? 1 : 0;
        $subscription->app_version = $this->normalizeNullableString($payload['appVersion'] ?? null);
        $subscription->last_seen_at = date('Y-m-d H:i:s');

        if (!$subscription->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($subscription) ?: 'Unable to register device.'];
        }

        return [
            'success' => true,
            'subscriptionId' => (int)$subscription->id,
        ];
    }

    public function actionSaveAppVersion()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $versionValue = trim((string)($payload['version'] ?? ''));
        $id = (int)($payload['id'] ?? 0);

        if ($versionValue === '') {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Version is required.'];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            $model = $id > 0 ? AppVersion::findOne(['id_app_version' => $id]) : new AppVersion();
            if (!$model) {
                throw new \RuntimeException('App version not found.');
            }

            $isNewRecord = $model->getIsNewRecord();
            if ($isNewRecord) {
                AppVersion::updateAll(
                    [
                        'is_active' => 0,
                        'updated_at' => date('Y-m-d H:i:s'),
                    ],
                    ['is_active' => 1]
                );
            }

            $model->version = $versionValue;
            $model->version_code = $this->normalizeNullableInt($payload['versionCode'] ?? null);
            $model->mandatory = !empty($payload['mandatory']) ? 1 : 0;
            $model->title = $this->normalizeNullableString($payload['title'] ?? null);
            $model->message = $this->normalizeNullableString($payload['message'] ?? null);
            $model->features_json = $this->encodeStringList($payload['features'] ?? []);
            $model->bug_fixes_json = $this->encodeStringList($payload['bugFixes'] ?? []);
            $model->apk_url = $this->normalizeNullableString($payload['apkUrl'] ?? null);
            $model->update_url = $this->normalizeNullableString($payload['updateUrl'] ?? null);
            $model->play_store_url = $this->normalizeNullableString($payload['playStoreUrl'] ?? null);
            $model->release_date = $this->normalizeNullableDateTime($payload['releaseDate'] ?? null) ?: date('Y-m-d H:i:s');
            if ($isNewRecord) {
                $model->is_active = 1;
            }
            $model->updated_at = date('Y-m-d H:i:s');

            if (!$model->save()) {
                throw new \RuntimeException($this->firstModelError($model) ?: 'Unable to save app version.');
            }

            $transaction->commit();
        } catch (\Throwable $exception) {
            $transaction->rollBack();
            Yii::$app->response->statusCode = 422;
            return ['error' => $exception->getMessage()];
        }

        return $this->buildAppVersionAdminResponse((int)$model->id_app_version);
    }

    public function actionActivateAppVersion()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)(Yii::$app->request->post('id', Yii::$app->request->getBodyParam('id', 0)));
        if ($id <= 0) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'App version id is required.'];
        }

        $model = AppVersion::findOne(['id_app_version' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'App version not found.'];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            AppVersion::updateAll(
                [
                    'is_active' => 0,
                    'updated_at' => date('Y-m-d H:i:s'),
                ],
                ['is_active' => 1]
            );

            $model->is_active = 1;
            $model->updated_at = date('Y-m-d H:i:s');

            if (!$model->save(false, ['is_active', 'updated_at'])) {
                throw new \RuntimeException($this->firstModelError($model) ?: 'Unable to activate app version.');
            }

            $transaction->commit();
        } catch (\Throwable $exception) {
            $transaction->rollBack();
            Yii::$app->response->statusCode = 422;
            return ['error' => $exception->getMessage()];
        }

        return $this->actionAppVersions();
    }

    public function actionDeleteAppVersion()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)(Yii::$app->request->post('id', Yii::$app->request->getBodyParam('id', 0)));
        if ($id <= 0) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'App version id is required.'];
        }

        $model = AppVersion::findOne(['id_app_version' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'App version not found.'];
        }

        if ((int)$model->is_active === 1) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Active app version cannot be deleted. Activate another version first.'];
        }

        if ($model->delete() === false) {
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Unable to delete app version.'];
        }

        return $this->actionAppVersions();
    }

    public function actionSaveCalendarSpecialDates()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $items = $payload['items'] ?? null;

        if (!is_array($items)) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Invalid calendar special date payload.'];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            CalendarSpecialDate::deleteAll();

            foreach ($items as $index => $item) {
                $model = new CalendarSpecialDate();
                $model->title = trim((string)($item['title'] ?? ''));
                $model->event_date = (string)($item['eventDate'] ?? '');
                $model->description = trim((string)($item['description'] ?? ''));
                $model->is_active = !empty($item['isActive']) ? 1 : 0;
                $model->sort_order = isset($item['sortOrder']) ? (int)$item['sortOrder'] : $index;

                if (!$model->save()) {
                    throw new \RuntimeException($this->firstModelError($model) ?: 'Unable to save calendar special date.');
                }
            }

            $transaction->commit();
        } catch (\Throwable $exception) {
            $transaction->rollBack();
            Yii::$app->response->statusCode = 422;
            return ['error' => $exception->getMessage()];
        }

        return $this->actionCalendarSpecialDates();
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
        if (in_array($action->id, ['options', 'dashboard-summary', 'users', 'user-detail', 'delete-user', 'bulk-delete-users', 'menu-config', 'public-menu-config', 'save-menu-config', 'calendar-adjustments', 'public-calendar-adjustments', 'save-calendar-adjustments', 'calendar-special-dates', 'save-calendar-special-dates', 'app-versions', 'save-app-version', 'activate-app-version', 'delete-app-version', 'notifications', 'public-notifications', 'save-notification', 'publish-notification', 'register-push-subscription'], true)) {
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
        $user = Customer::find()->where(['authKey' => $token, 'deleted' => 0])->one();

        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return ['error' => 'Unauthorized'];
        }

        $actionId = Yii::$app->requestedAction ? Yii::$app->requestedAction->id : '';
        $allowedRoles = self::ACTION_ROLE_ACCESS[$actionId] ?? ['administrator'];

        if (!$this->userHasBackofficeRole($user, $allowedRoles)) {
            Yii::$app->response->statusCode = 403;
            return ['error' => 'You do not have permission to access this back office resource.'];
        }

        return $user;
    }

    private function userHasBackofficeRole(Customer $user, array $allowedRoles): bool
    {
        $normalizedRole = $this->resolveBackofficeRole($user);
        if ($normalizedRole === '') {
            return false;
        }

        foreach ($allowedRoles as $role) {
            if ($this->normalizeRoleName($role) === $normalizedRole) {
                return true;
            }
        }

        return false;
    }

    private function resolveBackofficeRole(Customer $user): string
    {
        $roleName = '';
        $customerType = CustomerType::find()
            ->select(['name'])
            ->where(['id_customer_type' => $user->id_customer_type])
            ->asArray()
            ->one();

        if (is_array($customerType) && !empty($customerType['name'])) {
            $roleName = (string)$customerType['name'];
        }

        if ($roleName === '') {
            switch ((int)$user->id_customer_type) {
                case 1:
                    $roleName = 'Administrator';
                    break;
                case 2:
                    $roleName = 'Manager';
                    break;
                case 3:
                    $roleName = 'Users';
                    break;
                case 4:
                    $roleName = 'Support';
                    break;
                case 5:
                    $roleName = 'Restricted User';
                    break;
                default:
                    $roleName = '';
                    break;
            }
        }

        return $this->normalizeRoleName($roleName);
    }

    private function normalizeRoleName(string $role): string
    {
        $normalized = strtolower(trim($role));
        $normalized = str_replace('&', 'and', $normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?: '';
        $normalized = trim($normalized, '-');

        if ($normalized === 'super-admin') {
            return 'administrator';
        }

        return $normalized;
    }

    private function getRecentUsers(): array
    {
        $records = Customer::find()
            ->select(['id', 'firstname', 'lastname', 'email', 'phone', 'date_created', 'active'])
            ->where(['deleted' => 0])
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

    private function buildVisitorStats(): array
    {
        return [
            'total' => (int)Customer::find()->where(['deleted' => 0])->count(),
            'daily' => $this->buildVisitorPeriodStats('hour', 24),
            'weekly' => $this->buildVisitorPeriodStats('day', 7),
            'monthly' => $this->buildVisitorPeriodStats('day', 30),
            'yearly' => $this->buildVisitorPeriodStats('month', 12),
        ];
    }

    private function buildVisitorPeriodStats(string $granularity, int $bucketCount): array
    {
        $now = new \DateTimeImmutable('now');
        $buckets = [];

        switch ($granularity) {
            case 'hour':
                $start = $now->setTime((int)$now->format('H'), 0, 0)->modify('-' . ($bucketCount - 1) . ' hours');
                for ($i = 0; $i < $bucketCount; $i++) {
                    $bucketStart = $start->modify('+' . $i . ' hours');
                    $key = $bucketStart->format('Y-m-d H:00:00');
                    $buckets[$key] = [
                        'key' => $key,
                        'label' => $bucketStart->format('ga'),
                        'shortLabel' => $bucketStart->format('H:00'),
                        'value' => 0,
                    ];
                }
                $queryStart = $start->format('Y-m-d H:i:s');
                $groupExpression = new Expression("DATE_FORMAT(date_created, '%Y-%m-%d %H:00:00')");
                break;
            case 'month':
                $start = $now->modify('first day of this month')->setTime(0, 0, 0)->modify('-' . ($bucketCount - 1) . ' months');
                for ($i = 0; $i < $bucketCount; $i++) {
                    $bucketStart = $start->modify('+' . $i . ' months');
                    $key = $bucketStart->format('Y-m-01 00:00:00');
                    $buckets[$key] = [
                        'key' => $key,
                        'label' => $bucketStart->format('M Y'),
                        'shortLabel' => $bucketStart->format('M'),
                        'value' => 0,
                    ];
                }
                $queryStart = $start->format('Y-m-d H:i:s');
                $groupExpression = new Expression("DATE_FORMAT(date_created, '%Y-%m-01 00:00:00')");
                break;
            case 'day':
            default:
                $start = $now->setTime(0, 0, 0)->modify('-' . ($bucketCount - 1) . ' days');
                for ($i = 0; $i < $bucketCount; $i++) {
                    $bucketStart = $start->modify('+' . $i . ' days');
                    $key = $bucketStart->format('Y-m-d 00:00:00');
                    $buckets[$key] = [
                        'key' => $key,
                        'label' => $bucketStart->format('d M'),
                        'shortLabel' => $bucketStart->format('D'),
                        'value' => 0,
                    ];
                }
                $queryStart = $start->format('Y-m-d H:i:s');
                $groupExpression = new Expression("DATE_FORMAT(date_created, '%Y-%m-%d 00:00:00')");
                break;
        }

        $rows = (new Query())
            ->select([
                'bucket' => $groupExpression,
                'count' => new Expression('COUNT(*)'),
            ])
            ->from(Customer::tableName())
            ->where(['deleted' => 0])
            ->andWhere(['>=', 'date_created', $queryStart])
            ->groupBy(['bucket'])
            ->orderBy(['bucket' => SORT_ASC])
            ->all();

        foreach ($rows as $row) {
            $bucketKey = (string)($row['bucket'] ?? '');
            if (!isset($buckets[$bucketKey])) {
                continue;
            }

            $buckets[$bucketKey]['value'] = (int)($row['count'] ?? 0);
        }

        $points = array_values($buckets);
        $values = array_column($points, 'value');
        $total = array_sum($values);
        $peakValue = $values ? max($values) : 0;
        $peakIndex = $values ? array_search($peakValue, $values, true) : false;
        $peakLabel = $peakIndex !== false && isset($points[$peakIndex]) ? $points[$peakIndex]['label'] : '';

        return [
            'total' => (int)$total,
            'average' => $bucketCount > 0 ? round($total / $bucketCount, 1) : 0,
            'peak' => [
                'label' => $peakLabel,
                'value' => (int)$peakValue,
            ],
            'points' => $points,
        ];
    }

    private function serializeCalendarAdjustment(HijriCalendarAdjustment $adjustment): array
    {
        return [
            'id' => (int)$adjustment->id,
            'title' => (string)$adjustment->title,
            'hijriYear' => (int)($adjustment->hijri_year ?? 0),
            'hijriMonth' => (int)($adjustment->hijri_month ?? 0),
            'originalStartDate' => (string)($adjustment->original_start_date ?? ''),
            'originalEndDate' => (string)($adjustment->original_end_date ?? ''),
            'updatedStartDate' => (string)($adjustment->updated_start_date ?: $adjustment->start_date ?: ''),
            'updatedEndDate' => (string)($adjustment->updated_end_date ?: $adjustment->end_date ?: ''),
            'startDate' => (string)$adjustment->start_date,
            'endDate' => (string)$adjustment->end_date,
            'adjustmentDays' => (int)$adjustment->adjustment_days,
            'notes' => (string)($adjustment->notes ?? ''),
            'isActive' => ((int)$adjustment->is_active) === 1,
            'createdAt' => (string)($adjustment->created_at ?? ''),
            'updatedAt' => (string)($adjustment->updated_at ?? ''),
        ];
    }

    private function serializeCalendarSpecialDate(CalendarSpecialDate $specialDate): array
    {
        return [
            'id' => (int)$specialDate->id,
            'title' => (string)$specialDate->title,
            'eventDate' => (string)$specialDate->event_date,
            'description' => (string)($specialDate->description ?? ''),
            'isActive' => ((int)($specialDate->is_active ?? 0) === 1),
            'sortOrder' => (int)($specialDate->sort_order ?? 0),
            'createdAt' => (string)($specialDate->created_at ?? ''),
            'updatedAt' => (string)($specialDate->updated_at ?? ''),
        ];
    }

    private function serializeAppVersionForAdmin(AppVersion $version): array
    {
        return [
            'id' => (int)$version->id_app_version,
            'version' => (string)$version->version,
            'versionCode' => $version->version_code === null ? null : (int)$version->version_code,
            'mandatory' => ((int)($version->mandatory ?? 0)) === 1,
            'title' => (string)($version->title ?? ''),
            'message' => (string)($version->message ?? ''),
            'features' => $this->decodeJsonList($version->features_json),
            'bugFixes' => $this->decodeJsonList($version->bug_fixes_json),
            'apkUrl' => (string)($version->apk_url ?? ''),
            'updateUrl' => (string)($version->update_url ?? ''),
            'playStoreUrl' => (string)($version->play_store_url ?? ''),
            'releaseDate' => (string)($version->release_date ?? ''),
            'isActive' => ((int)($version->is_active ?? 0)) === 1,
            'createdAt' => (string)($version->created_at ?? ''),
            'updatedAt' => (string)($version->updated_at ?? ''),
        ];
    }

    private function buildAppVersionAdminResponse(?int $selectedId = null): array
    {
        $versions = AppVersion::find()
            ->orderBy([
                'is_active' => SORT_DESC,
                'version_code' => SORT_DESC,
                'release_date' => SORT_DESC,
                'id_app_version' => SORT_DESC,
            ])
            ->all();

        $activeVersion = null;
        $selectedVersion = null;
        foreach ($versions as $version) {
            if ($activeVersion === null && (int)$version->is_active === 1) {
                $activeVersion = $version;
            }

            if ($selectedId !== null && (int)$version->id_app_version === $selectedId) {
                $selectedVersion = $version;
            }
        }

        return [
            'current' => $activeVersion ? $this->serializeAppVersionForAdmin($activeVersion) : null,
            'selected' => $selectedVersion ? $this->serializeAppVersionForAdmin($selectedVersion) : ($activeVersion ? $this->serializeAppVersionForAdmin($activeVersion) : null),
            'items' => array_map([$this, 'serializeAppVersionForAdmin'], $versions),
        ];
    }

    private function serializeNotificationForAdmin(NotificationBroadcast $notification): array
    {
        return [
            'id' => (int)$notification->id,
            'title' => (string)$notification->title,
            'message' => (string)$notification->message,
            'audience' => (string)($notification->audience ?? 'all'),
            'isPublished' => ((int)($notification->is_published ?? 0)) === 1,
            'publishedAt' => (string)($notification->published_at ?? ''),
            'createdAt' => (string)($notification->created_at ?? ''),
            'updatedAt' => (string)($notification->updated_at ?? ''),
            'createdByCustomerId' => $notification->created_by_customer_id === null ? null : (int)$notification->created_by_customer_id,
            'publishedByCustomerId' => $notification->published_by_customer_id === null ? null : (int)$notification->published_by_customer_id,
        ];
    }

    private function serializePublishedNotification(NotificationBroadcast $notification): array
    {
        return [
            'id' => (int)$notification->id,
            'title' => (string)$notification->title,
            'message' => (string)$notification->message,
            'audience' => (string)($notification->audience ?? 'all'),
            'publishedAt' => (string)($notification->published_at ?? ''),
        ];
    }

    private function buildNotificationAdminResponse(?int $selectedId = null): array
    {
        $items = NotificationBroadcast::find()
            ->orderBy([
                'is_published' => SORT_DESC,
                'published_at' => SORT_DESC,
                'updated_at' => SORT_DESC,
                'id' => SORT_DESC,
            ])
            ->all();

        $selected = null;
        if ($selectedId !== null) {
            foreach ($items as $item) {
                if ((int)$item->id === $selectedId) {
                    $selected = $item;
                    break;
                }
            }
        }

        return [
            'current' => $selected ? $this->serializeNotificationForAdmin($selected) : null,
            'items' => array_map([$this, 'serializeNotificationForAdmin'], $items),
        ];
    }

    private function loadNotificationBroadcastModel(array $payload, bool $allowCreate)
    {
        $id = (int)($payload['id'] ?? 0);
        if ($id > 0) {
            $model = NotificationBroadcast::findOne(['id' => $id]);
            if (!$model) {
                Yii::$app->response->statusCode = 404;
                return ['error' => 'Notification record not found.'];
            }

            return $model;
        }

        if (!$allowCreate) {
            return new NotificationBroadcast();
        }

        return new NotificationBroadcast();
    }

    private function resolveOptionalAuthorizedCustomerId(): ?int
    {
        $headers = Yii::$app->request->headers;
        if (!$headers->has('Authorization')) {
            return null;
        }

        $token = str_replace('Bearer ', '', (string)$headers->get('Authorization'));
        if ($token === '') {
            return null;
        }

        $user = Customer::find()->where(['authKey' => $token, 'deleted' => 0])->one();
        return $user ? (int)$user->id : null;
    }

    private function dispatchPublishedNotification(NotificationBroadcast $notification): array
    {
        $tokens = PushSubscription::find()
            ->select(['push_token'])
            ->where(['notifications_enabled' => 1])
            ->andWhere(['not', ['push_token' => null]])
            ->andWhere(['<>', 'push_token', ''])
            ->column();

        $tokens = array_values(array_unique(array_filter(array_map('strval', $tokens))));
        $serverKey = (string)(Yii::$app->params['fcmServerKey'] ?? '');

        if ($serverKey === '') {
            return [
                'attempted' => false,
                'reason' => 'FCM server key is not configured.',
                'tokenCount' => count($tokens),
            ];
        }

        if (!$tokens) {
            return [
                'attempted' => false,
                'reason' => 'No device tokens are registered yet.',
                'tokenCount' => 0,
            ];
        }

        $payload = Json::encode([
            'registration_ids' => $tokens,
            'notification' => [
                'title' => (string)$notification->title,
                'body' => (string)$notification->message,
                'sound' => 'default',
            ],
            'data' => [
                'notificationId' => (string)$notification->id,
                'audience' => (string)($notification->audience ?? 'all'),
                'publishedAt' => (string)($notification->published_at ?? ''),
            ],
            'priority' => 'high',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if (!function_exists('curl_init')) {
            Yii::warning('Push notification publish skipped because cURL is unavailable.', __METHOD__);
            return [
                'attempted' => false,
                'reason' => 'cURL is unavailable on the server.',
                'tokenCount' => count($tokens),
            ];
        }

        $ch = curl_init('https://fcm.googleapis.com/fcm/send');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: key=' . $serverKey,
                'Content-Type: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_POSTFIELDS => $payload,
        ]);

        $responseBody = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($responseBody === false || $curlError !== '') {
            Yii::warning('Push notification publish failed: ' . $curlError, __METHOD__);
            return [
                'attempted' => true,
                'success' => false,
                'httpCode' => $httpCode,
                'reason' => $curlError !== '' ? $curlError : 'Unknown cURL error.',
                'tokenCount' => count($tokens),
            ];
        }

        $decoded = Json::decode($responseBody, true);

        return [
            'attempted' => true,
            'success' => $httpCode >= 200 && $httpCode < 300,
            'httpCode' => $httpCode,
            'tokenCount' => count($tokens),
            'response' => is_array($decoded) ? $decoded : $responseBody,
        ];
    }

    private function firstModelError($model): string
    {
        $errors = $model->getFirstErrors();
        if (!$errors) {
            return '';
        }

        return (string)reset($errors);
    }

    private function normalizeNullableString($value): ?string
    {
        $normalized = trim((string)$value);
        return $normalized === '' ? null : $normalized;
    }

    private function normalizeNullableInt($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int)$value;
    }

    private function normalizeNullableDateTime($value): ?string
    {
        $normalized = trim((string)$value);
        return $normalized === '' ? null : $normalized;
    }

    private function encodeStringList($items): ?string
    {
        if (!is_array($items)) {
            return null;
        }

        $normalized = array_values(array_filter(array_map(static function ($item): string {
            return trim((string)$item);
        }, $items), static function (string $item): bool {
            return $item !== '';
        }));

        return $normalized ? Json::encode($normalized, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null;
    }

    private function decodeJsonList(?string $value): array
    {
        if (!$value) {
            return [];
        }

        $decoded = Json::decode($value, true);
        return is_array($decoded) ? array_values($decoded) : [];
    }

    private function buildHijriAdjustmentTitle(int $month, int $year): string
    {
        $months = [
            1 => 'Muharram',
            2 => 'Safar',
            3 => 'Rabi al-Awwal',
            4 => 'Rabi al-Thani',
            5 => 'Jumada al-Awwal',
            6 => 'Jumada al-Thani',
            7 => 'Rajab',
            8 => "Sha'ban",
            9 => 'Ramadan',
            10 => 'Shawwal',
            11 => 'Dhu al-Qadah',
            12 => 'Dhu al-Hijjah',
        ];

        $label = $months[$month] ?? 'Hijri Month';
        return trim($label . ' ' . ($year > 0 ? $year : ''));
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
