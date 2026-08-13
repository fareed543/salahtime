<?php

namespace app\controllers;

use Yii;
use app\components\BackofficeAccess;
use app\models\AppVersion;
use app\models\CalendarSpecialDate;
use app\models\City;
use app\models\Customer;
use app\models\CustomerType;
use app\models\CustomerTypePermission;
use app\models\Email;
use app\models\EmailTemplates;
use app\models\HijriCalendarAdjustment;
use app\models\Language;
use app\models\Masjid;
use app\models\NotificationBroadcast;
use app\models\Permission;
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
        'save-user' => ['administrator', 'manager'],
        'delete-user' => ['administrator'],
        'bulk-delete-users' => ['administrator'],
        'roles' => ['administrator', 'manager'],
        'save-role' => ['administrator'],
        'delete-role' => ['administrator'],
        'permissions' => ['administrator', 'manager'],
        'save-permission' => ['administrator'],
        'delete-permission' => ['administrator'],
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
        'emails' => ['administrator', 'manager'],
        'email-detail' => ['administrator', 'manager'],
        'save-email' => ['administrator', 'manager'],
        'delete-email' => ['administrator'],
        'bulk-delete-emails' => ['administrator'],
        'email-templates' => ['administrator', 'manager'],
        'email-template-detail' => ['administrator', 'manager'],
        'save-email-template' => ['administrator', 'manager'],
        'delete-email-template' => ['administrator'],
        'bulk-delete-email-templates' => ['administrator'],
        'languages' => ['administrator', 'manager'],
        'language-detail' => ['administrator', 'manager'],
        'save-language' => ['administrator', 'manager'],
        'toggle-language-status' => ['administrator', 'manager'],
        'delete-language' => ['administrator'],
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

        $customerRoleColumn = Customer::roleColumnName();
        $roleKeyColumn = CustomerType::roleColumnName();

        $page = max(1, (int)Yii::$app->request->get('page', 1));
        $perPage = max(1, min(100, (int)Yii::$app->request->get('perPage', 10)));
        $search = trim((string)Yii::$app->request->get('search', ''));
        $customerTypeId = (int)Yii::$app->request->get('customerTypeId', 0);
        $gender = trim((string)Yii::$app->request->get('gender', ''));
        $status = trim((string)Yii::$app->request->get('status', ''));
        $roleId = (int)Yii::$app->request->get('roleId', 0);

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
                'customerRoleId' => 'customer.' . $customerRoleColumn,
                'customerTypeName' => 'customerType.name',
            ])
            ->leftJoin(
                CustomerType::tableName() . ' customerType',
                'customerType.' . $roleKeyColumn . ' = customer.' . $customerRoleColumn
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
            $query->andWhere(['customer.' . $customerRoleColumn => $customerTypeId]);
        }

        if (in_array($gender, ['m', 'f'], true)) {
            $query->andWhere(['customer.gender' => $gender]);
        }

        if ($status === 'active') {
            $query->andWhere(['customer.active' => 1]);
        } elseif ($status === 'inactive') {
            $query->andWhere(['customer.active' => 0]);
        }

        if ($roleId > 0) {
            $query->andWhere(['customer.' . $customerRoleColumn => $roleId]);
        }

        $total = (clone $query)->count();
        $records = $query
            ->orderBy(['customer.id' => SORT_DESC])
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->asArray()
            ->all();

        $roleMap = $this->buildUserRoleMap(array_column($records, 'id'));

        return [
            'items' => array_map(function (array $user) use ($roleMap): array {
                $userRoles = $roleMap[(int)$user['id']] ?? [];
                $roleLabels = array_map(static function (array $role): string {
                    return (string)($role['name'] ?? '');
                }, $userRoles);

                return [
                    'id' => (int)$user['id'],
                    'fullName' => trim(($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? '')) ?: 'Unnamed user',
                    'firstName' => (string)($user['firstname'] ?? ''),
                    'lastName' => (string)($user['lastname'] ?? ''),
                    'email' => (string)($user['email'] ?? ''),
                    'phone' => (string)($user['phone'] ?? ''),
                    'createdAt' => (string)($user['date_created'] ?? ''),
                    'customerType' => (string)($user['customerTypeName'] ?? 'Unknown'),
                    'customerTypeId' => (int)($user['customerRoleId'] ?? 0),
                    'roleName' => (string)($user['customerTypeName'] ?? 'Unknown'),
                    'roleId' => (int)($user['customerRoleId'] ?? 0),
                    'gender' => (string)($user['gender'] ?? ''),
                    'statusLabel' => ((int)($user['active'] ?? 0) === 1 ? 'Active' : 'Inactive'),
                    'active' => ((int)($user['active'] ?? 0) === 1),
                    'emailVerified' => ((int)($user['email_verified'] ?? 0) === 1),
                    'mobileVerified' => ((int)($user['mobile_verified'] ?? 0) === 1),
                    'roles' => $userRoles,
                    'roleNames' => $roleLabels,
                    'displayRole' => $roleLabels ? implode(', ', $roleLabels) : (string)($user['customerTypeName'] ?? 'Unknown'),
                ];
            }, $records),
            'summary' => [
                'totalUsers' => (int)Customer::find()->where(['deleted' => 0])->count(),
                'activeUsers' => (int)Customer::find()->where(['active' => 1, 'deleted' => 0])->count(),
                'inactiveUsers' => (int)Customer::find()->where(['active' => 0, 'deleted' => 0])->count(),
                'adminUsers' => (int)Customer::find()->where([$customerRoleColumn => 1, 'deleted' => 0])->count(),
            ],
            'filterOptions' => [
                'customerTypes' => array_map(static function (CustomerType $type): array {
                    return [
                        'label' => (string)($type->name ?? 'Unknown'),
                        'value' => (int)$type->id_customer_type,
                    ];
                }, CustomerType::find()->orderBy(['name' => SORT_ASC])->all()),
                'roles' => array_map([$this, 'serializeRoleOption'], CustomerType::find()->where(['status' => 1])->orderBy(['name' => SORT_ASC])->all()),
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

        $customerRoleColumn = Customer::roleColumnName();

        $id = (int)Yii::$app->request->get('id', 0);
        $user = Customer::find()
            ->select(['*', 'customerRoleId' => $customerRoleColumn])
            ->where(['id' => $id, 'deleted' => 0])
            ->asArray()
            ->one();

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
            'roleId' => (int)($user['customerRoleId'] ?? 3),
            'id_customer_type' => (int)($user['customerRoleId'] ?? 3),
            'id_user_role' => (int)($user['customerRoleId'] ?? 3),
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
            'roleId' => (int)($user['customerRoleId'] ?? 0),
            'roleIds' => (int)($user['customerRoleId'] ?? 0) > 0 ? [(int)$user['customerRoleId']] : [],
            'roles' => $this->buildUserRoleMap([(int)$user['id']])[(int)$user['id']] ?? [],
            'roleOptions' => array_map([$this, 'serializeRoleOption'], CustomerType::find()->where(['status' => 1])->orderBy(['name' => SORT_ASC])->all()),
        ];
    }

    public function actionSaveUser()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $userId = (int)($payload['id'] ?? 0);
        $isNew = $userId <= 0;

        $user = $isNew
            ? new Customer()
            : Customer::find()->where(['id' => $userId, 'deleted' => 0])->one();

        if (!$user) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'User not found.'];
        }

        $user->firstname = trim((string)($payload['firstname'] ?? ''));
        $user->lastname = trim((string)($payload['lastname'] ?? ''));
        $user->username = trim((string)($payload['username'] ?? '')) ?: trim((string)($payload['phone'] ?? ''));
        $user->gender = trim((string)($payload['gender'] ?? 'm')) ?: 'm';
        $user->email = $this->normalizeNullableString($payload['email']) ?? '';
        $user->phone = trim((string)($payload['phone'] ?? ''));
        $roleId = (int)($payload['roleId'] ?? 0);
        if ($roleId <= 0) {
            $roleIds = array_values(array_unique(array_filter(array_map('intval', (array)($payload['roleIds'] ?? [])))));
            $roleId = $roleIds[0] ?? (int)($payload['id_user_role'] ?? $payload['id_customer_type'] ?? 3);
        }
        $user->id_customer_type = $roleId > 0 ? $roleId : 3;
        $user->designation = (string)($payload['designation'] ?? '');
        $user->occupation = (string)($payload['occupation'] ?? '');
        $user->company_name = (string)($payload['company_name'] ?? '');
        $user->college_name = (string)($payload['college_name'] ?? '');
        $user->address = (string)($payload['address'] ?? '');
        $user->street = (string)($payload['street'] ?? '');
        $user->landmark = (string)($payload['landmark'] ?? '');
        $user->masjid = (string)($payload['masjid'] ?? '');
        $user->pincode = (string)($payload['pincode'] ?? '');
        $user->notes = (string)($payload['notes'] ?? '');
        $user->active = !empty($payload['active']) ? 1 : 0;
        $user->mobile_verified = !empty($payload['mobile_verified']) ? 1 : 0;
        $user->email_verified = !empty($payload['email_verified']) ? 1 : 0;
        $user->offline_access = !empty($payload['offline_access']) ? 1 : 0;
        $user->email_notification = !empty($payload['email_notification']) ? 1 : 0;

        $password = trim((string)($payload['password'] ?? ''));
        if ($isNew && $password === '') {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Password is required for new users.'];
        }

        if (!$isNew && $password === '') {
            $user->password = $user->getOldAttribute('password');
        } elseif (!$isNew) {
            $user->password = Yii::$app->security->generatePasswordHash($password);
        } else {
            $user->password = $password;
        }

        if (!$user->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($user) ?: 'Unable to save user.'];
        }

        return $this->actionUserDetailForId((int)$user->id);
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

    public function actionRoles()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $roles = CustomerType::find()->orderBy(['name' => SORT_ASC])->all();
        $permissions = Permission::find()->where(['status' => 1])->orderBy(['name' => SORT_ASC])->all();
        $rolePermissionMap = $this->buildRolePermissionMap(array_map(static function (CustomerType $role): int {
            return (int)$role->id_customer_type;
        }, $roles));
        $roleUserMap = $this->buildRoleUserPreviewMap(array_map(static function (CustomerType $role): int {
            return (int)$role->id_customer_type;
        }, $roles));

        return [
            'items' => array_map(function (CustomerType $role) use ($rolePermissionMap, $roleUserMap): array {
                $roleId = (int)$role->id_customer_type;
                $assignedUsers = $roleUserMap[$roleId] ?? [];
                $assignedPermissions = $rolePermissionMap[$roleId] ?? [];

                return [
                    'id' => $roleId,
                    'name' => (string)$role->name,
                    'code' => (string)($role->code ?: BackofficeAccess::normalizeRoleName((string)$role->name)),
                    'description' => (string)($role->description ?? ''),
                    'status' => ((int)$role->status) === 1,
                    'isSystem' => ((int)($role->is_system ?? 0)) === 1,
                    'userCount' => count($assignedUsers),
                    'permissionCount' => count($assignedPermissions),
                    'users' => $assignedUsers,
                    'permissions' => $assignedPermissions,
                ];
            }, $roles),
            'permissionOptions' => array_map([$this, 'serializePermissionOption'], $permissions),
        ];
    }

    public function actionSaveRole()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $roleId = (int)($payload['id'] ?? 0);
        $roleKeyColumn = CustomerType::roleColumnName();
        $roleForeignKeyColumn = CustomerTypePermission::roleForeignKeyColumnName();
        $role = $roleId > 0 ? CustomerType::findOne([$roleKeyColumn => $roleId]) : new CustomerType();
        if (!$role) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Role not found.'];
        }

        $role->name = trim((string)($payload['name'] ?? ''));
        $role->code = BackofficeAccess::normalizeRoleName((string)($payload['code'] ?? $payload['name'] ?? ''));
        $role->description = trim((string)($payload['description'] ?? ''));
        $role->status = !empty($payload['status']) ? 1 : 0;
        if ($role->isNewRecord) {
            $role->is_system = 0;
        }

        if (!$role->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($role) ?: 'Unable to save role.'];
        }

        $permissionIds = array_values(array_unique(array_filter(array_map('intval', (array)($payload['permissionIds'] ?? [])))));
        CustomerTypePermission::deleteAll([$roleForeignKeyColumn => (int)$role->id_customer_type]);
        foreach ($permissionIds as $permissionId) {
            $rolePermission = new CustomerTypePermission();
            $rolePermission->setRoleId((int)$role->id_customer_type);
            $rolePermission->permission_id = $permissionId;
            $rolePermission->save(false);
        }

        return $this->actionRoles();
    }

    public function actionDeleteRole()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)(Yii::$app->request->post('id', Yii::$app->request->getBodyParam('id', 0)));
        $roleKeyColumn = CustomerType::roleColumnName();
        $roleForeignKeyColumn = CustomerTypePermission::roleForeignKeyColumnName();
        $customerRoleColumn = Customer::roleColumnName();
        $role = CustomerType::findOne([$roleKeyColumn => $id]);
        if (!$role) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Role not found.'];
        }

        if ((int)$role->is_system === 1) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'System roles cannot be deleted.'];
        }

        if (Customer::find()->where([$customerRoleColumn => $id, 'deleted' => 0])->exists()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'This role is still assigned to users. Reassign them before deleting the role.'];
        }

        CustomerTypePermission::deleteAll([$roleForeignKeyColumn => $id]);
        $role->delete();
        return ['message' => 'Role deleted successfully.'];
    }

    public function actionPermissions()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $permissions = Permission::find()->orderBy(['name' => SORT_ASC])->all();
        $permissionRoleMap = $this->buildPermissionRoleMap(array_map(static function (Permission $permission): int {
            return (int)$permission->id;
        }, $permissions));

        return [
            'items' => array_map(function (Permission $permission) use ($permissionRoleMap): array {
                return [
                    'id' => (int)$permission->id,
                    'name' => (string)$permission->name,
                    'code' => (string)$permission->code,
                    'groupKey' => (string)($permission->group_key ?? ''),
                    'description' => (string)($permission->description ?? ''),
                    'status' => ((int)$permission->status) === 1,
                    'isSystem' => ((int)$permission->is_system) === 1,
                    'createdAt' => (string)($permission->created_at ?? ''),
                'assignedRoles' => $permissionRoleMap[(int)$permission->id] ?? [],
                ];
            }, $permissions),
        ];
    }

    public function actionSavePermission()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $permissionId = (int)($payload['id'] ?? 0);
        $permission = $permissionId > 0 ? Permission::findOne(['id' => $permissionId]) : new Permission();
        if (!$permission) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Permission not found.'];
        }

        $permission->name = trim((string)($payload['name'] ?? ''));
        $permission->code = trim((string)($payload['code'] ?? '')) ?: strtolower(str_replace(' ', '.', trim((string)($payload['name'] ?? ''))));
        $permission->group_key = trim((string)($payload['groupKey'] ?? ''));
        $permission->description = trim((string)($payload['description'] ?? ''));
        $permission->status = !empty($payload['status']) ? 1 : 0;

        if (!$permission->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($permission) ?: 'Unable to save permission.'];
        }

        return $this->actionPermissions();
    }

    public function actionDeletePermission()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)(Yii::$app->request->post('id', Yii::$app->request->getBodyParam('id', 0)));
        $permission = Permission::findOne(['id' => $id]);
        if (!$permission) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Permission not found.'];
        }

        if ((int)$permission->is_system === 1) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'System permissions cannot be deleted.'];
        }

        $permission->delete();
        return ['message' => 'Permission deleted successfully.'];
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

    public function actionEmails()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $page = max(1, (int)Yii::$app->request->get('page', 1));
        $perPage = max(1, min(100, (int)Yii::$app->request->get('perPage', 10)));
        $search = trim((string)Yii::$app->request->get('search', ''));
        $templateId = (int)Yii::$app->request->get('templateId', 0);

        $query = Email::find()
            ->alias('email')
            ->select([
                'email.id_email',
                'email.name',
                'email.id_email_template',
                'email.email_content',
                'email.from_name',
                'email.from_email',
                'email.subject',
                'email.cc_email',
                'email.created_at',
                'email.updated_at',
                'templateTitle' => 'template.title',
            ])
            ->leftJoin(EmailTemplates::tableName() . ' template', 'template.id_email_template = email.id_email_template');

        if ($search !== '') {
            $query->andWhere([
                'or',
                ['like', 'email.name', $search],
                ['like', 'email.subject', $search],
                ['like', 'email.from_email', $search],
                ['like', 'email.cc_email', $search],
                ['like', 'email.email_content', $search],
            ]);
        }

        if ($templateId > 0) {
            $query->andWhere(['email.id_email_template' => $templateId]);
        }

        $total = (int)(clone $query)->count();
        $records = $query
            ->orderBy(['email.id_email' => SORT_DESC])
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->asArray()
            ->all();

        return [
            'items' => array_map([$this, 'serializeEmailListItem'], $records),
            'summary' => $this->buildEmailSummary(),
            'filterOptions' => [
                'templates' => $this->buildEmailTemplateOptions(),
            ],
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => max(1, (int)ceil($total / $perPage)),
            ],
        ];
    }

    public function actionEmailDetail()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)Yii::$app->request->get('id', 0);
        $model = Email::findOne(['id_email' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Email record not found.'];
        }

        return $this->serializeEmailDetail($model);
    }

    public function actionSaveEmail()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $id = (int)($payload['id'] ?? 0);
        $model = $id > 0 ? Email::findOne(['id_email' => $id]) : new Email();

        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Email record not found.'];
        }

        $model->name = $this->normalizeNullableString($payload['name'] ?? null);
        $model->id_email_template = $this->normalizeNullableInt($payload['id_email_template'] ?? null);
        $model->from_name = $this->normalizeNullableString($payload['from_name'] ?? null);
        $model->from_email = $this->normalizeNullableString($payload['from_email'] ?? null);
        $model->subject = $this->normalizeNullableString($payload['subject'] ?? null);
        $model->cc_email = $this->normalizeNullableString($payload['cc_email'] ?? null);
        $model->email_content = trim((string)($payload['email_content'] ?? ''));

        if ($model->email_content === '') {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Email content is required.'];
        }

        if ($model->isNewRecord) {
            $model->create_by = (int)$admin->id;
            $model->created_at = date('Y-m-d H:i:s');
        }
        $model->updated_by = (int)$admin->id;

        if (!$model->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($model) ?: 'Unable to save email record.'];
        }

        return $this->actionEmailDetailForId((int)$model->id_email);
    }

    public function actionDeleteEmail()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)(Yii::$app->request->post('id', Yii::$app->request->getBodyParam('id', 0)));
        if ($id <= 0) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Email id is required.'];
        }

        $model = Email::findOne(['id_email' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Email record not found.'];
        }

        if (!$model->delete()) {
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Unable to delete email record.'];
        }

        return ['message' => 'Email deleted successfully.'];
    }

    public function actionBulkDeleteEmails()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $ids = Yii::$app->request->post('ids', Yii::$app->request->getBodyParam('ids', []));
        if (!is_array($ids) || !$ids) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'At least one email id is required.'];
        }

        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if (!$ids) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'At least one valid email id is required.'];
        }

        $deletedCount = (int)Email::deleteAll(['id_email' => $ids]);

        return [
            'message' => 'Selected emails deleted successfully.',
            'deletedCount' => $deletedCount,
        ];
    }

    public function actionEmailTemplates()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $page = max(1, (int)Yii::$app->request->get('page', 1));
        $perPage = max(1, min(100, (int)Yii::$app->request->get('perPage', 10)));
        $search = trim((string)Yii::$app->request->get('search', ''));

        $query = EmailTemplates::find()->alias('template');
        if ($search !== '') {
            $query->andWhere([
                'or',
                ['like', 'template.title', $search],
                ['like', 'template.email_template', $search],
            ]);
        }

        $total = (int)(clone $query)->count();
        $records = $query
            ->orderBy(['template.id_email_template' => SORT_DESC])
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->all();

        return [
            'items' => array_map([$this, 'serializeEmailTemplateForAdmin'], $records),
            'summary' => $this->buildEmailTemplateSummary(),
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => max(1, (int)ceil($total / $perPage)),
            ],
        ];
    }

    public function actionLanguages()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $page = max(1, (int)Yii::$app->request->get('page', 1));
        $perPage = max(1, min(100, (int)Yii::$app->request->get('perPage', 10)));
        $search = trim((string)Yii::$app->request->get('search', ''));

        $query = Language::find()->alias('language');
        if ($search !== '') {
            $query->andWhere([
                'or',
                ['like', 'language.name', $search],
                ['like', 'language.native_name', $search],
                ['like', 'language.code', $search],
            ]);
        }

        $total = (int)(clone $query)->count();
        $records = $query
            ->orderBy(['language.sort_order' => SORT_ASC, 'language.id_language' => SORT_ASC])
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->all();

        return [
            'items' => array_map([$this, 'serializeLanguageForAdmin'], $records),
            'summary' => $this->buildLanguageSummary(),
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => max(1, (int)ceil($total / $perPage)),
            ],
        ];
    }

    public function actionLanguageDetail()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)Yii::$app->request->get('id', 0);
        $model = Language::findOne(['id_language' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Language not found.'];
        }

        return $this->serializeLanguageForAdmin($model);
    }

    public function actionSaveLanguage()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $id = (int)($payload['id'] ?? 0);
        $model = $id > 0 ? Language::findOne(['id_language' => $id]) : new Language();

        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Language not found.'];
        }

        $isNewRecord = $model->getIsNewRecord();
        $name = trim((string)($payload['name'] ?? ''));
        $code = strtolower(trim((string)($payload['code'] ?? '')));

        if ($name === '' || $code === '') {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Language name and code are required.'];
        }

        $duplicateQuery = Language::find()->where(['code' => $code]);
        if (!$isNewRecord) {
            $duplicateQuery->andWhere(['<>', 'id_language', (int)$model->id_language]);
        }
        if ($duplicateQuery->exists()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Language code must be unique.'];
        }

        if ($isNewRecord) {
            $maxId = (int)Language::find()->max('id_language');
            $model->id_language = $maxId + 1;
            $model->created_at = date('Y-m-d H:i:s');
        }

        $model->name = $name;
        $model->native_name = $this->normalizeNullableString($payload['native_name'] ?? null);
        $model->code = $code;
        $model->status = !empty($payload['status']) ? 1 : 0;
        $model->sort_order = isset($payload['sort_order']) ? (int)$payload['sort_order'] : (int)$model->id_language;
        $model->updated_at = date('Y-m-d H:i:s');

        if (!$model->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($model) ?: 'Unable to save language.'];
        }

        return $this->actionLanguageDetailForId((int)$model->id_language);
    }

    public function actionToggleLanguageStatus()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)(Yii::$app->request->post('id', Yii::$app->request->getBodyParam('id', 0)));
        if ($id <= 0) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Language id is required.'];
        }

        $model = Language::findOne(['id_language' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Language not found.'];
        }

        $model->status = (int)$model->status === 1 ? 0 : 1;
        $model->updated_at = date('Y-m-d H:i:s');

        if (!$model->save(false, ['status', 'updated_at'])) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Unable to update language status.'];
        }

        return [
            'message' => sprintf('Language %s successfully.', (int)$model->status === 1 ? 'enabled' : 'disabled'),
            'item' => $this->serializeLanguageForAdmin($model),
        ];
    }

    public function actionDeleteLanguage()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)(Yii::$app->request->post('id', Yii::$app->request->getBodyParam('id', 0)));
        if ($id <= 0) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Language id is required.'];
        }

        $model = Language::findOne(['id_language' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Language not found.'];
        }

        if ($model->delete() === false) {
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Unable to delete language.'];
        }

        return ['message' => 'Language deleted successfully.'];
    }

    public function actionEmailTemplateDetail()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)Yii::$app->request->get('id', 0);
        $model = EmailTemplates::findOne(['id_email_template' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Email template not found.'];
        }

        return $this->serializeEmailTemplateForAdmin($model);
    }

    public function actionSaveEmailTemplate()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $id = (int)($payload['id'] ?? 0);
        $model = $id > 0 ? EmailTemplates::findOne(['id_email_template' => $id]) : new EmailTemplates();

        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Email template not found.'];
        }

        $model->title = $this->normalizeNullableString($payload['title'] ?? null);
        $model->email_template = trim((string)($payload['email_template'] ?? ''));

        if ($model->title === null || $model->title === '') {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Template title is required.'];
        }

        if ($model->email_template === '') {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Template markup is required.'];
        }

        if ($model->isNewRecord) {
            $model->create_by = (int)$admin->id;
            $model->created_at = date('Y-m-d H:i:s');
        }
        $model->updated_by = (int)$admin->id;

        if (!$model->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($model) ?: 'Unable to save email template.'];
        }

        return $this->actionEmailTemplateDetailForId((int)$model->id_email_template);
    }

    public function actionDeleteEmailTemplate()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $id = (int)(Yii::$app->request->post('id', Yii::$app->request->getBodyParam('id', 0)));
        if ($id <= 0) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Email template id is required.'];
        }

        $model = EmailTemplates::findOne(['id_email_template' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Email template not found.'];
        }

        if (Email::find()->where(['id_email_template' => $id])->exists()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'This template is assigned to one or more email records. Reassign them before deleting the template.'];
        }

        if (!$model->delete()) {
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Unable to delete email template.'];
        }

        return ['message' => 'Email template deleted successfully.'];
    }

    public function actionBulkDeleteEmailTemplates()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $ids = Yii::$app->request->post('ids', Yii::$app->request->getBodyParam('ids', []));
        if (!is_array($ids) || !$ids) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'At least one template id is required.'];
        }

        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if (!$ids) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'At least one valid template id is required.'];
        }

        $linkedTemplateIds = (new Query())
            ->select(['id_email_template'])
            ->from(Email::tableName())
            ->where(['id_email_template' => $ids])
            ->andWhere(['not', ['id_email_template' => null]])
            ->column();

        if ($linkedTemplateIds) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'One or more selected templates are still used by email records.'];
        }

        $deletedCount = (int)EmailTemplates::deleteAll(['id_email_template' => $ids]);

        return [
            'message' => 'Selected email templates deleted successfully.',
            'deletedCount' => $deletedCount,
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
        if (in_array($action->id, ['options', 'dashboard-summary', 'users', 'user-detail', 'save-user', 'delete-user', 'bulk-delete-users', 'roles', 'save-role', 'delete-role', 'permissions', 'save-permission', 'delete-permission', 'menu-config', 'public-menu-config', 'save-menu-config', 'calendar-adjustments', 'public-calendar-adjustments', 'save-calendar-adjustments', 'calendar-special-dates', 'save-calendar-special-dates', 'app-versions', 'save-app-version', 'activate-app-version', 'delete-app-version', 'notifications', 'save-notification', 'publish-notification', 'register-push-subscription', 'emails', 'email-detail', 'save-email', 'delete-email', 'bulk-delete-emails', 'email-templates', 'email-template-detail', 'save-email-template', 'delete-email-template', 'bulk-delete-email-templates', 'languages', 'language-detail', 'save-language', 'toggle-language-status', 'delete-language'], true)) {
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

        if (!BackofficeAccess::userHasAnyRole($user, $allowedRoles)) {
            Yii::$app->response->statusCode = 403;
            return ['error' => 'You do not have permission to access this back office resource.'];
        }

        return $user;
    }

    private function actionUserDetailForId(int $id): array
    {
        $_GET['id'] = $id;
        return $this->actionUserDetail();
    }

    private function actionEmailDetailForId(int $id): array
    {
        $_GET['id'] = $id;
        return $this->actionEmailDetail();
    }

    private function actionEmailTemplateDetailForId(int $id): array
    {
        $_GET['id'] = $id;
        return $this->actionEmailTemplateDetail();
    }

    private function actionLanguageDetailForId(int $id): array
    {
        $_GET['id'] = $id;
        return $this->actionLanguageDetail();
    }

    private function buildUserRoleMap(array $userIds): array
    {
        $userIds = array_values(array_unique(array_filter(array_map('intval', $userIds))));
        if (!$userIds) {
            return [];
        }

        $customerRoleColumn = Customer::roleColumnName();
        $roleKeyColumn = CustomerType::roleColumnName();

        $rows = (new Query())
            ->select([
                'customer_id' => 'customer.id',
                'role_id' => 'role.' . $roleKeyColumn,
                'role_name' => 'role.name',
                'role_code' => 'role.code',
            ])
            ->from(Customer::tableName() . ' customer')
            ->innerJoin(CustomerType::tableName() . ' role', 'role.' . $roleKeyColumn . ' = customer.' . $customerRoleColumn)
            ->where(['customer.id' => $userIds, 'role.status' => 1])
            ->orderBy(['role.name' => SORT_ASC])
            ->all();

        $map = [];
        foreach ($rows as $row) {
            $map[(int)$row['customer_id']][] = [
                'id' => (int)$row['role_id'],
                'name' => (string)$row['role_name'],
                'code' => (string)$row['role_code'],
            ];
        }

        return $map;
    }

    private function buildRolePermissionMap(array $roleIds): array
    {
        $roleIds = array_values(array_unique(array_filter(array_map('intval', $roleIds))));
        if (!$roleIds) {
            return [];
        }

        $roleForeignKeyColumn = CustomerTypePermission::roleForeignKeyColumnName();

        $rows = (new Query())
            ->select([
                'role_id' => 'rolePermission.' . $roleForeignKeyColumn,
                'permission_id' => 'permission.id',
                'permission_name' => 'permission.name',
                'permission_code' => 'permission.code',
            ])
            ->from(CustomerTypePermission::tableName() . ' rolePermission')
            ->innerJoin(Permission::tableName() . ' permission', 'permission.id = rolePermission.permission_id')
            ->where(['rolePermission.' . $roleForeignKeyColumn => $roleIds, 'permission.status' => 1])
            ->orderBy(['permission.name' => SORT_ASC])
            ->all();

        $map = [];
        foreach ($rows as $row) {
            $map[(int)$row['role_id']][] = [
                'id' => (int)$row['permission_id'],
                'name' => (string)$row['permission_name'],
                'code' => (string)$row['permission_code'],
            ];
        }

        return $map;
    }

    private function buildPermissionRoleMap(array $permissionIds): array
    {
        $permissionIds = array_values(array_unique(array_filter(array_map('intval', $permissionIds))));
        if (!$permissionIds) {
            return [];
        }

        $roleKeyColumn = CustomerType::roleColumnName();
        $roleForeignKeyColumn = CustomerTypePermission::roleForeignKeyColumnName();

        $rows = (new Query())
            ->select([
                'permission_id' => 'rolePermission.permission_id',
                'role_id' => 'role.' . $roleKeyColumn,
                'role_name' => 'role.name',
                'role_code' => 'role.code',
            ])
            ->from(CustomerTypePermission::tableName() . ' rolePermission')
            ->innerJoin(CustomerType::tableName() . ' role', 'role.' . $roleKeyColumn . ' = rolePermission.' . $roleForeignKeyColumn)
            ->where(['rolePermission.permission_id' => $permissionIds, 'role.status' => 1])
            ->orderBy(['role.name' => SORT_ASC])
            ->all();

        $map = [];
        foreach ($rows as $row) {
            $map[(int)$row['permission_id']][] = [
                'id' => (int)$row['role_id'],
                'name' => (string)$row['role_name'],
                'code' => (string)$row['role_code'],
            ];
        }

        return $map;
    }

    private function buildRoleUserPreviewMap(array $roleIds): array
    {
        $roleIds = array_values(array_unique(array_filter(array_map('intval', $roleIds))));
        if (!$roleIds) {
            return [];
        }

        $customerRoleColumn = Customer::roleColumnName();

        $rows = (new Query())
            ->select([
                'role_id' => 'customer.' . $customerRoleColumn,
                'customer_id' => 'customer.id',
                'firstname' => 'customer.firstname',
                'lastname' => 'customer.lastname',
                'email' => 'customer.email',
            ])
            ->from(Customer::tableName() . ' customer')
            ->where(['customer.' . $customerRoleColumn => $roleIds, 'customer.deleted' => 0])
            ->orderBy(['customer.id' => SORT_DESC])
            ->all();

        $map = [];
        foreach ($rows as $row) {
            $roleId = (int)$row['role_id'];
            if (!isset($map[$roleId])) {
                $map[$roleId] = [];
            }
            if (count($map[$roleId]) >= 4) {
                continue;
            }

            $name = trim(((string)$row['firstname']) . ' ' . ((string)$row['lastname']));
            $map[$roleId][] = [
                'id' => (int)$row['customer_id'],
                'name' => $name !== '' ? $name : ((string)$row['email'] ?: 'User'),
                'initials' => $this->buildInitials($name !== '' ? $name : (string)$row['email']),
            ];
        }

        return $map;
    }

    private function buildInitials(string $value): string
    {
        $parts = preg_split('/\s+/', trim($value)) ?: [];
        $initials = '';
        foreach (array_slice(array_filter($parts), 0, 2) as $part) {
            $initials .= strtoupper(substr($part, 0, 1));
        }

        return $initials ?: 'U';
    }

    private function serializeRoleOption(CustomerType $role): array
    {
        return [
            'id' => (int)$role->id_customer_type,
            'label' => (string)$role->name,
            'code' => (string)($role->code ?: BackofficeAccess::normalizeRoleName((string)$role->name)),
        ];
    }

    private function serializePermissionOption(Permission $permission): array
    {
        return [
            'id' => (int)$permission->id,
            'label' => (string)$permission->name,
            'code' => (string)$permission->code,
            'groupKey' => (string)($permission->group_key ?? ''),
        ];
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

    private function serializeEmailListItem(array $email): array
    {
        $content = trim(strip_tags((string)($email['email_content'] ?? '')));
        return [
            'id' => (int)($email['id_email'] ?? 0),
            'name' => (string)($email['name'] ?? ''),
            'subject' => (string)($email['subject'] ?? ''),
            'fromName' => (string)($email['from_name'] ?? ''),
            'fromEmail' => (string)($email['from_email'] ?? ''),
            'ccEmail' => (string)($email['cc_email'] ?? ''),
            'templateId' => isset($email['id_email_template']) ? (int)$email['id_email_template'] : null,
            'templateTitle' => (string)($email['templateTitle'] ?? ''),
            'contentPreview' => mb_substr($content, 0, 140),
            'createdAt' => (string)($email['created_at'] ?? ''),
            'updatedAt' => (string)($email['updated_at'] ?? ''),
        ];
    }

    private function serializeEmailDetail(Email $email): array
    {
        $template = $email->id_email_template ? EmailTemplates::findOne(['id_email_template' => $email->id_email_template]) : null;

        return [
            'id' => (int)$email->id_email,
            'name' => (string)($email->name ?? ''),
            'id_email_template' => $email->id_email_template === null ? null : (int)$email->id_email_template,
            'email_content' => (string)($email->email_content ?? ''),
            'from_name' => (string)($email->from_name ?? ''),
            'from_email' => (string)($email->from_email ?? ''),
            'subject' => (string)($email->subject ?? ''),
            'cc_email' => (string)($email->cc_email ?? ''),
            'templateTitle' => $template ? (string)$template->title : '',
            'templateOptions' => $this->buildEmailTemplateOptions(),
            'createdAt' => (string)($email->created_at ?? ''),
            'updatedAt' => (string)($email->updated_at ?? ''),
        ];
    }

    private function buildEmailSummary(): array
    {
        $totalEmails = (int)Email::find()->count();
        $templatedEmails = (int)Email::find()->where(['not', ['id_email_template' => null]])->count();
        $withoutTemplate = max(0, $totalEmails - $templatedEmails);
        $configuredSenders = (int)(new Query())
            ->from(Email::tableName())
            ->where(['not', ['from_email' => null]])
            ->andWhere(['<>', 'from_email', ''])
            ->count('DISTINCT from_email');

        return [
            'totalEmails' => $totalEmails,
            'templatedEmails' => $templatedEmails,
            'withoutTemplate' => $withoutTemplate,
            'configuredSenders' => $configuredSenders,
        ];
    }

    private function buildEmailTemplateSummary(): array
    {
        $totalTemplates = (int)EmailTemplates::find()->count();
        $templatesInUse = (int)(new Query())
            ->from(Email::tableName())
            ->where(['not', ['id_email_template' => null]])
            ->count('DISTINCT id_email_template');

        return [
            'totalTemplates' => $totalTemplates,
            'templatesInUse' => $templatesInUse,
            'availableTemplates' => max(0, $totalTemplates - $templatesInUse),
            'linkedEmails' => (int)Email::find()->where(['not', ['id_email_template' => null]])->count(),
        ];
    }

    private function buildLanguageSummary(): array
    {
        $total = (int)Language::find()->count();
        $enabled = (int)Language::find()->where(['status' => 1])->count();

        return [
            'totalLanguages' => $total,
            'enabledLanguages' => $enabled,
            'disabledLanguages' => max(0, $total - $enabled),
            'rtlLanguages' => (int)Language::find()->where(['code' => ['ar', 'ur']])->count(),
        ];
    }

    private function buildEmailTemplateOptions(): array
    {
        return array_map(static function (EmailTemplates $template): array {
            return [
                'id' => (int)$template->id_email_template,
                'label' => (string)($template->title ?? 'Untitled template'),
            ];
        }, EmailTemplates::find()->orderBy(['title' => SORT_ASC, 'id_email_template' => SORT_ASC])->all());
    }

    private function serializeEmailTemplateForAdmin(EmailTemplates $template): array
    {
        $linkedEmailCount = (int)Email::find()->where(['id_email_template' => (int)$template->id_email_template])->count();
        $markup = (string)($template->email_template ?? '');
        $preview = trim(strip_tags(str_replace(['template_email_content', 'template_subject_content', 'template_button_content'], ' ', $markup)));

        return [
            'id' => (int)$template->id_email_template,
            'title' => (string)($template->title ?? ''),
            'email_template' => $markup,
            'linkedEmailCount' => $linkedEmailCount,
            'preview' => mb_substr($preview, 0, 180),
            'createdAt' => (string)($template->created_at ?? ''),
            'updatedAt' => (string)($template->updated_at ?? ''),
        ];
    }

    private function serializeLanguageForAdmin(Language $language): array
    {
        return [
            'id' => (int)$language->id_language,
            'name' => (string)$language->name,
            'nativeName' => (string)($language->native_name ?? ''),
            'code' => (string)$language->code,
            'status' => (int)$language->status === 1,
            'sortOrder' => (int)$language->sort_order,
            'createdAt' => (string)($language->created_at ?? ''),
            'updatedAt' => (string)($language->updated_at ?? ''),
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
