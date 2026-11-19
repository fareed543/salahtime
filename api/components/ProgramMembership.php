<?php

namespace app\components;

use app\models\Customer;
use app\models\Program;
use app\models\ProgramCustomer;
use Yii;

/**
 * Program membership rules shared by the app API (HttpRamadanController) and the back office
 * (AdminCommunityController) — CR-024. Roles in bt_program_customer: 1 admin, 2 volunteer, 3 subscriber.
 */
class ProgramMembership
{
    public static function enrolledCount(Program $program): int
    {
        return (int)ProgramCustomer::find()
            ->where(['id_program' => $program->id, 'role' => 3, 'status' => 'enrolled'])
            ->count();
    }

    /** 'enrolled', 'waitlisted', or null when full with no waitlist. */
    public static function newSubscriberStatus(Program $program): ?string
    {
        $max = (int)$program->max_participants;
        if ($max <= 0 || self::enrolledCount($program) < $max) {
            return 'enrolled';
        }
        return (int)$program->waitlist_enabled ? 'waitlisted' : null;
    }

    /** Moves the earliest waitlisted subscribers up while seats are free. */
    public static function promoteFromWaitlist(Program $program): void
    {
        $max = (int)$program->max_participants;
        $free = $max <= 0 ? PHP_INT_MAX : $max - self::enrolledCount($program);
        if ($free <= 0) {
            return;
        }
        $waiting = ProgramCustomer::find()
            ->where(['id_program' => $program->id, 'role' => 3, 'status' => 'waitlisted'])
            ->orderBy(['created_at' => SORT_ASC, 'id' => SORT_ASC])
            ->limit($free === PHP_INT_MAX ? 1000 : $free)
            ->all();
        foreach ($waiting as $row) {
            $row->updateAttributes(['status' => 'enrolled']);
        }
    }

    /** Roles the customer holds in the program (ints). */
    public static function roles(Program $program, int $customerId): array
    {
        return array_map('intval', ProgramCustomer::find()
            ->select('role')
            ->where(['id_program' => $program->id, 'id_customer' => $customerId])
            ->column());
    }

    /**
     * Finds the account for a 10-digit mobile, or creates one (name + gender required) for someone not on
     * the app yet. Returns [Customer, created] or ['error' => message, 'key' => field].
     */
    public static function findOrCreateByPhone(array $data, int $createdBy): array
    {
        $phone = preg_replace('/\D+/', '', (string)($data['phone'] ?? ''));
        if (strlen($phone) === 12 && strpos($phone, '91') === 0) {
            $phone = substr($phone, 2);
        }
        if (!preg_match('/^[6-9][0-9]{9}$/', $phone)) {
            return ['error' => 'Enter a valid 10-digit mobile number starting with 6-9', 'key' => 'phone'];
        }

        $customer = Customer::find()->where(['username' => $phone])->orWhere(['phone' => $phone])->andWhere(['deleted' => 0])->one();
        if ($customer) {
            return [$customer, false];
        }

        $firstname = trim(preg_replace('/\s+/u', ' ', (string)($data['firstname'] ?? '')));
        $lastname = trim(preg_replace('/\s+/u', ' ', (string)($data['lastname'] ?? '')));
        $gender = (string)($data['gender'] ?? '');
        $namePattern = "/^[\\p{L}\\p{M}][\\p{L}\\p{M} .'-]*$/u";
        if (mb_strlen($firstname) < 2 || mb_strlen($firstname) > 50 || !preg_match($namePattern, $firstname)) {
            return ['error' => 'Enter the first name using letters only', 'key' => 'firstname'];
        }
        if ($lastname !== '' && (mb_strlen($lastname) > 50 || !preg_match($namePattern, $lastname))) {
            return ['error' => 'Enter the last name using letters only', 'key' => 'lastname'];
        }
        if (!in_array($gender, ['m', 'f'], true)) {
            return ['error' => 'Select a gender', 'key' => 'gender'];
        }

        $customer = new Customer();
        $customer->firstname = $firstname;
        $customer->lastname = $lastname;
        $customer->phone = $phone;
        $customer->username = $phone;
        $customer->email = '';
        $customer->gender = $gender;
        $customer->gender_confirmed = 1;
        $customer->password = Yii::$app->security->generateRandomString(24);
        $customer->image = 'no-image.jpg';
        $customer->active = 1;
        $customer->email_notification = 0;
        $customer->created_by = $createdBy;
        if (!$customer->save()) {
            Yii::error($customer->getErrors(), __METHOD__);
            return ['error' => 'Could not create the member.', 'key' => null];
        }
        return [$customer, true];
    }

    /**
     * Replaces the customer's volunteer / subscriber row with $newRole (2, 3, or 0 = remove).
     * $status is used for role 3. Promotes waitlisted subscribers when a subscriber seat frees up.
     */
    public static function setRole(Program $program, Customer $target, int $newRole, string $status, int $addedBy): void
    {
        $current = self::roles($program, (int)$target->id);
        $wasSubscriber = in_array(3, $current, true) && !in_array(2, $current, true);
        $transaction = Yii::$app->db->beginTransaction();
        try {
            ProgramCustomer::deleteAll(['id_program' => $program->id, 'id_customer' => $target->id, 'role' => [2, 3]]);
            if ($newRole !== 0) {
                $row = new ProgramCustomer();
                $row->id_program = $program->id;
                $row->id_customer = $target->id;
                $row->role = $newRole;
                $row->status = $newRole === 3 ? $status : 'enrolled';
                $row->added_by = $addedBy;
                $row->created_at = date('Y-m-d H:i:s');
                if (!$row->save()) {
                    throw new \RuntimeException(json_encode($row->getErrors()));
                }
            }
            $transaction->commit();
        } catch (\Throwable $e) {
            $transaction->rollBack();
            throw $e;
        }
        if ($wasSubscriber && $newRole !== 3) {
            self::promoteFromWaitlist($program);
        }
    }
}
