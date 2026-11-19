<?php

namespace app\components;

use app\models\Customer;
use app\models\Program;
use app\models\ProgramCustomer;
use Yii;
use yii\db\IntegrityException;
use yii\db\Query;

/**
 * NF-025 packet distribution rules (DST-R1 … DST-R6).
 *  - A subscriber has one token per program (numbered in enrolment order).
 *  - Packets per person are set per program day; default = the previous set day, else 1.
 *  - One collection per subscriber per program per IST day; a second attempt is refused.
 *  - The subscriber's daily pass is "ST1.<program>.<customer>.<yyyymmdd>.<sig>", signed with a server secret.
 */
class ProgramDistribution
{
    public const PASS_PREFIX = 'ST1';

    /** Today in the app time zone (Asia/Kolkata, api/config/web.php). */
    public static function today(): string
    {
        return date('Y-m-d');
    }

    public static function isProgramDay(Program $program, ?string $date = null): bool
    {
        $date = $date ?? self::today();
        return $date >= (string)$program->start_date && $date <= (string)$program->end_date
            && strtolower((string)($program->status ?: 'active')) === 'active';
    }

    /* ---------------------------------------------------------------- pass */

    public static function pass(int $programId, int $customerId, string $date): string
    {
        $body = self::PASS_PREFIX . '.' . $programId . '.' . $customerId . '.' . str_replace('-', '', $date);
        return $body . '.' . self::sign($body);
    }

    /** ['program' => int, 'customer' => int, 'date' => 'Y-m-d'] or null when the text is not a valid pass. */
    public static function readPass(string $pass): ?array
    {
        $pass = trim($pass);
        if (!preg_match('/^(ST1)\.(\d{1,10})\.(\d{1,10})\.(\d{8})\.([0-9a-f]{16})$/', $pass, $m)) {
            return null;
        }
        $body = "{$m[1]}.{$m[2]}.{$m[3]}.{$m[4]}";
        if (!hash_equals(self::sign($body), $m[5])) {
            return null;
        }
        $date = substr($m[4], 0, 4) . '-' . substr($m[4], 4, 2) . '-' . substr($m[4], 6, 2);
        return ['program' => (int)$m[2], 'customer' => (int)$m[3], 'date' => $date];
    }

    private static function sign(string $body): string
    {
        return substr(hash_hmac('sha256', $body, self::secret()), 0, 16);
    }

    /** params['programPassSecret'] (env), else a random key kept in api/runtime (never in git). */
    private static function secret(): string
    {
        $configured = (string)(Yii::$app->params['programPassSecret'] ?? '');
        if ($configured !== '') {
            return $configured;
        }
        $file = Yii::getAlias('@runtime') . '/program-pass.key';
        if (!is_file($file)) {
            @file_put_contents($file, bin2hex(random_bytes(32)), LOCK_EX);
        }
        $key = trim((string)@file_get_contents($file));
        if ($key === '') {
            throw new \RuntimeException('Program pass key is not available.');
        }
        return $key;
    }

    /* --------------------------------------------------------------- token */

