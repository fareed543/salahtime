<?php

namespace app\controllers;

use app\components\BackofficeAccess;
use app\models\Customer;
use app\models\Halqa;
use app\models\HalqaMasjid;
use app\models\Masjid;
use app\models\MasjidCommitteeMember;
use app\models\MasjidDetail;
use app\models\MasjidTiming;
use app\models\Program;
use app\models\ProgramCustomer;
use Yii;
use yii\db\Query;
use yii\web\Controller;
use yii\web\Response;

/**
 * Back office management of community records (masjids and programs).
 *
 * Routes follow the API's `<controller>/<action>/<id>` convention:
 *   GET    admin-community/masjids                list (search, status, page, perPage)
 *   GET    admin-community/masjid/{id}            details
 *   PUT    admin-community/masjid/{id}            update
 *   DELETE admin-community/masjid/{id}            delete (details/timings/committee cascade in the DB)
 *   PATCH  admin-community/masjid-status/{id}     approve a pending masjid, or toggle active/inactive
 *   GET    admin-community/programs               list (search, type, state, page, perPage)
 *   GET    admin-community/program/{id}           details
 *   PUT    admin-community/program/{id}           update
 *   DELETE admin-community/program/{id}           delete with members and packet records
 *   GET    admin-community/halqa-options          area options for forms
 *
 * Access: administrator or manager (same as the Locations module).
 */
