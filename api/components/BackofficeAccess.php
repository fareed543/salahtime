<?php

namespace app\components;

use app\models\Customer;
use app\models\CustomerType;
use app\models\CustomerTypePermission;
use app\models\Permission;

class BackofficeAccess
{
    public static function normalizeRoleName(?string $role): string
    {
        $normalized = strtolower(trim((string)$role));
        $normalized = str_replace('&', 'and', $normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?: '';
        $normalized = trim($normalized, '-');

        if ($normalized === 'super-admin') {
            return 'administrator';
        }

        return $normalized;
    }

    public static function getAssignedRoles(Customer $user): array
    {
        $customerType = CustomerType::find()
            ->where(['id_user_role' => (int)$user->id_customer_type, 'status' => 1])
            ->one();

        if (!$customerType) {
            $fallbackName = self::resolveFallbackRoleName($user);
            if ($fallbackName === '') {
                return [];
            }

            return [[
                'id' => (int)$user->id_customer_type,
                'name' => $fallbackName,
                'code' => self::normalizeRoleName($fallbackName),
                'normalizedCode' => self::normalizeRoleName($fallbackName),
            ]];
        }

        $name = (string)($customerType->name ?? '');
        if ($name === '') {
            return [];
        }

        return [[
            'id' => (int)$customerType->id_customer_type,
            'name' => $name,
            'code' => (string)($customerType->code ?: self::normalizeRoleName($name)),
            'normalizedCode' => self::normalizeRoleName((string)($customerType->code ?: $name)),
        ]];
    }

    public static function getNormalizedRoleCodes(Customer $user): array
    {
        return array_values(array_unique(array_filter(array_map(static function (array $role): string {
            return (string)($role['normalizedCode'] ?? '');
        }, self::getAssignedRoles($user)))));
    }

    public static function getPrimaryRole(Customer $user): string
    {
        $roles = self::getAssignedRoles($user);
        return $roles ? (string)($roles[0]['name'] ?? '') : '';
    }

    public static function getUserPermissions(Customer $user): array
    {
        $userRoleId = (int)$user->id_customer_type;
        if ($userRoleId <= 0) {
            return [];
        }

        $rows = Permission::find()
            ->alias('permission')
            ->select(['permission.id', 'permission.name', 'permission.code', 'permission.group_key'])
            ->innerJoin(CustomerTypePermission::tableName() . ' customerTypePermission', 'customerTypePermission.permission_id = permission.id')
            ->where(['customerTypePermission.user_role_id' => $userRoleId, 'permission.status' => 1])
            ->orderBy(['permission.name' => SORT_ASC])
            ->distinct()
            ->asArray()
            ->all();

        return array_map(static function (array $permission): array {
            return [
                'id' => (int)$permission['id'],
                'name' => (string)$permission['name'],
                'code' => (string)$permission['code'],
                'groupKey' => (string)($permission['group_key'] ?? ''),
            ];
        }, $rows);
    }

    public static function userHasAnyRole(Customer $user, array $allowedRoles): bool
    {
        $userRoles = self::getNormalizedRoleCodes($user);
        if (!$userRoles) {
            return false;
        }

        foreach ($allowedRoles as $allowedRole) {
            if (in_array(self::normalizeRoleName((string)$allowedRole), $userRoles, true)) {
                return true;
            }
        }

        return false;
    }

    private static function resolveFallbackRoleName(Customer $user): string
    {
        $customerType = CustomerType::find()
            ->select(['name'])
            ->where(['id_user_role' => $user->id_customer_type])
            ->asArray()
            ->one();

        if (is_array($customerType) && !empty($customerType['name'])) {
            return (string)$customerType['name'];
        }

        switch ((int)$user->id_customer_type) {
            case 1:
                return 'Administrator';
            case 2:
                return 'Manager';
            case 3:
                return 'Users';
            case 4:
                return 'Support';
            case 5:
                return 'Restricted User';
            default:
                return '';
        }
    }
}
