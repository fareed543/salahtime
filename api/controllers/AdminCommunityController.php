<?php

namespace app\controllers;

use app\components\BackofficeAccess;
use app\models\Customer;
use app\models\Halqa;
use app\models\HalqaMasjid;
use app\models\Masjid;
use app\models\MasjidCommitteeMember;
use app\models\MasjidDetail;
use app\models\MasjidImage;
use app\models\MasjidTiming;
use app\models\Program;
use app\models\ProgramCustomer;
use app\components\MasjidMedia;
use app\components\ProgramMembership;
use app\components\MasjidSlug;
use app\components\MasjidTimings;
use app\components\TimingBoardReader;
use Yii;
use yii\db\Query;
use yii\web\Controller;
use yii\web\Response;
use yii\web\UploadedFile;

/**
 * Back office management of community records (masjids and programs).
 *
 * Routes follow the API's `<controller>/<action>/<id>` convention:
 *   GET    admin-community/masjids                list (search, status, page, perPage)
 *   GET    admin-community/masjid/{id}            details
 *   PUT    admin-community/masjid/{id}            update
 *   DELETE admin-community/masjid/{id}            delete (details/timings/committee cascade in the DB)
 *   PATCH  admin-community/masjid-status/{id}     approve a pending masjid, or toggle active/inactive
 *   POST   admin-community/masjid-timing-capture/{id}   multipart image -> draft timings read from the photo
 *   GET    admin-community/masjid-timing-versions/{id}  timing history, newest first
 *   POST   admin-community/masjid-timing-restore/{id}   {versionId} -> make that version current
 *   POST   admin-community/masjid-images/{id}           multipart image -> add a slideshow photo
 *   DELETE admin-community/masjid-image/{imageId}       remove a slideshow photo
 *   GET    admin-community/programs               list (search, type, state, page, perPage)
 *   GET    admin-community/program/{id}           details
 *   PUT    admin-community/program/{id}           update
 *   DELETE admin-community/program/{id}           delete with members and packet records
 *   GET    admin-community/program-members/{id}   members, search name/mobile, role + gender filter (CR-024)
 *   POST   admin-community/program-member-add/{id}    add a subscriber by mobile (CR-024)
 *   POST   admin-community/program-member-role/{id}   volunteer / subscriber / remove (CR-024)
 *   GET    admin-community/halqa-options          area options for forms
 *   GET    admin-community/member-export-options  masjids with members, for the export dialog (NF-016)
 *   POST   admin-community/member-export          members per masjid, filtered by masjid/gender/profession (NF-016)
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
        $imageCounts = $this->countBy('bt_masjid_image', 'id_masjid', $ids);
        $owners = $this->customerNames(array_map(static fn (Masjid $masjid) => (int)$masjid->id_customer, $masjids));
        // First gallery photo per masjid, for the card view (one query for the page).
        $covers = [];
        if ($ids) {
            foreach (MasjidImage::find()->where(['id_masjid' => $ids])->orderBy(['sort_order' => SORT_ASC, 'id_masjid_image' => SORT_ASC])->all() as $image) {
                $covers[(int)$image->id_masjid] = $covers[(int)$image->id_masjid] ?? ($image->thumb_url ?: $image->image_url);
            }
        }

        return [
            'items' => array_map(function (Masjid $masjid) use ($timingCounts, $imageCounts, $owners, $covers) {
                return $this->serializeMasjidRow($masjid, $timingCounts, $owners) + [
                    'imagesCount' => $imageCounts[(int)$masjid->id] ?? 0,
                    'coverImageUrl' => $covers[(int)$masjid->id] ?? null,
                ];
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

            MasjidMedia::deleteMasjidFolders($id);
            return ['message' => 'Masjid deleted successfully.'];
        }

        if (Yii::$app->request->isPut) {
            return $this->saveMasjid($masjid, $admin);
        }

        return $this->serializeMasjidDetail($masjid);
    }

    /** Multipart {image}: stores a timing-board photo and returns draft timings read from it. */
    public function actionMasjidTimingCapture(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $masjid = $this->adminMasjid($id);
        if (!$masjid instanceof Masjid) {
            return $masjid;
        }

        $file = UploadedFile::getInstanceByName('image');
        $error = MasjidMedia::validate($file);
        if ($error) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $error];
        }

        MasjidTimings::sweepUnusedBoardPhotos((int)$masjid->id);
        $stored = MasjidMedia::saveTimingBoardImage($file, (int)$masjid->id);
        $result = ['imageUrl' => $stored['url'], 'timings' => [], 'notes' => '', 'readError' => null];
        try {
            $read = TimingBoardReader::read($stored['path'], $stored['mime']);
            $result['timings'] = $read['timings'];
            $result['notes'] = $read['notes'];
        } catch (\RuntimeException $e) {
            $result['readError'] = $e->getMessage();
        }
        return $result;
    }

    public function actionMasjidTimingVersions(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $masjid = $this->adminMasjid($id);
        if (!$masjid instanceof Masjid) {
            return $masjid;
        }
        return ['versions' => MasjidTimings::versions((int)$masjid->id)];
    }

    /** {versionId}: makes an earlier timing version current again (recorded as a new version). */
    public function actionMasjidTimingRestore(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }
        $masjid = $this->adminMasjid($id);
        if (!$masjid instanceof Masjid) {
            return $masjid;
        }

        $versionId = (int)(Yii::$app->request->getBodyParams()['versionId'] ?? 0);
        if (!MasjidTimings::restore((int)$masjid->id, $versionId, (int)$admin->id)) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Timing version not found.'];
        }
        return ['message' => 'Timings restored.', 'item' => $this->serializeMasjidDetail($masjid)];
    }

    /** Multipart {image}: adds a photo to the masjid's slideshow. */
    public function actionMasjidImages(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }
        $masjid = $this->adminMasjid($id);
        if (!$masjid instanceof Masjid) {
            return $masjid;
        }

        if ((int)MasjidImage::find()->where(['id_masjid' => $masjid->id])->count() >= MasjidMedia::MAX_GALLERY_IMAGES) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'A masjid can have up to ' . MasjidMedia::MAX_GALLERY_IMAGES . ' photos.'];
        }

        $file = UploadedFile::getInstanceByName('image');
        $error = MasjidMedia::validate($file);
        if ($error) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $error];
        }

        $stored = MasjidMedia::saveGalleryImage($file, (int)$masjid->id);
        $image = new MasjidImage($stored);
        $image->id_masjid = (int)$masjid->id;
        $image->id_customer = (int)$admin->id;
        $image->sort_order = (int)MasjidImage::find()->where(['id_masjid' => $masjid->id])->max('sort_order') + 1;
        if (!$image->save()) {
            MasjidMedia::deleteByUrl($stored['image_url']);
            MasjidMedia::deleteByUrl($stored['thumb_url']);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Unable to save the photo.'];
        }

        Yii::$app->response->statusCode = 201;
        return $image->serialize();
    }

    /** DELETE: removes a slideshow photo; $id is the image id. */
    public function actionMasjidImage(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $image = MasjidImage::findOne(['id_masjid_image' => $id]);
        if (!$image) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Photo not found.'];
        }
        if (!Yii::$app->request->isDelete) {
            Yii::$app->response->statusCode = 405;
            return ['error' => 'Use DELETE to remove a photo.'];
        }

        MasjidMedia::deleteByUrl($image->image_url);
        MasjidMedia::deleteByUrl($image->thumb_url);
        $image->delete();
        return ['message' => 'Photo removed.'];
    }

    /** Admin check plus masjid lookup; returns the Masjid or an error array to return as-is. */
    private function adminMasjid(int $id)
    {
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }
        $masjid = Masjid::findOne(['id' => $id]);
        if (!$masjid) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Masjid not found.'];
        }
        return $masjid;
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

    /**
     * CR-024: GET admin-community/program-members/{id}?search=&role=&gender=
     * Everyone in the program (admin, volunteers, subscribers incl. waitlisted) with counts.
     * search matches first / last / full name and mobile.
     */
    public function actionProgramMembers(int $id)
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

        $query = (new Query())
            ->select(['c.id', 'c.firstname', 'c.lastname', 'c.phone', 'c.gender', 'pc.role', 'pc.status', 'pc.created_at'])
            ->from(['pc' => ProgramCustomer::tableName()])
            ->innerJoin(['c' => Customer::tableName()], 'c.id = pc.id_customer')
            ->where(['pc.id_program' => $program->id]);

        $search = trim((string)Yii::$app->request->get('search', ''));
        if ($search !== '') {
            $digits = preg_replace('/\D+/', '', $search);
            $condition = ['or',
                ['like', 'c.firstname', $search],
                ['like', 'c.lastname', $search],
                ['like', new \yii\db\Expression("CONCAT_WS(' ', c.firstname, c.lastname)"), $search],
            ];
            // Mobile search only when the text is a number (+91, spaces and dashes allowed), not "NF012" in a name.
            if (strlen($digits) >= 3 && preg_match('/^[+\d\s-]+$/', $search)) {
                $condition[] = ['like', 'c.phone', $digits];
            }
            $query->andWhere($condition);
        }
        $gender = (string)Yii::$app->request->get('gender', '');
        if (in_array($gender, ['m', 'f'], true)) {
            $query->andWhere(['c.gender' => $gender]);
        }

        // One row per person: keep the strongest role (1 admin > 2 volunteer > 3 subscriber).
        $people = [];
        foreach ($query->orderBy(['pc.role' => SORT_ASC, 'c.firstname' => SORT_ASC])->all() as $row) {
            $personId = (int)$row['id'];
            if (isset($people[$personId])) {
                continue;
            }
            $role = (int)$row['role'];
            if ($personId === (int)$program->id_customer) {
                $role = 1;
            }
            $people[$personId] = [
                'id' => $personId,
                'name' => trim($row['firstname'] . ' ' . $row['lastname']),
                'phone' => (string)$row['phone'],
                'gender' => (string)$row['gender'],
                'role' => $role,
                'status' => $role === 3 ? ((string)$row['status'] ?: 'enrolled') : 'enrolled',
                'addedAt' => $row['created_at'],
            ];
        }

        $roleFilter = (string)Yii::$app->request->get('role', '');
        $counts = ['total' => count($people), 'admins' => 0, 'volunteers' => 0, 'subscribers' => 0, 'waitlisted' => 0];
        foreach ($people as $person) {
            if ($person['role'] === 1) {
                $counts['admins']++;
            } elseif ($person['role'] === 2) {
                $counts['volunteers']++;
            } elseif ($person['status'] === 'waitlisted') {
                $counts['waitlisted']++;
            } else {
                $counts['subscribers']++;
            }
        }
        $items = array_values(array_filter($people, static function (array $person) use ($roleFilter) {
            switch ($roleFilter) {
                case 'volunteers': return $person['role'] === 2;
                case 'subscribers': return $person['role'] === 3 && $person['status'] !== 'waitlisted';
                case 'waitlist': return $person['status'] === 'waitlisted';
                default: return true;
            }
        }));

        return [
            'items' => $items,
            'counts' => $counts,
            'seatsLeft' => (int)$program->max_participants > 0
                ? max(0, (int)$program->max_participants - ProgramMembership::enrolledCount($program))
                : null,
        ];
    }

    /**
     * CR-024: POST admin-community/program-member-add/{id} {phone, firstname?, lastname?, gender?, force?}
     * Adds a subscriber by mobile (an existing account, or a new one with name + gender).
     * Follows the capacity rule; force = true enrols even when the program is full.
     */
    public function actionProgramMemberAdd(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            return ['error' => 'Use POST.'];
        }
        $program = Program::findOne(['id' => $id]);
        if (!$program) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Program not found.'];
        }

        $payload = Yii::$app->request->getBodyParams();
        $found = ProgramMembership::findOrCreateByPhone($payload, (int)$admin->id);
        if (isset($found['error'])) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $found['error'], 'key' => $found['key']];
        }
        [$customer, $created] = $found;

        if (ProgramMembership::roles($program, (int)$customer->id) || (int)$customer->id === (int)$program->id_customer) {
            Yii::$app->response->statusCode = 409;
            return ['error' => 'Already a member of this program.', 'code' => 'already_member'];
        }

        $status = ProgramMembership::newSubscriberStatus($program);
        if ($status === null) {
            if (empty($payload['force'])) {
                Yii::$app->response->statusCode = 422;
                return ['error' => 'This program is full.', 'code' => 'program_full'];
            }
            $status = 'enrolled';
        }

        try {
            ProgramMembership::setRole($program, $customer, 3, $status, (int)$admin->id);
        } catch (\Throwable $exception) {
            Yii::error($exception->getMessage(), __METHOD__);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Could not add the member.'];
        }

        Yii::$app->response->statusCode = 201;
        return [
            'message' => $status === 'waitlisted' ? 'Added to the waitlist.' : 'Subscriber added.',
            'idCustomer' => (int)$customer->id,
            'created' => $created,
            'status' => $status,
        ];
    }

    /**
     * CR-024: POST admin-community/program-member-role/{id} {idCustomer, role: 2 volunteer | 3 subscriber | 0 remove}
     * The program's own admin (owner / role 1) is not changed here.
     */
    public function actionProgramMemberRole(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            return ['error' => 'Use POST.'];
        }
        $program = Program::findOne(['id' => $id]);
        if (!$program) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Program not found.'];
        }

        $payload = Yii::$app->request->getBodyParams();
        $newRole = (int)($payload['role'] ?? -1);
        if (!in_array($newRole, [0, 2, 3], true)) {
            Yii::$app->response->statusCode = 400;
            return ['error' => 'Role must be 2 (volunteer), 3 (subscriber) or 0 (remove).'];
        }
        $target = Customer::findOne((int)($payload['idCustomer'] ?? 0));
        if (!$target) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'User not found.'];
        }
        $roles = ProgramMembership::roles($program, (int)$target->id);
        if ((int)$target->id === (int)$program->id_customer || in_array(1, $roles, true)) {
            Yii::$app->response->statusCode = 403;
            return ['error' => 'The program admin cannot be changed here.'];
        }
        if (!array_intersect($roles, [2, 3])) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'This person is not a member of this program.'];
        }

        $status = 'enrolled';
        if ($newRole === 3 && !in_array(3, $roles, true)) {
            // A volunteer becoming a subscriber takes a seat like anyone else.
            $status = ProgramMembership::newSubscriberStatus($program) ?? 'enrolled';
        } elseif ($newRole === 3) {
            Yii::$app->response->statusCode = 200;
            return ['message' => 'No change.', 'role' => 3];
        }

        try {
            ProgramMembership::setRole($program, $target, $newRole, $status, (int)$admin->id);
        } catch (\Throwable $exception) {
            Yii::error($exception->getMessage(), __METHOD__);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Could not update the member.'];
        }

        $messages = [0 => 'Removed from the program.', 2 => 'Now a volunteer.', 3 => $status === 'waitlisted' ? 'Moved to the waitlist.' : 'Now a subscriber.'];
        return ['message' => $messages[$newRole], 'role' => $newRole, 'status' => $newRole ? $status : null];
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
    /* Member export (NF-016)                                              */
    /* ------------------------------------------------------------------ */

    private const EXPORT_PROFESSIONS = ['employed', 'self_employed', 'student', 'not_working', 'retired', 'not_set'];
    private const EXPORT_LIMIT = 5000;

    /** GET admin-community/member-export-options -> masjids that have at least one member, with counts. */
    public function actionMemberExportOptions()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $rows = (new Query())
            ->select(['m.id', 'm.name', 'm.area', 'm.city', 'members' => 'COUNT(c.id)'])
            ->from(['m' => Masjid::tableName()])
            ->innerJoin(['c' => Customer::tableName()], 'c.masjid = CAST(m.id AS CHAR)')
            ->where(['c.deleted' => 0, 'c.active' => 1])
            ->groupBy(['m.id', 'm.name', 'm.area', 'm.city'])
            ->orderBy(['m.name' => SORT_ASC])
            ->all();

        return array_map(static fn (array $r): array => [
            'id' => (int)$r['id'],
            'name' => trim((string)$r['name']),
            'area' => (string)($r['area'] ?? ''),
            'city' => (string)($r['city'] ?? ''),
            'members' => (int)$r['members'],
        ], $rows);
    }

    /**
     * POST admin-community/member-export
     * { masjidIds: int[] (empty = all), genders: ('m'|'f')[] (empty = all), professions: string[] (empty = all), countOnly?: bool }
     * -> { generatedAt, total, masjids: [{ id, name, area, city, members: [...] }] }
     * Members = active users whose profile masjid is the masjid; masjids with no match are left out.
     */
    public function actionMemberExport()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            return ['error' => 'Use POST.'];
        }

        $body = Yii::$app->request->getBodyParams();
        $masjidIds = array_values(array_filter(array_map('intval', (array)($body['masjidIds'] ?? [])), static fn (int $id) => $id > 0));
        $genders = array_values(array_intersect(['m', 'f'], (array)($body['genders'] ?? [])));
        $professions = array_values(array_intersect(self::EXPORT_PROFESSIONS, (array)($body['professions'] ?? [])));

        $professionSql = "CASE
            WHEN c.employment_status IS NOT NULL AND c.employment_status <> '' THEN c.employment_status
            WHEN LOWER(TRIM(c.occupation)) = 'professional' THEN 'employed'
            WHEN LOWER(TRIM(c.occupation)) = 'student' THEN 'student'
            ELSE 'not_set' END";

        $query = (new Query())
            ->from(['c' => Customer::tableName()])
            ->innerJoin(['m' => Masjid::tableName()], 'c.masjid = CAST(m.id AS CHAR)')
            ->where(['c.deleted' => 0, 'c.active' => 1]);
        if ($masjidIds) {
            $query->andWhere(['m.id' => $masjidIds]);
        }
        if (count($genders) === 1) {
            // One gender chosen: users without a gender are left out. Both (or none) chosen: everyone.
            $query->andWhere(['c.gender' => $genders[0]]);
        }
        if ($professions) {
            $query->andWhere(['in', new \yii\db\Expression($professionSql), $professions]);
        }

        $countQuery = clone $query;
        $total = (int)$countQuery->count('c.id');
        $masjidCount = (int)(clone $query)->select('COUNT(DISTINCT m.id)')->scalar();
        if (!empty($body['countOnly'])) {
            return ['total' => $total, 'masjidCount' => $masjidCount];
        }
        if ($total > self::EXPORT_LIMIT) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Too many members (' . $total . '). Narrow the filters to ' . self::EXPORT_LIMIT . ' or fewer.'];
        }

        $rows = $query
            ->select([
                'masjidId' => 'm.id', 'masjidName' => 'm.name', 'm.area', 'm.city',
                'c.firstname', 'c.lastname', 'c.gender', 'c.phone', 'c.occupation', 'c.designation',
                'c.company_name', 'c.college_name', 'profession' => new \yii\db\Expression($professionSql),
            ])
            ->orderBy(['m.name' => SORT_ASC, 'm.id' => SORT_ASC, 'c.firstname' => SORT_ASC, 'c.lastname' => SORT_ASC])
            ->all();

        $clean = static function ($value): string {
            $text = trim((string)$value);
            return in_array(strtolower($text), ['null', 'undefined'], true) ? '' : $text;
        };

        $masjids = [];
        foreach ($rows as $r) {
            $id = (int)$r['masjidId'];
            if (!isset($masjids[$id])) {
                $masjids[$id] = [
                    'id' => $id,
                    'name' => $clean($r['masjidName']),
                    'area' => $clean($r['area']),
                    'city' => $clean($r['city']),
                    'members' => [],
                ];
            }
            $occupation = $clean($r['occupation']);
            if (in_array(strtolower($occupation), ['professional', 'student'], true)) {
                $occupation = ''; // old signup category, not a job title
            }
            $title = $occupation !== '' ? $occupation : $clean($r['designation']);
            $org = $r['profession'] === 'student' ? $clean($r['college_name']) : $clean($r['company_name']);
            $masjids[$id]['members'][] = [
                'name' => trim($clean($r['firstname']) . ' ' . $clean($r['lastname'])),
                'gender' => in_array($r['gender'], ['m', 'f'], true) ? $r['gender'] : '',
                'phone' => $clean($r['phone']),
                'profession' => (string)$r['profession'],
                'occupation' => implode(' · ', array_filter([$title, $org])),
            ];
        }

        Yii::info([
            'event' => 'member-export',
            'admin' => (int)$admin->id,
            'masjidIds' => $masjidIds ?: 'all',
            'genders' => $genders ?: 'all',
            'professions' => $professions ?: 'all',
            'total' => $total,
        ], 'backoffice.export');

        return [
            'generatedAt' => date('Y-m-d H:i:s'),
            'total' => $total,
            'masjids' => array_values($masjids),
        ];
    }

    /* ------------------------------------------------------------------ */
    /* Save                                                                */
    /* ------------------------------------------------------------------ */

    private function saveMasjid(Masjid $masjid, Customer $admin): array
    {
        $payload = Yii::$app->request->getBodyParams();

        $masjid->name = trim((string)($payload['name'] ?? ''));
        $masjid->address = $this->nullable($payload['address'] ?? null);
        $masjid->area = $this->nullable($payload['area'] ?? null);
        $masjid->city = $this->nullable($payload['city'] ?? null);
        $masjid->state = $this->nullable($payload['state'] ?? null);
        $masjid->pincode = $this->nullable($payload['pincode'] ?? null);
        $masjid->country = $this->nullable($payload['country'] ?? null);
        // Map pin for "near me". Only touched when sent, so older back office builds keep it.
        if (array_key_exists('latitude', $payload) || array_key_exists('longitude', $payload)) {
            $latitude = $this->nullable($payload['latitude'] ?? null);
            $longitude = $this->nullable($payload['longitude'] ?? null);
            if (($latitude === null) !== ($longitude === null)) {
                Yii::$app->response->statusCode = 422;
                return ['error' => 'Enter both latitude and longitude, or leave both empty.'];
            }
            $masjid->latitude = $latitude;
            $masjid->longitude = $longitude;
        }
        $madhab = strtolower(trim((string)($payload['madhab'] ?? '')));
        $masjid->madhab = in_array($madhab, Masjid::MADHABS, true) ? $madhab : null;
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
            MasjidSlug::ensure($masjid);

            $detail = MasjidDetail::findOne(['id_masjid' => $masjid->id]) ?? new MasjidDetail(['id_masjid' => $masjid->id]);
            $detail->email = $this->nullable($payload['email'] ?? null);
            $detail->contact = $this->nullable($payload['contact'] ?? null);
            $detail->location = $this->nullable($payload['location'] ?? null);
            $detail->applyContactFields($payload);
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
                // Runs inside this transaction; records a restorable version when the times changed.
                $captureUrl = MasjidMedia::ownTimingBoardUrl((int)$masjid->id, $payload['timingCaptureUrl'] ?? null);
                MasjidTimings::save(
                    (int)$masjid->id,
                    array_values((array)$payload['timings']),
                    $captureUrl ? 'capture' : 'admin',
                    (int)$admin->id,
                    $captureUrl
                );
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
        // CR-024: group link (validated by the model).
        if (array_key_exists('whatsappGroupUrl', $payload)) {
            $program->whatsapp_group_url = $this->nullable($payload['whatsappGroupUrl']);
        }
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
            'madhab' => $masjid->madhab,
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
        $timingVersion = (new Query())
            ->from('{{%masjid_timing_version}}')
            ->where(['id_masjid' => $masjid->id])
            ->max('version_no');

        return [
            'id' => (int)$masjid->id,
            'name' => (string)$masjid->name,
            'address' => (string)($masjid->address ?? ''),
            'area' => (string)($masjid->area ?? ''),
            'city' => (string)($masjid->city ?? ''),
            'state' => (string)($masjid->state ?? ''),
            'pincode' => (string)($masjid->pincode ?? ''),
            'country' => (string)($masjid->country ?? ''),
            'latitude' => $masjid->latitude !== null ? (float)$masjid->latitude : null,
            'longitude' => $masjid->longitude !== null ? (float)$masjid->longitude : null,
            'madhab' => $masjid->madhab,
            'displayColors' => $masjid->getDisplayColorsArray(),
            // Public page on the website, e.g. /masjid/hyderabad/masjid-e-noor.
            'publicPath' => $masjid->slug ? MasjidSlug::path($masjid) : null,
            'images' => array_map(static fn (MasjidImage $image) => $image->serialize(), MasjidImage::find()
                ->where(['id_masjid' => $masjid->id])
                ->orderBy(['sort_order' => SORT_ASC, 'id_masjid_image' => SORT_ASC])
                ->all()),
            'maxImages' => MasjidMedia::MAX_GALLERY_IMAGES,
            'timingVersion' => $timingVersion !== null ? (int)$timingVersion : null,
            'status' => $this->masjidStatusName($masjid),
            'isActive' => (int)$masjid->status === Masjid::STATUS_ACTIVE,
            'idHalqa' => $masjid->id_halqa !== null ? (int)$masjid->id_halqa : null,
            'ownerName' => $owners[(int)$masjid->id_customer] ?? '',
            'email' => (string)($detail->email ?? ''),
            'contact' => (string)($detail->contact ?? ''),
            'location' => (string)($detail->location ?? ''),
            'contacts' => MasjidDetail::contactPayload($detail, true),
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
            'whatsappGroupUrl' => (string)($program->whatsapp_group_url ?? ''),
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