class AdminCommunityController extends Controller
{
    private const PROGRAM_TYPES = ['general', 'sehri', 'iftar'];
    private const PROGRAM_STATUSES = ['active', 'inactive', 'completed'];
    private const MASJID_STATUS = [
        'active' => Masjid::STATUS_ACTIVE,
        'inactive' => Masjid::STATUS_INACTIVE,
        'pending' => Masjid::STATUS_PENDING,
    ];

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
        $this->enableCsrfValidation = false;
        return parent::beforeAction($action);
    }

    /* ------------------------------------------------------------------ */
    /* Masjids                                                             */
    /* ------------------------------------------------------------------ */

    public function actionMasjids()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $query = Masjid::find()->alias('masjid');
        $this->applySearch($query, ['masjid.name', 'masjid.area', 'masjid.city', 'masjid.pincode', 'masjid.address']);
        $status = trim((string)Yii::$app->request->get('status', ''));
        if (isset(self::MASJID_STATUS[$status])) {
            $query->andWhere(['masjid.status' => self::MASJID_STATUS[$status]]);
        }

        $pagination = $this->paginate($query);
        $masjids = $query
            ->orderBy(['masjid.updated_at' => SORT_DESC, 'masjid.id' => SORT_DESC])
            ->offset($pagination['offset'])
            ->limit($pagination['perPage'])
            ->all();

        $ids = array_map(static fn (Masjid $masjid) => (int)$masjid->id, $masjids);
        $timingCounts = $this->countBy('bt_masjid_timing', 'id_masjid', $ids);
        $owners = $this->customerNames(array_map(static fn (Masjid $masjid) => (int)$masjid->id_customer, $masjids));

        return [
            'items' => array_map(function (Masjid $masjid) use ($timingCounts, $owners) {
                return $this->serializeMasjidRow($masjid, $timingCounts, $owners);
            }, $masjids),
            'summary' => [
                'total' => (int)Masjid::find()->count(),
                'active' => (int)Masjid::find()->where(['status' => Masjid::STATUS_ACTIVE])->count(),
                'inactive' => (int)Masjid::find()->where(['status' => Masjid::STATUS_INACTIVE])->count(),
                'pending' => (int)Masjid::find()->where(['status' => Masjid::STATUS_PENDING])->count(),
            ],
            'pagination' => $pagination['response'],
        ];
    }

    public function actionMasjid(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $masjid = Masjid::findOne(['id' => $id]);
        if (!$masjid) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Masjid not found.'];
        }

        if (Yii::$app->request->isDelete) {
            $transaction = Yii::$app->db->beginTransaction();
            try {
                // Area links have no FK cascade; details, timings and committee cascade in the DB.
                HalqaMasjid::deleteAll(['id_masjid' => $masjid->id]);
                if ($masjid->delete() === false) {
                    throw new \RuntimeException('Masjid delete failed.');
                }
                $transaction->commit();
            } catch (\Throwable $exception) {
                $transaction->rollBack();
                Yii::error($exception->getMessage(), __METHOD__);
                Yii::$app->response->statusCode = 500;
                return ['error' => 'Unable to delete the masjid.'];
            }

            return ['message' => 'Masjid deleted successfully.'];
        }

        if (Yii::$app->request->isPut) {
            return $this->saveMasjid($masjid);
        }

        return $this->serializeMasjidDetail($masjid);
    }

    public function actionMasjidStatus(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $masjid = Masjid::findOne(['id' => $id]);
        if (!$masjid) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Masjid not found.'];
        }

        $wasPending = (int)$masjid->status === Masjid::STATUS_PENDING;
        $masjid->status = (int)$masjid->status === Masjid::STATUS_ACTIVE ? Masjid::STATUS_INACTIVE : Masjid::STATUS_ACTIVE;
        if (!$masjid->save(false, ['status'])) {
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Unable to update the masjid status.'];
        }

        return [
            'message' => $wasPending ? 'Masjid approved.' : ((int)$masjid->status === Masjid::STATUS_ACTIVE ? 'Masjid activated.' : 'Masjid deactivated.'),
            'status' => $this->masjidStatusName($masjid),
            'isActive' => (int)$masjid->status === Masjid::STATUS_ACTIVE,
        ];
    }

    /* ------------------------------------------------------------------ */
    /* Programs                                                            */
    /* ------------------------------------------------------------------ */

    public function actionPrograms()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $today = date('Y-m-d');
        $query = Program::find()->alias('program');
        $this->applySearch($query, ['program.name', 'program.code', 'program.contact_number', 'program.email']);

        $type = trim((string)Yii::$app->request->get('type', ''));
        if (in_array($type, self::PROGRAM_TYPES, true)) {
            $query->andWhere(['program.program_type' => $type]);
        }

        // "Ended" is derived from end_date; it is not a stored status.
        $state = trim((string)Yii::$app->request->get('state', ''));
        if ($state === 'active') {
            $query->andWhere(['program.status' => 'active'])->andWhere(['>=', 'program.end_date', $today]);
        } elseif ($state === 'ended') {
            $query->andWhere(['<', 'program.end_date', $today]);
        } elseif ($state === 'inactive') {
            $query->andWhere(['program.status' => ['inactive', 'completed']])->andWhere(['>=', 'program.end_date', $today]);
        }

        $pagination = $this->paginate($query);
        $programs = $query
            ->orderBy(['program.start_date' => SORT_DESC, 'program.id' => SORT_DESC])
            ->offset($pagination['offset'])
            ->limit($pagination['perPage'])
            ->all();

        $ids = array_map(static fn (Program $program) => (int)$program->id, $programs);
        $memberCounts = $this->countBy('bt_program_customer', 'id_program', $ids);
        $packetCounts = $this->countBy('bt_subscriber_packets', 'id_program', $ids);
        $owners = $this->customerNames(array_map(static fn (Program $program) => (int)$program->id_customer, $programs));
        $halqas = $this->halqaNames(array_map(static fn (Program $program) => (int)$program->id_halqa, $programs));

        return [
            'items' => array_map(function (Program $program) use ($memberCounts, $packetCounts, $owners, $halqas) {
                return $this->serializeProgramRow($program, $memberCounts, $packetCounts, $owners, $halqas);
            }, $programs),
            'summary' => [
                'total' => (int)Program::find()->count(),
                'active' => (int)Program::find()->where(['status' => 'active'])->andWhere(['>=', 'end_date', $today])->count(),
                'ended' => (int)Program::find()->where(['<', 'end_date', $today])->count(),
            ],
            'pagination' => $pagination['response'],
        ];
    }

    public function actionProgram(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $program = Program::findOne(['id' => $id]);
        if (!$program) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Program not found.'];
        }

        if (Yii::$app->request->isDelete) {
            // Back office admins may delete any program, ended or not. Members and packet
            // history go with it, so the confirmation in the UI shows both counts first.
            $transaction = Yii::$app->db->beginTransaction();
            try {
                Yii::$app->db->createCommand()->delete('bt_subscriber_packets', ['id_program' => $program->id])->execute();
                ProgramCustomer::deleteAll(['id_program' => $program->id]);
                if ($program->delete() === false) {
                    throw new \RuntimeException('Program delete failed.');
                }
                $transaction->commit();
            } catch (\Throwable $exception) {
                $transaction->rollBack();
                Yii::error($exception->getMessage(), __METHOD__);
                Yii::$app->response->statusCode = 500;
                return ['error' => 'Unable to delete the program.'];
            }

            return ['message' => 'Program deleted successfully.'];
        }

        if (Yii::$app->request->isPut) {
            return $this->saveProgram($program);
        }

        return $this->serializeProgramDetail($program);
    }

    public function actionHalqaOptions()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        return array_map(static function (array $row): array {
            return ['id' => (int)$row['id'], 'name' => (string)$row['name']];
        }, (new Query())->select(['id', 'name'])->from(Halqa::tableName())->orderBy(['name' => SORT_ASC])->all());
    }

    /* ------------------------------------------------------------------ */
    /* Save                                                                */
    /* ------------------------------------------------------------------ */

    private function saveMasjid(Masjid $masjid): array
    {
        $payload = Yii::$app->request->getBodyParams();

        $masjid->name = trim((string)($payload['name'] ?? ''));
        $masjid->address = $this->nullable($payload['address'] ?? null);
        $masjid->area = $this->nullable($payload['area'] ?? null);
        $masjid->city = $this->nullable($payload['city'] ?? null);
        $masjid->state = $this->nullable($payload['state'] ?? null);
        $masjid->pincode = $this->nullable($payload['pincode'] ?? null);
        $masjid->country = $this->nullable($payload['country'] ?? null);
        $status = (string)($payload['status'] ?? '');
        if (isset(self::MASJID_STATUS[$status])) {
            $masjid->status = self::MASJID_STATUS[$status];
        }
        $masjid->id_halqa = $this->nullableInt($payload['idHalqa'] ?? null);

        $transaction = Yii::$app->db->beginTransaction();
        try {
            if (!$masjid->save()) {
                $transaction->rollBack();
                Yii::$app->response->statusCode = 422;
                return ['error' => $this->firstModelError($masjid) ?: 'Please check the masjid details.'];
            }

            $detail = MasjidDetail::findOne(['id_masjid' => $masjid->id]) ?? new MasjidDetail(['id_masjid' => $masjid->id]);
            $detail->email = $this->nullable($payload['email'] ?? null);
            $detail->contact = $this->nullable($payload['contact'] ?? null);
            $detail->location = $this->nullable($payload['location'] ?? null);
            $facilities = (array)($payload['facilities'] ?? []);
            $detail->wazu_khana = !empty($facilities['wazuKhana']);
            $detail->toilet = !empty($facilities['toilet']);
            $detail->gusl_khana = !empty($facilities['guslKhana']);
            $detail->air_conditioners = !empty($facilities['airConditioners']);
            $detail->chairs = !empty($facilities['chairs']);
            $detail->ladies_jamat = !empty($facilities['ladiesJamat']);
            $detail->stay_nearby = !empty($facilities['stayNearby']);
            if (!$detail->save()) {
                throw new \InvalidArgumentException($this->firstModelError($detail) ?: 'Please check the contact details.');
            }

            if (array_key_exists('timings', $payload)) {
                MasjidTiming::deleteAll(['id_masjid' => $masjid->id]);
                foreach (array_values((array)$payload['timings']) as $index => $timing) {
                    $salah = trim((string)($timing['salah'] ?? ''));
                    if ($salah === '') {
                        continue;
                    }
                    $row = new MasjidTiming([
                        'id_masjid' => $masjid->id,
                        'salah' => $salah,
                        'azan_time' => $this->nullable($timing['azan'] ?? null),
                        'jamat_time' => $this->nullable($timing['jamat'] ?? null),
                        'sort_order' => $index,
                    ]);
                    if (!$row->save()) {
                        throw new \InvalidArgumentException($this->firstModelError($row) ?: 'Please check the timings.');
                    }
                }
            }

            if (array_key_exists('committee', $payload)) {
                MasjidCommitteeMember::deleteAll(['id_masjid' => $masjid->id]);
                foreach (array_values((array)$payload['committee']) as $index => $member) {
                    $name = trim((string)($member['name'] ?? ''));
                    $role = trim((string)($member['role'] ?? ''));
                    if ($name === '' || $role === '') {
                        continue;
                    }
                    $row = new MasjidCommitteeMember([
                        'id_masjid' => $masjid->id,
                        'name' => $name,
                        'role' => $role,
                        'phone' => $this->nullable($member['phone'] ?? null),
                        'sort_order' => $index,
                    ]);
                    if (!$row->save()) {
                        throw new \InvalidArgumentException($this->firstModelError($row) ?: 'Please check the committee members.');
                    }
                }
            }

            $transaction->commit();
        } catch (\InvalidArgumentException $exception) {
            $transaction->rollBack();
            Yii::$app->response->statusCode = 422;
            return ['error' => $exception->getMessage()];
        } catch (\Throwable $exception) {
            $transaction->rollBack();
            Yii::error($exception->getMessage(), __METHOD__);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Unable to save the masjid.'];
        }

        $masjid->refresh();
        return ['message' => 'Masjid saved successfully.', 'item' => $this->serializeMasjidDetail($masjid)];
    }

    private function saveProgram(Program $program): array
    {
        $payload = Yii::$app->request->getBodyParams();

        $type = (string)($payload['programType'] ?? 'general');
        $status = (string)($payload['status'] ?? 'active');
        $startDate = trim((string)($payload['startDate'] ?? ''));
        $endDate = trim((string)($payload['endDate'] ?? ''));

        if ($startDate !== '' && $endDate !== '' && $endDate < $startDate) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'End date must be on or after the start date.'];
        }

        $program->name = trim((string)($payload['name'] ?? ''));
        $program->code = trim((string)($payload['code'] ?? ''));
        $program->program_type = in_array($type, self::PROGRAM_TYPES, true) ? $type : 'general';
        $program->status = in_array($status, self::PROGRAM_STATUSES, true) ? $status : 'active';
        $program->start_date = $startDate;
        $program->end_date = $endDate;
        $program->id_halqa = (int)($payload['idHalqa'] ?? $program->id_halqa);
        $program->contact_number = $this->nullable($payload['contactNumber'] ?? null);
        $program->email = $this->nullable($payload['email'] ?? null);
        $program->description = $this->nullable($payload['description'] ?? null);
        $program->registration_allowed = !empty($payload['registrationAllowed']) ? 1 : 0;
        $program->waitlist_enabled = !empty($payload['waitlistEnabled']) ? 1 : 0;
        $program->max_participants = max(1, (int)($payload['maxParticipants'] ?? 100));

        if (!$program->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($program) ?: 'Please check the program details.'];
        }

        $program->refresh();
        return ['message' => 'Program saved successfully.', 'item' => $this->serializeProgramDetail($program)];
    }

    /* ------------------------------------------------------------------ */
    /* Serialization                                                       */
    /* ------------------------------------------------------------------ */

    private function serializeMasjidRow(Masjid $masjid, array $timingCounts, array $owners): array
    {
        return [
            'id' => (int)$masjid->id,
            'name' => (string)$masjid->name,
            'area' => (string)($masjid->area ?? ''),
            'city' => (string)($masjid->city ?? ''),
            'state' => (string)($masjid->state ?? ''),
            'pincode' => (string)($masjid->pincode ?? ''),
            'status' => $this->masjidStatusName($masjid),
            'isActive' => (int)$masjid->status === Masjid::STATUS_ACTIVE,
            'ownerName' => $owners[(int)$masjid->id_customer] ?? '',
            'timingsCount' => $timingCounts[(int)$masjid->id] ?? 0,
            'updatedAt' => $masjid->updated_at,
        ];
    }

    private function serializeMasjidDetail(Masjid $masjid): array
    {
        $detail = MasjidDetail::findOne(['id_masjid' => $masjid->id]);
        // These tables use id_masjid_timing / id_masjid_committee_member as primary keys.
        $timings = MasjidTiming::find()->where(['id_masjid' => $masjid->id])->orderBy(['sort_order' => SORT_ASC, 'id_masjid_timing' => SORT_ASC])->all();
        $committee = MasjidCommitteeMember::find()->where(['id_masjid' => $masjid->id])->orderBy(['sort_order' => SORT_ASC, 'id_masjid_committee_member' => SORT_ASC])->all();
        $owners = $this->customerNames([(int)$masjid->id_customer]);

        return [
            'id' => (int)$masjid->id,
            'name' => (string)$masjid->name,
            'address' => (string)($masjid->address ?? ''),
            'area' => (string)($masjid->area ?? ''),
            'city' => (string)($masjid->city ?? ''),
            'state' => (string)($masjid->state ?? ''),
            'pincode' => (string)($masjid->pincode ?? ''),
            'country' => (string)($masjid->country ?? ''),
            'status' => $this->masjidStatusName($masjid),
            'isActive' => (int)$masjid->status === Masjid::STATUS_ACTIVE,
            'idHalqa' => $masjid->id_halqa !== null ? (int)$masjid->id_halqa : null,
            'ownerName' => $owners[(int)$masjid->id_customer] ?? '',
            'email' => (string)($detail->email ?? ''),
            'contact' => (string)($detail->contact ?? ''),
            'location' => (string)($detail->location ?? ''),
            'facilities' => [
                'wazuKhana' => (bool)($detail->wazu_khana ?? false),
                'toilet' => (bool)($detail->toilet ?? false),
                'guslKhana' => (bool)($detail->gusl_khana ?? false),
                'airConditioners' => (bool)($detail->air_conditioners ?? false),
                'chairs' => (bool)($detail->chairs ?? false),
                'ladiesJamat' => (bool)($detail->ladies_jamat ?? false),
                'stayNearby' => (bool)($detail->stay_nearby ?? false),
            ],
            'timings' => array_map(static function (MasjidTiming $timing): array {
                return [
                    'salah' => (string)$timing->salah,
                    'azan' => (string)($timing->azan_time ?? ''),
                    'jamat' => (string)($timing->jamat_time ?? ''),
                ];
            }, $timings),
            'committee' => array_map(static function (MasjidCommitteeMember $member): array {
                return [
                    'name' => (string)$member->name,
                    'role' => (string)$member->role,
                    'phone' => (string)($member->phone ?? ''),
                ];
            }, $committee),
            'createdAt' => $masjid->created_at,
            'updatedAt' => $masjid->updated_at,
        ];
    }

    private function serializeProgramRow(Program $program, array $memberCounts, array $packetCounts, array $owners, array $halqas): array
    {
        return [
            'id' => (int)$program->id,
            'name' => (string)$program->name,
            'code' => (string)$program->code,
            'programType' => (string)$program->program_type,
            'status' => (string)$program->status,
            'state' => $this->programState($program),
            'startDate' => $program->start_date,
            'endDate' => $program->end_date,
            'ownerName' => $owners[(int)$program->id_customer] ?? '',
            'halqaName' => $halqas[(int)$program->id_halqa] ?? '',
            'memberCount' => $memberCounts[(int)$program->id] ?? 0,
            'packetRecordCount' => $packetCounts[(int)$program->id] ?? 0,
        ];
    }

    private function serializeProgramDetail(Program $program): array
    {
        $ids = [(int)$program->id];
        $owners = $this->customerNames([(int)$program->id_customer]);
        $roleCounts = (new Query())
            ->select(['total' => 'COUNT(*)', 'role']) // column() returns the first column, keyed by role
            ->from(ProgramCustomer::tableName())
            ->where(['id_program' => $program->id])
            ->groupBy('role')
            ->indexBy('role')
            ->column();

        return [
            'id' => (int)$program->id,
            'name' => (string)$program->name,
            'code' => (string)$program->code,
            'programType' => (string)$program->program_type,
            'status' => (string)$program->status,
            'state' => $this->programState($program),
            'startDate' => $program->start_date,
            'endDate' => $program->end_date,
            'idHalqa' => (int)$program->id_halqa,
            'contactNumber' => (string)($program->contact_number ?? ''),
            'email' => (string)($program->email ?? ''),
            'description' => (string)($program->description ?? ''),
            'registrationAllowed' => (int)$program->registration_allowed === 1,
            'waitlistEnabled' => (int)$program->waitlist_enabled === 1,
            'maxParticipants' => (int)$program->max_participants,
            'ownerName' => $owners[(int)$program->id_customer] ?? '',
            'members' => [
                'organizers' => (int)($roleCounts[1] ?? 0),
                'volunteers' => (int)($roleCounts[2] ?? 0),
                'subscribers' => (int)($roleCounts[3] ?? 0),
            ],
            'packetRecordCount' => $this->countBy('bt_subscriber_packets', 'id_program', $ids)[(int)$program->id] ?? 0,
            'createdAt' => $program->created_at,
        ];
    }

    private function masjidStatusName(Masjid $masjid): string
    {
        return array_search((int)$masjid->status, self::MASJID_STATUS, true) ?: 'inactive';
    }

    private function programState(Program $program): string
    {
        if (!empty($program->end_date) && $program->end_date < date('Y-m-d')) {
            return 'ended';
        }

        return $program->status === 'active' ? 'active' : 'inactive';
    }

    /* ------------------------------------------------------------------ */
    /* Helpers (mirrors AdminLocationsController)                          */
    /* ------------------------------------------------------------------ */

    /** @return array<int,int> id => count */
    private function countBy(string $table, string $column, array $ids): array
    {
        $ids = array_values(array_unique(array_filter($ids)));
        if (!$ids) {
            return [];
        }

        $rows = (new Query())
            ->select([$column, 'total' => 'COUNT(*)'])
            ->from($table)
            ->where([$column => $ids])
            ->groupBy($column)
            ->all();

        $counts = [];
        foreach ($rows as $row) {
            $counts[(int)$row[$column]] = (int)$row['total'];
        }
        return $counts;
    }

    /** @return array<int,string> customer id => display name */
    private function customerNames(array $ids): array
    {
        $ids = array_values(array_unique(array_filter($ids)));
        if (!$ids) {
            return [];
        }

        $names = [];
        foreach ((new Query())->select(['id', 'firstname', 'lastname'])->from(Customer::tableName())->where(['id' => $ids])->all() as $row) {
            $names[(int)$row['id']] = trim($row['firstname'] . ' ' . ($row['lastname'] ?? ''));
        }
        return $names;
    }

    /** @return array<int,string> halqa id => name */
    private function halqaNames(array $ids): array
    {
        $ids = array_values(array_unique(array_filter($ids)));
        if (!$ids) {
            return [];
        }

        return array_map('strval', (new Query())->select(['name', 'id'])->from(Halqa::tableName())->where(['id' => $ids])->indexBy('id')->column());
    }

    private function paginate($query): array
    {
        $page = max(1, (int)Yii::$app->request->get('page', 1));
        $perPage = max(1, min(100, (int)Yii::$app->request->get('perPage', 10)));
        $total = (int)(clone $query)->count();

        return [
            'offset' => ($page - 1) * $perPage,
            'perPage' => $perPage,
            'response' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => max(1, (int)ceil($total / $perPage)),
            ],
        ];
    }

    private function applySearch($query, array $columns): void
    {
        $search = trim((string)Yii::$app->request->get('search', ''));
        if ($search === '') {
            return;
        }

        $parts = ['or'];
        foreach ($columns as $column) {
            $parts[] = ['like', $column, $search];
        }
        $query->andWhere($parts);
    }

    private function applyStatus($query, string $column): void
    {
        $status = trim((string)Yii::$app->request->get('status', ''));
        if ($status === 'active') {
            $query->andWhere([$column => 1]);
        } elseif ($status === 'inactive') {
            $query->andWhere([$column => 0]);
        }
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

        if (!BackofficeAccess::userHasAnyRole($user, ['administrator', 'manager'])) {
            Yii::$app->response->statusCode = 403;
            return ['error' => 'You do not have permission to access this back office resource.'];
        }

        return $user;
    }

    private function nullable($value): ?string
    {
        $value = trim((string)$value);
        return $value === '' ? null : $value;
    }

    private function nullableInt($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int)$value;
    }

    private function firstModelError($model): string
    {
        $errors = $model->getFirstErrors();
        return $errors ? (string)reset($errors) : '';
    }
}