    /** The subscriber's token in this program, given now (next number) if missing. */
    public static function ensureToken(Program $program, int $customerId): ?int
    {
        $row = ProgramCustomer::find()->where(['id_program' => $program->id, 'id_customer' => $customerId, 'role' => 3])->one();
        if (!$row) {
            return null;
        }
        if ($row->token !== null) {
            return (int)$row->token;
        }
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $next = (int)ProgramCustomer::find()->where(['id_program' => $program->id])->max('token') + 1;
            try {
                $row->updateAttributes(['token' => $next]);
                return $next;
            } catch (IntegrityException $e) {
                // Someone took that number at the same moment; try the next one.
            }
        }
        return null;
    }

    /* ---------------------------------------------------------------- day */

    /** ['packets' => int, 'set' => bool] for the date: its own value, else the latest earlier day, else 1. */
    public static function packetsPerPerson(Program $program, string $date): array
    {
        $own = (new Query())->select('packets_per_person')->from('bt_program_day')
            ->where(['id_program' => $program->id, 'date' => $date])->scalar();
        if ($own !== false && $own !== null) {
            return ['packets' => (int)$own, 'set' => true];
        }
        $previous = (new Query())->select('packets_per_person')->from('bt_program_day')
            ->where(['id_program' => $program->id])->andWhere(['<', 'date', $date])
            ->orderBy(['date' => SORT_DESC])->limit(1)->scalar();
        return ['packets' => $previous !== false && $previous !== null ? (int)$previous : 1, 'set' => false];
    }

    public static function setPacketsPerPerson(Program $program, string $date, int $packets, int $by): void
    {
        Yii::$app->db->createCommand()->upsert('bt_program_day', [
            'id_program' => (int)$program->id,
            'date' => $date,
            'packets_per_person' => $packets,
            'updated_by' => $by,
            'updated_at' => date('Y-m-d H:i:s'),
        ], [
            'packets_per_person' => $packets,
            'updated_by' => $by,
            'updated_at' => date('Y-m-d H:i:s'),
        ])->execute();
    }

    /* ------------------------------------------------------------- collect */

    /** The collection record of a subscriber on a date (with the recorder's name), or null. */
    public static function collection(int $programId, int $customerId, string $date): ?array
    {
        $row = (new Query())
            ->select(['sp.packets', 'sp.token', 'sp.collected_at', 'sp.created_at', 'sp.method', 'sp.recorded_by',
                'CONCAT_WS(\' \', rb.firstname, rb.lastname) AS recorded_by_name'])
            ->from(['sp' => 'bt_subscriber_packets'])
            ->leftJoin(['rb' => Customer::tableName()], 'rb.id = sp.recorded_by')
            ->where(['sp.id_program' => $programId, 'sp.id_customer' => $customerId, 'sp.date' => $date])
            ->one();
        if (!$row) {
            return null;
        }
        return [
            'packets' => (int)$row['packets'],
            'token' => $row['token'] !== null ? (int)$row['token'] : null,
            'at' => $row['collected_at'] ?: $row['created_at'],
            'method' => $row['method'] ?: 'manual',
            'by' => trim((string)$row['recorded_by_name']) ?: null,
        ];
    }

    /**
     * Records today's collection. Returns ['ok' => true, 'collection' => …] or
     * ['ok' => false, 'duplicate' => collection] when it was already collected today.
     */
    public static function collect(Program $program, Customer $member, int $by, string $method): array
    {
        $today = self::today();
        $existing = self::collection((int)$program->id, (int)$member->id, $today);
        if ($existing) {
            return ['ok' => false, 'duplicate' => $existing];
        }
        $token = self::ensureToken($program, (int)$member->id);
        $packets = self::packetsPerPerson($program, $today)['packets'];
        $now = date('Y-m-d H:i:s');
        try {
            Yii::$app->db->createCommand()->insert('bt_subscriber_packets', [
                'id_program' => (int)$program->id,
                'id_customer' => (int)$member->id,
                'token' => $token,
                'date' => $today,
                'packets' => $packets,
                'collected_at' => $now,
                'method' => $method,
                'recorded_by' => $by,
                'created_at' => $now,
                'updated_at' => $now,
            ])->execute();
        } catch (IntegrityException $e) {
            // Two volunteers scanned the same pass at the same moment: the unique key lets one through.
            return ['ok' => false, 'duplicate' => self::collection((int)$program->id, (int)$member->id, $today)];
        }
        return ['ok' => true, 'collection' => self::collection((int)$program->id, (int)$member->id, $today)];
    }

    /** Deletes a collection and logs why. Returns false when there was none. */
    public static function undo(Program $program, int $customerId, string $date, string $reason, int $by): bool
    {
        $row = (new Query())->from('bt_subscriber_packets')
            ->where(['id_program' => $program->id, 'id_customer' => $customerId, 'date' => $date])->one();
        if (!$row) {
            return false;
        }
        $transaction = Yii::$app->db->beginTransaction();
        try {
            Yii::$app->db->createCommand()->insert('bt_subscriber_packets_log', [
                'id_program' => (int)$program->id,
                'id_customer' => $customerId,
                'date' => $date,
                'packets' => (int)$row['packets'],
                'token' => $row['token'] !== null ? (int)$row['token'] : null,
                'action' => 'undo',
                'reason' => mb_substr($reason, 0, 255),
                'done_by' => $by,
                'done_at' => date('Y-m-d H:i:s'),
            ])->execute();
            Yii::$app->db->createCommand()->delete('bt_subscriber_packets', ['id' => (int)$row['id']])->execute();
            $transaction->commit();
        } catch (\Throwable $e) {
            $transaction->rollBack();
            throw $e;
        }
        return true;
    }

    /** Last $days collections of a subscriber in a program, newest first. */
    public static function history(int $programId, int $customerId, int $days = 7): array
    {
        $rows = (new Query())->select(['date', 'packets', 'collected_at', 'created_at'])->from('bt_subscriber_packets')
            ->where(['id_program' => $programId, 'id_customer' => $customerId])
            ->orderBy(['date' => SORT_DESC])->limit($days)->all();
        return array_map(static fn (array $row) => [
            'date' => $row['date'],
            'packets' => (int)$row['packets'],
            'at' => $row['collected_at'] ?: $row['created_at'],
        ], $rows);
    }
}
