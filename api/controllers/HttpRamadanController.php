<?php

namespace app\controllers;

use Yii;
use app\models\Member;
use DateTime;
use yii\db\Query;
use app\models\Customer;
use app\models\SubscriberPackets;
use app\models\RamadanSehriSubscription;
use app\models\EventMember;
use app\models\Halqa;
use app\models\Masjid;
use app\models\MasjidDetail;
use app\models\MasjidCommitteeMember;
use app\models\MasjidTiming;
use app\models\MasjidImage;
use app\models\HalqaMasjid;
use app\components\MasjidMailer;
use app\components\MasjidMedia;
use app\components\MasjidSlug;
use app\components\MasjidTimings;
use app\components\TimingBoardReader;
use app\models\Program;
use app\models\ProgramCustomer;
use yii\helpers\Json;
use yii\web\Controller;
use yii\web\UploadedFile;

class HttpRamadanController extends \yii\web\Controller
{
    public function __construct($id, $module, $config = [])
    {
        parent::__construct($id, $module, $config);
        $headers = Yii::$app->request->headers;
    }

    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['FETCH', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                'Access-Control-Allow-Credentials' => Yii::$app->params['corsAllowCredentials'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Max-Age' => 86400,
            ],
        ];
        return $behaviors;
    }
    
    private function getAuthorizedUser()
    {
        $headers = Yii::$app->request->headers;
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            return Customer::find()->where(['authKey' => $token])->one();
        }
        return null;
    }

    public function actionUsers()
    {
        $cache = Yii::$app->cache;
        $headers = Yii::$app->request->headers;

        if (!$headers->has('Authorization')) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }

        $authorizationHeader = $headers->get('Authorization');
        $token = str_replace('Bearer ', '', $authorizationHeader);
        $user = Customer::find()->where(['authKey' => $token])->one();

        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }

        $programId = Yii::$app->request->get('programId');
        $programKey = $programId ?: 'all';

        if (!empty($programId) && !$this->canViewProgramSubscriptions((int)$programId, $user)) {
            Yii::$app->response->statusCode = 403;
            return \yii\helpers\Json::encode(['error' => 'You do not have permission to view this subscription list']);
        }

        $allowedProgramIds = [];
        if (empty($programId)) {
            $allowedProgramIds = $this->getSubscriptionVisibleProgramIds($user);
            if (empty($allowedProgramIds)) {
                Yii::$app->response->statusCode = 200;
                return \yii\helpers\Json::encode([
                    'list' => [],
                    'userImagePath' => Yii::$app->params['userImagePath'],
                    'imagePath' => Yii::$app->params['userImagePath']
                ]);
            }
        }

        $cacheKey = "users_list_v2_{$user->id}_{$programKey}";
        $users = $cache->get($cacheKey);

        if ($users === false) {
            $query = Customer::find()
                ->select([
                    'bt_customer.*',
                    'bt_masjid.name AS masjid',
                    'bt_program_customer.created_at AS subscription_date',
                    'bt_program_customer.id_program AS id_program'
                ])
                ->innerJoin('bt_program_customer', 'bt_program_customer.id_customer = bt_customer.id')
                ->leftJoin('bt_masjid', 'bt_masjid.id = bt_customer.masjid')
                ->orderBy(['bt_customer.id' => SORT_DESC])
                ->asArray();

            if (!empty($programId)) {
                $query->where(['bt_program_customer.id_program' => $programId]);
            } else {
                $query->where(['bt_program_customer.id_program' => $allowedProgramIds]);
            }

            $users = $query->all();
            $cache->set($cacheKey, $users, 60); // NF-012: was ~12 h, new enrolments did not show
        }

        $response = [
            'list' => $users,
            'userImagePath' => Yii::$app->params['userImagePath'],
            'imagePath' => Yii::$app->params['userImagePath']
        ];

        Yii::$app->response->statusCode = 200;
        return \yii\helpers\Json::encode($response);
    }

    public function actionMasjidUserList()
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return Json::encode(['error' => 'Unauthorized']);
        }

        $masjidId = Yii::$app->request->get('masjidId');
        if (!$masjidId) {
            $request = json_decode(Yii::$app->request->getRawBody(), true);
            $masjidId = $request['masjidId'] ?? null;
        }

        if (!$masjidId) {
            Yii::$app->response->statusCode = 400;
            return Json::encode(['error' => 'Masjid ID is required']);
        }

        $masjid = Masjid::findOne($masjidId);
        if (!$masjid) {
            Yii::$app->response->statusCode = 404;
            return Json::encode(['error' => 'Masjid not found']);
        }

        // NF-012: the owner (and super admin) sees everyone linked to the masjid; a member of this
        // masjid sees only members of their own gender, name + photo.
        $isManager = (int)$masjid->id_customer === (int)$user->id || $this->isSuperAdmin($user);
        $isMember = (string)$user->masjid === (string)(int)$masjid->id;
        if (!$isManager && !$isMember) {
            return $this->fail(403, 'Only members of this masjid can see its members.');
        }

        $query = Customer::find()
            ->where(['masjid' => (string)(int)$masjid->id])
            ->andWhere(['or', ['deleted' => 0], ['deleted' => null]])
            ->orderBy(['firstname' => SORT_ASC, 'lastname' => SORT_ASC])
            ->asArray();
        if ($isManager) {
            $query->select(['id', 'firstname', 'lastname', 'gender', 'phone', 'email', 'occupation', 'company_name', 'designation', 'employment_status', 'image', 'pincode']);
            $gender = Yii::$app->request->get('gender');
            if (in_array($gender, ['m', 'f'], true)) {
                $query->andWhere(['gender' => $gender]);
            }
        } else {
            $gender = $this->viewerGender($user);
            if ($gender === null) {
                return $this->fail(409, 'Select your gender to see members.', ['code' => 'gender_required']);
            }
            $query->select(['id', 'firstname', 'lastname', 'gender', 'image'])->andWhere(['gender' => $gender]);
        }
        $users = $query->all();
        $counts = ['m' => 0, 'f' => 0];
        foreach ($users as $u) {
            if (isset($counts[$u['gender']])) {
                $counts[$u['gender']]++;
            }
        }

        Yii::$app->response->statusCode = 200;
        return Json::encode([
            'list' => $users,
            'total' => count($users),
            'counts' => $counts,
            'can_manage' => $isManager,
            'userImagePath' => Yii::$app->params['userImagePath'],
            'imagePath' => Yii::$app->params['userImagePath']
        ]);
    }
    
    


    public function actionGetUserSehri($id_customer)
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return Json::encode(['status' => 'error', 'message' => 'Unauthorized']);
        }

        // Fetch saved records for the given customer
        $savedObservations = RamadanSehriSubscription::find()
            ->where(['id_customer' => $id_customer])
            ->asArray()
            ->all();

        if (!$savedObservations) {
            return Json::encode([
                'status' => 'error',
                'message' => 'No records found for this customer'
            ]);
        }

        // Format response to match expected structure
        $formattedData = [];
        foreach ($savedObservations as $record) {
            $formattedData[] = [
                'date' => date('d-M-Y', strtotime($record['date'])), // Convert to expected format
                'observed' => $record['opt']
            ];
        }

        return Json::encode([
            'status' => 'success',
            'data' => $formattedData
        ]);
    }


    public function actionSetUserSehri()
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return Json::encode(['status' => 'error', 'message' => 'Unauthorized']);
        }

        $requestData = json_decode(Yii::$app->request->getRawBody(), true);

        if (!isset($requestData['setSehriObj']['id_customer']) || !isset($requestData['setSehriObj']['days'])) {
            return Json::encode(['status' => 'error', 'message' => 'Missing required fields']);
        }

        $savedObservations = [];

        foreach ($requestData['setSehriObj']['days'] as $observation) {
            $idCustomer = $requestData['setSehriObj']['id_customer'];
            $date = date('Y-m-d', strtotime($observation['date']));
            $opt = $observation['observed'];

            // Check if record already exists
            $model = RamadanSehriSubscription::findOne(['id_customer' => $idCustomer, 'date' => $date]);

            if (!$model) {
                $model = new RamadanSehriSubscription();
                $model->id_customer = $idCustomer;
                $model->date = $date;
            }

            // Update the observed value
            $model->opt = $opt;

            if (!$model->save()) {
                return Json::encode([
                    'status' => 'error',
                    'message' => 'Failed to save data',
                    'errors' => $model->errors
                ]);
            }

            $savedObservations[] = [
                'date' => $model->date,
                'observed' => $model->opt,
            ];
        }

        return Json::encode([
            'status' => 'success',
            'message' => 'Observations saved successfully',
            'data' => $savedObservations,
        ]);
    }


    public function actionSaveHalqa()
    {
        $user = $this->getAuthorizedUser();

        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }
        
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        $halqaId = $data['id'];
        $selectedMasjids = $data['masjids'] ?? [];
        $halqa = $halqaId ? Halqa::findOne($halqaId) : new Halqa();

        if ($halqaId && !$halqa) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Halqa not found']);
        }

        // Assign data
        $halqa->id_customer = $user->id; 
        $halqa->name = $data['name'];
        $halqa->address = $data['address'];
        $halqa->description = $data['description'];
        $halqa->city = $data['city'];
        $halqa->state = $data['state'];
        $halqa->country = $data['country'];
        $halqa->status = $data['status'];
        
        if ($halqa->save()) {
            if (!empty($selectedMasjids)) {
                // Delete previous associations if updating
                if ($halqaId) {
                    HalqaMasjid::deleteAll(['id_halqa' => $halqa->id]);
                }

                // Insert new associations
                foreach ($selectedMasjids as $masjidId) {
                    $halqaMasjid = new HalqaMasjid();
                    $halqaMasjid->id_halqa = $halqa->id;
                    $halqaMasjid->id_masjid = $masjidId;
                    $halqaMasjid->save();
                }
            }

            // Update cache after successful save
            $cacheKey = "halqa_details_{$user->id}_{$halqa->id}";
            Yii::$app->cache->set($cacheKey, [
                'halqa' => $halqa,
                'masjids' => $selectedMasjids
            ], 43200);

            // Invalidate halqa list cache
            $halqaListCacheKey = "halqa_list_{$user->id}";
            Yii::$app->cache->delete($halqaListCacheKey);

            Yii::$app->response->statusCode = $halqaId ? 200 : 201;
            return \yii\helpers\Json::encode($halqa);
        } else {
            Yii::$app->response->statusCode = 422;
            return \yii\helpers\Json::encode($halqa->getErrors());
        }
    }

    public function actionSaveArea()
    {
        return $this->actionSaveHalqa();
    }

    public function actionHalqaDetails()
    {
        $cache = Yii::$app->cache;
        $user = $this->getAuthorizedUser();
        
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }

        $headers = Yii::$app->request->headers;
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $user = Customer::find()->where(['authKey' => $token])->one();

            if (!$user) {
                Yii::$app->response->statusCode = 401;
                return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
            }

            $data = json_decode(Yii::$app->request->getRawBody(), true);
            $id = $data['id'];
            
            // Generate a cache key specific to user_id and halqa_id
            $cacheKey = "halqa_details_{$user->id}_{$id}";
            $cachedResponse = $cache->get($cacheKey);
            
            if ($cachedResponse === false) {
                // Get List of Masjids Created by User
                $masjids = Masjid::find()->where(['id_customer' => $user->id])->asArray()->all();

                $halqa = Halqa::findOne($id);

                if (!$halqa) {
                    Yii::$app->response->statusCode = 404;
                    return \yii\helpers\Json::encode(['error' => 'Halqa not found']);
                }

                // Fetch Masjids already associated with this Halqa
                $associatedMasjids = HalqaMasjid::find()
                    ->where(['id_halqa' => $halqa->id])
                    ->select('id_masjid')
                    ->column();

                // Add `selected` field to indicate association
                foreach ($masjids as &$masjid) {
                    $masjid['selected'] = in_array($masjid['id'], $associatedMasjids);
                }

                $cachedResponse = [
                    'halqa' => $halqa,
                    'masjids' => $masjids,
                ];
                
                // Store the result in cache for 12 hours (43200 seconds)
                $cache->set($cacheKey, $cachedResponse, 43200);
            }

            Yii::$app->response->statusCode = 200;
            return \yii\helpers\Json::encode($cachedResponse);
        }

        Yii::$app->response->statusCode = 401;
        return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
    }

    public function actionAreaDetails()
    {
        return $this->actionHalqaDetails();
    }

    public function actionHalqaList()
    {
        $cache = Yii::$app->cache;
        $user = $this->getAuthorizedUser();
        
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }

        // Generate a cache key specific to user_id
        $cacheKey = "halqa_list_{$user->id}";
        $halqas = $cache->get($cacheKey);

        if ($halqas === false) {
            // Fetch Halqa List if not in cache
            $halqas = Halqa::find()
                ->where(['id_customer' => $user->id])
                ->orderBy(['id' => SORT_DESC])
                ->asArray()
                ->all();
            
            // Store the result in cache for 12 hours (43200 seconds)
            $cache->set($cacheKey, $halqas, 43200);
        }

        Yii::$app->response->statusCode = 200;
        return \yii\helpers\Json::encode([
            'halqas' => $halqas
        ]);
    }

    public function actionAreaList()
    {
        return $this->actionHalqaList();
    }

    public function actionDeleteHalqa()
    {
        $user = $this->getAuthorizedUser();

        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }

        $request = Yii::$app->request->post();
        if (!isset($request['id'])) {
            Yii::$app->response->statusCode = 400;
            return \yii\helpers\Json::encode(['error' => 'Invalid request, missing Halqa ID']);
        }

        $halqa = Halqa::findOne($request['id']);
        if (!$halqa) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Halqa not found']);
        }

        if ($halqa->delete()) {

            // Invalidate halqa list cache
            $halqaListCacheKey = "halqa_list_{$user->id}";
            Yii::$app->cache->delete($halqaListCacheKey);

            Yii::$app->response->statusCode = 200;
            return \yii\helpers\Json::encode(['message' => 'Halqa deleted successfully']);
        } else {
            Yii::$app->response->statusCode = 500;
            return \yii\helpers\Json::encode(['error' => 'Failed to delete Halqa']);
        }
    }

    public function actionDeleteArea()
    {
        return $this->actionDeleteHalqa();
    }

    public function actionMasjidList()
    {
        $viewer = $this->getAuthorizedUser();
        $query = Masjid::find()->orderBy(['id' => SORT_DESC]);
        $query->andWhere($viewer
            ? ['or', ['status' => Masjid::STATUS_ACTIVE], ['id_customer' => $viewer->id]]
            : ['status' => Masjid::STATUS_ACTIVE]);

        $pincode = Yii::$app->request->get('pincode');
        if (!empty($pincode)) {
            $query->andWhere(['pincode' => $pincode]);
        }

        // ?ids=1,2,3: just these masjids (the app's favorites), wherever they are.
        $onlyIds = Yii::$app->request->get('ids');
        if (is_string($onlyIds) && $onlyIds !== '') {
            $onlyIds = array_slice(array_unique(array_filter(array_map('intval', explode(',', $onlyIds)))), 0, 100);
            $query->andWhere(['id' => $onlyIds ?: [0]]);
        }

        // "Near me": ?lat=&lng=&radius=<km> keeps only masjids pinned within that distance, nearest
        // first. Masjids without a pinned position can't be placed, so they drop out, except the
        // viewer's own unpinned ones (so an owner can still find theirs and pin it). The viewer's
        // pinned masjids follow the range like any other.
        $origin = $this->readNearbyOrigin();
        if ($origin) {
            [$lat, $lng, $radiusKm] = $origin;
            // Cheap bounding box in SQL; the exact distance is checked below.
            $latDelta = $radiusKm / 111.045;
            $lngDelta = $radiusKm / (111.045 * max(cos(deg2rad($lat)), 0.01));
            $inBox = ['and',
                ['between', 'latitude', $lat - $latDelta, $lat + $latDelta],
                ['between', 'longitude', $lng - $lngDelta, $lng + $lngDelta],
            ];
            $ownUnpinned = ['and',
                ['id_customer' => $viewer ? $viewer->id : 0],
                ['or', ['latitude' => null], ['longitude' => null]],
            ];
            $query->andWhere($viewer ? ['or', $inBox, $ownUnpinned] : $inBox);
        }

        $masjids = $query->all();
        $distances = [];
        if ($origin) {
            foreach ($masjids as $masjid) {
                if ($masjid->latitude !== null && $masjid->longitude !== null) {
                    $distances[(int)$masjid->id] = $this->distanceKm($origin[0], $origin[1], (float)$masjid->latitude, (float)$masjid->longitude);
                }
            }
            $masjids = array_values(array_filter($masjids, function (Masjid $masjid) use ($distances, $origin, $viewer) {
                $distance = $distances[(int)$masjid->id] ?? null;
                if ($distance !== null) {
                    return $distance <= $origin[2];
                }
                return $viewer && (int)$masjid->id_customer === (int)$viewer->id;
            }));
            usort($masjids, static function (Masjid $a, Masjid $b) use ($distances) {
                return ($distances[(int)$a->id] ?? INF) <=> ($distances[(int)$b->id] ?? INF);
            });
        }

        $ids = array_map(static function (Masjid $masjid) {
            return (int)$masjid->id;
        }, $masjids);

        // First slideshow photo per masjid for the list thumbnail, in one query.
        $covers = [];
        $images = MasjidImage::find()
            ->select(['id_masjid', 'thumb_url'])
            ->where(['id_masjid' => $ids])
            ->orderBy(['sort_order' => SORT_ASC, 'id_masjid_image' => SORT_ASC])
            ->asArray()
            ->all();
        foreach ($images as $image) {
            $covers[(int)$image['id_masjid']] = $covers[(int)$image['id_masjid']] ?? $image['thumb_url'];
        }

        // Latest timing change per masjid, for the sitemap's lastmod (timing edits don't touch bt_masjid).
        $timingChanges = (new Query())
            ->select(['changed' => 'MAX(created_at)', 'id_masjid'])
            ->from('{{%masjid_timing_version}}')
            ->where(['id_masjid' => $ids])
            ->groupBy('id_masjid')
            ->indexBy('id_masjid')
            ->column();

        $masjidList = array_map(function (Masjid $masjid) use ($covers, $timingChanges, $distances) {
            return $this->serializeMasjidSummary($masjid) + [
                'distanceKm' => isset($distances[(int)$masjid->id]) ? round($distances[(int)$masjid->id], 2) : null,
                'coverThumbUrl' => $covers[(int)$masjid->id] ?? null,
                'updatedAt' => max((string)$masjid->updated_at, (string)($timingChanges[(int)$masjid->id] ?? '')),
            ];
        }, $masjids);

        Yii::$app->response->statusCode = 200;
        return Json::encode($masjidList);
    }


    public function actionUserMasjidList()
    {

        $user = $this->getAuthorizedUser();
        if ($user) {
            $halqaList = Masjid::find()
                ->where(['id_customer' => $user->id])
                ->orderBy(['id' => SORT_DESC])
                ->all();
            Yii::$app->response->statusCode = 200;
            return \yii\helpers\Json::encode($halqaList);
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }
    }

    public function actionMasjidDetails()
    {
        $id = Yii::$app->request->get('id');
        if (!$id) {
            $request = json_decode(Yii::$app->request->getRawBody(), true);
            $id = $request['id'] ?? null;
        }
        // Public pages look the masjid up by its URL: /masjid/<city>/<slug>.
        $citySlug = (string)Yii::$app->request->get('city', '');
        $slug = (string)Yii::$app->request->get('slug', '');

        if (!$id && ($citySlug === '' || $slug === '')) {
            Yii::$app->response->statusCode = 400;
            return \yii\helpers\Json::encode(['error' => 'Invalid request, missing Masjid ID']);
        }

        $masjid = $id ? Masjid::findOne($id) : MasjidSlug::find($citySlug, $slug);
        $viewer = $this->getAuthorizedUser();
        $isOwner = $masjid && $viewer && (int)$masjid->id_customer === (int)$viewer->id;
        if (!$masjid || ((int)$masjid->status !== Masjid::STATUS_ACTIVE && !$isOwner)) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Masjid not found']);
        }

        Yii::$app->response->statusCode = 200;
        return Json::encode($this->serializeMasjidDetails($masjid, $viewer));
    }

    public function actionSaveMasjid()
    {
        $user = $this->getAuthorizedUser();

        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }

        $data = Yii::$app->request->post();
        if (empty($data)) {
            $data = json_decode(Yii::$app->request->getRawBody(), true);
        }
        $data = is_array($data) ? $data : [];
        $data['facilities'] = $this->decodeArrayField($data['facilities'] ?? []);
        $data['committeeMembers'] = $this->decodeArrayField($data['committeeMembers'] ?? []);
        $data['timings'] = $this->decodeArrayField($data['timings'] ?? []);
        $masjidId = $data['id'] ?? null;
        $masjid = $masjidId ? Masjid::findOne($masjidId) : new Masjid();

        if ($masjidId && !$masjid) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Masjid not found']);
        }

        if ($masjidId && (int)$masjid->id_customer !== (int)$user->id) {
            Yii::$app->response->statusCode = 403;
            return Json::encode(['error' => 'You can edit only your own masjid.']);
        }

        // Assign data
        $masjid->id_customer = $user->id;
        $masjid->id_halqa = $data['id_halqa'] ?? null;
        $masjid->name = $data['name'] ?? null;
        $masjid->address = $data['address'] ?? null;
        $masjid->area = $data['area'] ?? null;
        $masjid->city = $data['city'] ?? null;
        $masjid->state = $data['state'] ?? null;
        $masjid->pincode = $data['pincode'] ?? null;
        $masjid->country = $data['country'] ?? null;
        $madhab = strtolower(trim((string)($data['madhab'] ?? '')));
        $masjid->madhab = in_array($madhab, Masjid::MADHABS, true) ? $madhab : null;
        // Older app versions don't send a position; their saves keep the pinned one.
        if (array_key_exists('latitude', $data) || array_key_exists('longitude', $data)) {
            $latitude = trim((string)($data['latitude'] ?? ''));
            $longitude = trim((string)($data['longitude'] ?? ''));
            $pinned = is_numeric($latitude) && is_numeric($longitude);
            $masjid->latitude = $pinned ? round((float)$latitude, 7) : null;
            $masjid->longitude = $pinned ? round((float)$longitude, 7) : null;
        }
        // Same rule for the display colours: absent keeps them, null clears them.
        if (array_key_exists('displayColors', $data) && $masjid->hasAttribute('display_colors')) {
            $displayColors = Masjid::normalizeDisplayColors($data['displayColors']);
            if ($displayColors === false) {
                Yii::$app->response->statusCode = 422;
                return Json::encode(['error' => 'Display colours must be three colours like #0c2b25.']);
            }
            $masjid->display_colors = $displayColors;
        }
        // Status is controlled by the back office: new masjids wait for approval and an
        // owner's edits keep whatever status the masjid already has.
        $isNewMasjid = $masjid->isNewRecord;
        if ($isNewMasjid) {
            $masjid->status = Masjid::STATUS_PENDING;
        }

        // Check the WhatsApp/Maps links and Imam/Muazzin phones before anything is saved.
        $contactCheck = new MasjidDetail();
        $contactCheck->applyContactFields($data);
        $contactError = $contactCheck->contactFieldsError();
        if ($contactError !== null) {
            Yii::$app->response->statusCode = 422;
            return Json::encode(['error' => $contactError]);
        }

        if ($masjid->save()) {
            MasjidSlug::ensure($masjid);
            $detail = MasjidDetail::findOne(['id_masjid' => $masjid->id]) ?? new MasjidDetail(['id_masjid' => $masjid->id]);
            $uploadedQrFile = UploadedFile::getInstanceByName('qrCodeFile');
            $detail->email = $data['email'] ?? null;
            $detail->contact = $data['contact'] ?? null;
            $detail->applyContactFields($data);
            $detail->location = $data['location'] ?? $data['address'] ?? null;
            $detail->temperature = $data['temperature'] ?? null;
            $detail->qr_code_url = $data['qrCodeUrl'] ?? $detail->qr_code_url;
            if ($uploadedQrFile) {
                $detail->qr_code_url = $this->saveMasjidQrFile($uploadedQrFile, $detail->qr_code_url);
            }
            $detail->qr_approved = $this->toBool($data['qrApproved'] ?? false);
            $detail->qr_approved_by = $data['qrApprovedBy'] ?? null;
            $detail->stay_nearby = $this->toBool($data['stayNearby'] ?? false);
            $detail->ladies_jamat = $this->toBool($data['ladiesJamat'] ?? false);
            $detail->ladies_ramzan_access = $this->toBool($data['ladiesRamzanAccess'] ?? false);
            $detail->wazu_khana = $this->toBool($data['facilities']['wazuKhana'] ?? false);
            $detail->toilet = $this->toBool($data['facilities']['toilet'] ?? false);
            $detail->gusl_khana = $this->toBool($data['facilities']['guslKhana'] ?? false);
            $detail->air_conditioners = $this->toBool($data['facilities']['airConditioners'] ?? false);
            $detail->chairs = $this->toBool($data['facilities']['chairs'] ?? false);
            $detail->save();

            MasjidCommitteeMember::deleteAll(['id_masjid' => $masjid->id]);
            foreach (($data['committeeMembers'] ?? []) as $index => $member) {
                if (empty($member['name']) || empty($member['role'])) {
                    continue;
                }

                $committeeMember = new MasjidCommitteeMember();
                $committeeMember->id_masjid = $masjid->id;
                $committeeMember->name = $member['name'];
                $committeeMember->role = $member['role'];
                $committeeMember->phone = $member['phone'] ?? null;
                $committeeMember->sort_order = $index;
                $committeeMember->save();
            }

            // Saved through MasjidTimings so every change becomes a restorable version. A timing set
            // confirmed from a captured board photo carries that photo's URL.
            $captureUrl = MasjidMedia::ownTimingBoardUrl((int)$masjid->id, $data['timingCaptureUrl'] ?? null);
            MasjidTimings::save(
                (int)$masjid->id,
                $data['timings'] ?? [],
                $captureUrl ? 'capture' : 'manual',
                (int)$user->id,
                $captureUrl
            );

            if ($isNewMasjid) {
                // The back office has to approve it; never let a mail problem fail the save.
                MasjidMailer::notifyAdminOfNewMasjid($masjid, $user);
            }

            Yii::$app->response->statusCode = $masjidId ? 200 : 201;
            return Json::encode($this->serializeMasjidDetails($masjid, $user));
        } else {
            Yii::$app->response->statusCode = 422;
            return \yii\helpers\Json::encode($masjid->getErrors());
        }
    }
    public function actionDeleteMasjid()
    {
        $user = $this->getAuthorizedUser();

        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }

        $request = Yii::$app->request->post();
        if (!isset($request['id'])) {
            Yii::$app->response->statusCode = 400;
            return \yii\helpers\Json::encode(['error' => 'Invalid request, missing Masjid ID']);
        }

        $masjid = Masjid::findOne($request['id']);
        if (!$masjid) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Masjid not found']);
        }

        if ((int)$masjid->id_customer !== (int)$user->id) {
            Yii::$app->response->statusCode = 403;
            return Json::encode(['error' => 'You can delete only your own masjid.']);
        }

        $deletedId = (int)$masjid->id;
        if ($masjid->delete()) {
            MasjidMedia::deleteMasjidFolders($deletedId);
            Yii::$app->response->statusCode = 200;
            return \yii\helpers\Json::encode(['message' => 'Masjid deleted successfully']);
        } else {
            Yii::$app->response->statusCode = 500;
            return \yii\helpers\Json::encode(['error' => 'Failed to delete Masjid']);
        }
    }

    /**
     * POST multipart {id, image}: stores a timing-board photo and reads its times.
     *
     * Nothing is saved to the masjid here. The app shows the times in the editor for review,
     * then sends them through save-masjid with timingCaptureUrl, which records a "capture"
     * version. If reading fails the photo is still returned so the user can type the times
     * while looking at it.
     */
    public function actionMasjidTimingCapture()
    {
        $allowed = $this->requireTimingContributableMasjid($this->requestParam('id'));
        if (!is_array($allowed)) {
            return $allowed;
        }
        [$masjid] = $allowed;

        $file = UploadedFile::getInstanceByName('image');
        $error = MasjidMedia::validate($file);
        if ($error) {
            Yii::$app->response->statusCode = 422;
            return Json::encode(['error' => $error]);
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

        Yii::$app->response->statusCode = 200;
        return Json::encode($result);
    }

    /**
     * POST {id, timings, timingCaptureUrl}: saves timings read from a board photo, for any
     * signed-in user. Only the timings change, and only with a photo of this masjid's board
     * behind them; the version records who sent it and the owner can restore an earlier one.
     */
    public function actionSaveMasjidTimings()
    {
        $allowed = $this->requireTimingContributableMasjid($this->requestParam('id'));
        if (!is_array($allowed)) {
            return $allowed;
        }
        [$masjid, $user] = $allowed;

        $captureUrl = MasjidMedia::ownTimingBoardUrl((int)$masjid->id, $this->requestParam('timingCaptureUrl'));
        if (!$captureUrl) {
            Yii::$app->response->statusCode = 422;
            return Json::encode(['error' => 'Upload a photo of the timing board first.']);
        }

        $timings = $this->decodeArrayField($this->requestParam('timings') ?? []);
        if (!$timings) {
            Yii::$app->response->statusCode = 422;
            return Json::encode(['error' => 'No timings to save.']);
        }

        MasjidTimings::save((int)$masjid->id, $timings, 'capture', (int)$user->id, $captureUrl);

        Yii::$app->response->statusCode = 200;
        return Json::encode($this->serializeMasjidDetails($masjid, $user));
    }

    /** GET ?id=: timing history, newest first. Owner only. */
    public function actionMasjidTimingVersions()
    {
        $owned = $this->requireOwnedMasjid($this->requestParam('id'));
        if (!is_array($owned)) {
            return $owned;
        }
        [$masjid] = $owned;

        Yii::$app->response->statusCode = 200;
        return Json::encode(['versions' => MasjidTimings::versions((int)$masjid->id)]);
    }

    /** POST {id, versionId}: makes an earlier timing version current again. */
    public function actionMasjidTimingRestore()
    {
        $owned = $this->requireOwnedMasjid($this->requestParam('id'));
        if (!is_array($owned)) {
            return $owned;
        }
        [$masjid, $user] = $owned;

        $version = MasjidTimings::restore((int)$masjid->id, (int)$this->requestParam('versionId'), (int)$user->id);
        if (!$version) {
            Yii::$app->response->statusCode = 404;
            return Json::encode(['error' => 'Timing version not found']);
        }

        Yii::$app->response->statusCode = 200;
        return Json::encode($this->serializeMasjidDetails($masjid, $user));
    }

    /** POST multipart {id, image}: adds a photo to the masjid's slideshow. */
    public function actionMasjidImageUpload()
    {
        $owned = $this->requireOwnedMasjid($this->requestParam('id'));
        if (!is_array($owned)) {
            return $owned;
        }
        [$masjid, $user] = $owned;

        $count = (int)MasjidImage::find()->where(['id_masjid' => $masjid->id])->count();
        if ($count >= MasjidMedia::MAX_GALLERY_IMAGES) {
            Yii::$app->response->statusCode = 422;
            return Json::encode(['error' => 'A masjid can have up to ' . MasjidMedia::MAX_GALLERY_IMAGES . ' photos.']);
        }

        $file = UploadedFile::getInstanceByName('image');
        $error = MasjidMedia::validate($file);
        if ($error) {
            Yii::$app->response->statusCode = 422;
            return Json::encode(['error' => $error]);
        }

        $stored = MasjidMedia::saveGalleryImage($file, (int)$masjid->id);
        $image = new MasjidImage($stored);
        $image->id_masjid = (int)$masjid->id;
        $image->id_customer = (int)$user->id;
        $image->sort_order = (int)MasjidImage::find()->where(['id_masjid' => $masjid->id])->max('sort_order') + 1;
        if (!$image->save()) {
            MasjidMedia::deleteByUrl($stored['image_url']);
            MasjidMedia::deleteByUrl($stored['thumb_url']);
            Yii::$app->response->statusCode = 500;
            return Json::encode(['error' => 'Could not save the photo.']);
        }

        Yii::$app->response->statusCode = 201;
        return Json::encode($image->serialize());
    }

    /** POST {id, imageId}: removes a slideshow photo and its files. */
    public function actionMasjidImageDelete()
    {
        $owned = $this->requireOwnedMasjid($this->requestParam('id'));
        if (!is_array($owned)) {
            return $owned;
        }
        [$masjid] = $owned;

        $image = MasjidImage::findOne([
            'id_masjid_image' => (int)$this->requestParam('imageId'),
            'id_masjid' => $masjid->id,
        ]);
        if (!$image) {
            Yii::$app->response->statusCode = 404;
            return Json::encode(['error' => 'Photo not found']);
        }

        MasjidMedia::deleteByUrl($image->image_url);
        MasjidMedia::deleteByUrl($image->thumb_url);
        $image->delete();

        Yii::$app->response->statusCode = 200;
        return Json::encode(['message' => 'Photo removed']);
    }


    public function actionAllProgramsList()
    {
        $user = $this->getAuthorizedUser();
        
        if ($user) {
            $query = Program::find()
                ->alias('p')
                ->select('p.*')
                ->distinct()
                ->innerJoin('bt_halqa_masjid hm', 'p.id_halqa = hm.id_halqa') // Join with bt_halqa_masjid
                ->innerJoin('bt_masjid m', 'hm.id_masjid = m.id') // Join with bt_masjid
                ->orderBy(['p.id' => SORT_DESC]); // Sort programs by ID
    
            // Check if 'pincode' parameter is provided
            $pincode = Yii::$app->request->get('pincode');
            if (!empty($pincode)) {
                $query->andWhere(['m.pincode' => $pincode]);
            }
    
            $programList = array_map(function (array $program) use ($user) {
                return $this->serializeProgramSummary($program, $user);
            }, $query->asArray()->all());
    
            Yii::$app->response->statusCode = 200;
            return \yii\helpers\Json::encode($programList);
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }
    }
    
    public function actionProgramList()
    {
        // Organizer 1  
        // Volunteer 2  
        // Subscriber 3  

        $user = $this->getAuthorizedUser();

        $query = Program::find()->alias('p')->select('p.*')->orderBy(['p.id' => SORT_DESC]);

        $programList = array_map(function (array $program) use ($user) {
            return $this->serializeProgramSummary($program, $user);
        }, $query->asArray()->all());

        Yii::$app->response->statusCode = 200;
        return \yii\helpers\Json::encode($programList);
    }


    
    public function actionProgramDetails()
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            return $this->fail(401, 'Unauthorized');
        }

        $request = json_decode(Yii::$app->request->getRawBody(), true);

        if (!isset($request['id'])) {
            Yii::$app->response->statusCode = 400;
            return \yii\helpers\Json::encode(['error' => 'Invalid request, missing Program ID']);
        }

        $program = Program::findOne($request['id']);
        if (!$program) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Program not found']);
        }

        $mappedUsers = ProgramCustomer::find()
        ->alias('pc') // Alias for bt_program_customer
        ->select([
            'c.id',
            'c.firstname',
            'c.lastname',
            'pc.role' // Fetch role from ProgramCustomer
        ])
        ->innerJoin('bt_customer c', 'c.id = pc.id_customer')
        ->where(['pc.id_program' => $request['id']])
        ->andWhere(['in', 'pc.role', [1, 2]]) // Ensure the correct alias for 'role'
        ->asArray()
        ->all();

        $currentUserProgramRole = $user ? ProgramCustomer::find()
            ->select('role')
            ->where([
                'id_program' => $request['id'],
                'id_customer' => $user->id
            ])
            ->scalar() : false;

        $canManageMembers = $user && (
            (int)$user->id === 1 ||
            (int)$program->id_customer === (int)$user->id ||
            (int)$currentUserProgramRole === 1
        );
    

        Yii::$app->response->statusCode = 200;
        return \yii\helpers\Json::encode([
            'program' => $this->serializeProgramSummary($program->toArray(), $user),
            'mapped_users' => $mappedUsers,
            'current_user_program_role' => $currentUserProgramRole !== false ? (int)$currentUserProgramRole : null,
            'can_manage_members' => $canManageMembers
        ]);
    }


    public function actionSaveProgram()
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }
    
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        $programId = $data['id'] ?? null;
        $program = $programId ? Program::findOne($programId) : new Program();
    
        if ($programId && !$program) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Program not found']);
        }

        if ($programId && (int)$program->id_customer !== (int)$user->id) {
            Yii::$app->response->statusCode = 403;
            return Json::encode(['error' => 'You can edit only your own program.']);
        }
    
        // Assign data to the Program model
        if (!$programId) {
            $program->id_customer = $user->id;
        }
        $program->name = $data['name'] ?? null;
        $program->code = $data['code'] ?? null;
        $programType = $data['program_type'] ?? 'general';
        $program->program_type = in_array($programType, ['general', 'sehri', 'iftar'], true)
            ? $programType
            : 'general';
        // NF-012 rev: the form picks an existing area (id_halqa) or types a new one (area_name + id_city).
        if (empty($data['id_halqa']) && !empty($data['area_name'])) {
            $area = $this->findOrCreateArea((string)$data['area_name'], (int)($data['id_city'] ?? 0), $data['area_lat'] ?? null, $data['area_lng'] ?? null, $user);
            if (!$area instanceof Halqa) {
                return $area;
            }
            $data['id_halqa'] = $area->id;
        }
        if (!empty($data['id_halqa']) && !Halqa::find()->where(['id' => (int)$data['id_halqa']])->exists()) {
            return $this->fail(422, 'Pick the area from the list or type a new one.', ['key' => 'id_halqa']);
        }
        $program->id_halqa = $data['id_halqa'] ?? null;
        $program->start_date = $data['start_date'] ?? null;
        $program->end_date = $data['end_date'] ?? null;
        $program->contact_number = $data['contact_number'] ?? null;
        $program->email = $data['email'] ?? null;
        $program->registration_allowed = (int)($data['registration_allowed'] ?? 1) ? 1 : 0;
        $program->max_participants = $data['max_participants'] ?? 100;
        $program->waitlist_enabled = (int)($data['waitlist_enabled'] ?? 1) ? 1 : 0;
        $program->description = $data['description'] ?? null;
        $program->status = $data['status'] ?? 'active';
        // NF-012: range for "Programs near you" and who may join.
        $program->radius_km = isset($data['radius_km']) && is_numeric($data['radius_km']) ? (int)$data['radius_km'] : ($program->radius_km ?: 10);
        $openTo = $data['open_to'] ?? ($program->open_to ?: 'both');
        $program->open_to = in_array($openTo, ['both', 'm', 'f'], true) ? $openTo : 'both';
    
        $isNewProgram = empty($programId);

        if ($program->save()) {
            if ($isNewProgram) {
                $creatorAssignment = ProgramCustomer::findOne([
                    'id_customer' => $user->id,
                    'id_program' => $program->id
                ]);

                if (!$creatorAssignment) {
                    $creatorAssignment = new ProgramCustomer();
                    $creatorAssignment->id_customer = $user->id;
                    $creatorAssignment->id_program = $program->id;
                    $creatorAssignment->role = 1;
                    $creatorAssignment->created_at = date('Y-m-d H:i:s');

                    if (!$creatorAssignment->save()) {
                        Yii::$app->response->statusCode = 422;
                        return \yii\helpers\Json::encode($creatorAssignment->getErrors());
                    }
                } elseif ((int)$creatorAssignment->role !== 1) {
                    $creatorAssignment->role = 1;
                    if (!$creatorAssignment->save()) {
                        Yii::$app->response->statusCode = 422;
                        return \yii\helpers\Json::encode($creatorAssignment->getErrors());
                    }
                }
            }

            Yii::$app->response->statusCode = $programId ? 200 : 201;
            return \yii\helpers\Json::encode($program);
        } else {
            Yii::$app->response->statusCode = 422;
            return \yii\helpers\Json::encode($program->getErrors());
        }
    }

    public function actionDeleteProgram()
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return Json::encode(['error' => 'Unauthorized']);
        }

        $request = Yii::$app->request->post();
        if (empty($request)) {
            $request = json_decode(Yii::$app->request->getRawBody(), true) ?? [];
        }

        $programId = $request['id'] ?? $request['id_program'] ?? null;
        if (!$programId) {
            Yii::$app->response->statusCode = 400;
            return Json::encode(['error' => 'Program ID is required']);
        }

        $program = Program::findOne($programId);
        if (!$program) {
            Yii::$app->response->statusCode = 404;
            return Json::encode(['error' => 'Program not found']);
        }

        $isSuperAdmin = (int)$user->id_customer_type === 1;
        $isOwner = (int)$program->id_customer === (int)$user->id;
        if (!$isOwner && !$isSuperAdmin) {
            Yii::$app->response->statusCode = 403;
            return Json::encode(['error' => 'You can delete only your own program.']);
        }

        $isExpired = !empty($program->end_date) && $program->end_date < date('Y-m-d');
        if ($isExpired && !$isSuperAdmin) {
            Yii::$app->response->statusCode = 403;
            return Json::encode([
                'error' => 'This program has ended and can only be deleted by a super admin.',
                'warning' => true,
            ]);
        }

        ProgramCustomer::deleteAll(['id_program' => $program->id]);

        if ($program->delete()) {
            Yii::$app->response->statusCode = 200;
            return Json::encode(['message' => 'Program deleted successfully']);
        }

        Yii::$app->response->statusCode = 500;
        return Json::encode(['error' => 'Failed to delete program']);
    }
    

    public function actionCheckProgram()
    {
        $registrationCode = Yii::$app->request->get('code'); // Fetch 'code' from query params
    
        if (!$registrationCode) {
            Yii::$app->response->statusCode = 400;
            return \yii\helpers\Json::encode(['error' => 'Invalid request, missing registration code']);
        }
    
        // Fetch the Program and its Halqa
        $program = Program::find()->where(['code' => $registrationCode])->one();
    
        if (!$program) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Program not found']);
        }
    
        // Fetch Halqa using the id_halqa field from the Program table
        $halqa = Halqa::find()->where(['id' => $program->id_halqa])->asArray()->one();
    
        if (!$halqa) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Halqa not found']);
        }
    
        // Fetch Masjids mapped to this Halqa
        $masjids = HalqaMasjid::find()
            ->select(['bt_masjid.id', 'bt_masjid.name'])
            ->innerJoin('bt_masjid', 'bt_masjid.id = bt_halqa_masjid.id_masjid')
            ->where(['bt_halqa_masjid.id_halqa' => $halqa['id']])
            ->asArray()
            ->all();
    
        // Return Program, Halqa, and Masjids
        Yii::$app->response->statusCode = 200;
        return \yii\helpers\Json::encode([
            'program' => ['id' => $program->id, 'name' => $program->name],
            'halqa' => [
                'id' => $halqa['id'],
                'name' => $halqa['name'],
                'masjids' => $masjids,  // List of Masjids inside this Halqa
            ],
        ]);
    }
    

    // =============================================================================================
    // NF-012 Sehri & Iftar programs: roles, members, packets, stats, programs near you.
    // Program roles (bt_program_customer.role): 1 admin / organiser, 2 volunteer, 3 subscriber.
    // The program's creator and a super admin (id_role 1) always act as admin.
    // =============================================================================================

    private const PROFILE_EDITABLE_LIMITS = [
        'address' => 250, 'landmark' => 100, 'occupation' => 100, 'company_name' => 100,
        'designation' => 100, 'notes' => 500,
    ];
    private const EMPLOYMENT_STATUSES = ['employed', 'self_employed', 'student', 'not_working', 'retired'];

    /**
     * POST {id_program}: enrol or leave (toggle). Respects open_to (gender), registration_allowed,
     * max_participants and the waitlist.
     */
    public function actionProgramEnrollment()
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            return $this->fail(401, 'Unauthorized');
        }

        $request = $this->readJsonBody();
        $program = !empty($request['id_program']) ? Program::findOne((int)$request['id_program']) : null;
        if (!$program) {
            return $this->fail(404, 'Program not found');
        }
        if ($this->isProgramEnded($program)) {
            return $this->fail(422, 'This program is closed for subscription changes');
        }

        $existing = ProgramCustomer::findOne([
            'id_customer' => $user->id,
            'id_program' => $program->id,
            'role' => 3,
        ]);

        if ($existing) {
            if ($existing->delete() === false) {
                return $this->fail(500, 'Failed to unsubscribe');
            }
            $this->promoteFromWaitlist($program);
            return $this->ok([
                'message' => 'Unsubscribed successfully',
                'entrolled' => 0,
                'enrolment_status' => null,
                'subscription_count' => $this->enrolledCount($program),
            ]);
        }

        if (!(int)$program->registration_allowed) {
            return $this->fail(422, 'Registration is closed for this program.');
        }
        $openTo = $program->open_to ?: 'both';
        if ($openTo !== 'both') {
            $gender = $this->viewerGender($user);
            if ($gender === null) {
                return $this->fail(409, 'Select your gender to join this program.', ['code' => 'gender_required']);
            }
            if ($gender !== $openTo) {
                return $this->fail(422, $openTo === 'f' ? 'This program is for sisters only.' : 'This program is for brothers only.');
            }
        }

        $status = $this->newSubscriberStatus($program);
        if ($status === null) {
            return $this->fail(422, 'This program is full.', ['code' => 'program_full']);
        }

        $enrolment = new ProgramCustomer();
        $enrolment->role = 3;
        $enrolment->id_customer = $user->id;
        $enrolment->id_program = $program->id;
        $enrolment->status = $status;
        $enrolment->created_at = date('Y-m-d H:i:s');
        if (!$enrolment->save()) {
            return $this->fail(500, 'Failed to subscribe');
        }

        return $this->ok([
            'message' => $status === 'waitlisted' ? 'Added to the waitlist' : 'Subscribed successfully',
            'entrolled' => 1,
            'enrolment_status' => $status,
            'subscription_count' => $this->enrolledCount($program),
        ]);
    }

    /**
     * GET ?lat&lng: active programs open to the viewer whose halqa has a masjid within the
     * program's radius_km of that point, nearest first. Works without login (guest card).
     */
    public function actionProgramsNear()
    {
        $lat = Yii::$app->request->get('lat');
        $lng = Yii::$app->request->get('lng');
        if (!is_numeric($lat) || !is_numeric($lng) || abs((float)$lat) > 90 || abs((float)$lng) > 180) {
            return $this->fail(400, 'lat and lng are required');
        }
        $lat = (float)$lat;
        $lng = (float)$lng;

        $viewer = $this->getAuthorizedUser();
        $gender = $viewer ? $this->viewerGender($viewer) : null;

        $query = Program::find()
            ->where(['status' => 'active', 'registration_allowed' => 1])
            ->andWhere(['>=', 'end_date', date('Y-m-d')]);
        if ($gender !== null) {
            $query->andWhere(['open_to' => ['both', $gender]]);
        }
        $programs = $query->asArray()->all();
        if (!$programs) {
            return $this->ok(['list' => []]);
        }

        $halqaIds = array_values(array_unique(array_map(function ($p) {
            return (int)$p['id_halqa'];
        }, $programs)));
        // Each area's point nearest to the user: a masjid, else the area's saved location, else its city.
        $points = $this->areaLocations($halqaIds, [$lat, $lng]);
        $masjidNames = (new Query())
            ->select(['hm.id_halqa', 'm.id', 'm.name', 'm.latitude', 'm.longitude'])
            ->from('bt_halqa_masjid hm')
            ->innerJoin('bt_masjid m', 'm.id = hm.id_masjid')
            ->where(['hm.id_halqa' => $halqaIds])
            ->all();
        $areaNames = (new Query())->select(['h.id', 'h.name', 'c.name AS city'])->from('bt_halqa h')
            ->leftJoin('bt_cities c', 'c.id = h.id_city')->where(['h.id' => $halqaIds])->indexBy('id')->all();
        $nearestByHalqa = [];
        foreach ($points as $halqaId => $point) {
            $masjid = null;
            foreach ($masjidNames as $m) {
                if ((int)$m['id_halqa'] === $halqaId && (float)$m['latitude'] === $point[0] && (float)$m['longitude'] === $point[1]) {
                    $masjid = $m;
                    break;
                }
            }
            $area = $areaNames[$halqaId] ?? null;
            $nearestByHalqa[$halqaId] = [
                'distance' => $this->distanceKm($lat, $lng, $point[0], $point[1]),
                'masjid_id' => $masjid ? (int)$masjid['id'] : null,
                // Shown under the program name: the masjid, else "Area, City".
                'masjid_name' => $masjid ? $masjid['name'] : ($area ? trim($area['name'] . ($area['city'] ? ', ' . $area['city'] : '')) : null),
            ];
        }

        $list = [];
        foreach ($programs as $program) {
            $nearest = $nearestByHalqa[(int)$program['id_halqa']] ?? null;
            $radius = max(1, (int)($program['radius_km'] ?? 10));
            if (!$nearest || $nearest['distance'] > $radius) {
                continue;
            }
            $list[] = array_merge($this->serializeProgramSummary($program, $viewer), [
                'distance_km' => round($nearest['distance'], 1),
                'masjid_id' => $nearest['masjid_id'],
                'masjid_name' => $nearest['masjid_name'],
            ]);
        }
        usort($list, function ($a, $b) {
            return $a['distance_km'] <=> $b['distance_km'];
        });

        return $this->ok(['list' => array_slice($list, 0, 10)]);
    }

    /**
     * GET ?id_program[&gender=m|f]: program members. Admin / volunteers see everyone with contact
     * details; an enrolled member sees only members of their own gender (name + photo).
     */
    public function actionProgramMembers()
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            return $this->fail(401, 'Unauthorized');
        }
        $program = Program::findOne((int)Yii::$app->request->get('id_program'));
        if (!$program) {
            return $this->fail(404, 'Program not found');
        }

        $role = $this->programRole($program, $user);
        $team = $this->isTeamRole($role);
        if ($role === null) {
            return $this->fail(403, 'Join this program to see its members.');
        }

        $query = (new Query())
            ->select([
                'c.id', 'c.firstname', 'c.lastname', 'c.image', 'c.gender', 'c.phone', 'c.email',
                'c.occupation', 'c.company_name', 'c.designation', 'c.employment_status', 'c.pincode',
                'c.masjid', 'm.name AS masjid_name', 'pc.role', 'pc.status', 'pc.created_at AS joined_at',
            ])
            ->from('bt_program_customer pc')
            ->innerJoin('bt_customer c', 'c.id = pc.id_customer')
            ->leftJoin('bt_masjid m', 'm.id = c.masjid')
            ->where(['pc.id_program' => $program->id])
            ->orderBy(['pc.role' => SORT_ASC, 'c.firstname' => SORT_ASC, 'c.lastname' => SORT_ASC]);

        $gender = null;
        if ($team) {
            $gender = Yii::$app->request->get('gender');
            $gender = in_array($gender, ['m', 'f'], true) ? $gender : null;
            if ($gender !== null) {
                $query->andWhere(['c.gender' => $gender]);
            }
        } else {
            $gender = $this->viewerGender($user);
            if ($gender === null) {
                return $this->fail(409, 'Select your gender to see members.', ['code' => 'gender_required']);
            }
            $query->andWhere(['c.gender' => $gender]);
        }

        $list = [];
        foreach ($query->all() as $row) {
            $id = (int)$row['id'];
            if (isset($list[$id])) {
                continue; // Lowest role wins (admin > volunteer > subscriber).
            }
            if ((int)$row['id'] === (int)$program->id_customer) {
                $row['role'] = 1;
            }
            $list[$id] = $this->memberRow($row, $team);
        }
        // The creator may have no bt_program_customer row (older programs).
        if (!isset($list[(int)$program->id_customer])) {
            $owner = Customer::findOne($program->id_customer);
            // Same gender rule as the list: the team's filter, or the viewer's own gender.
            if ($owner && ($gender === null || $owner->gender === $gender)) {
                $list = [(int)$owner->id => $this->memberRow(array_merge($owner->toArray(), ['role' => 1, 'status' => 'enrolled']), $team)] + $list;
            }
        }

        $list = array_values($list);
        $counts = ['total' => count($list), 'm' => 0, 'f' => 0, 'volunteers' => 0, 'subscribers' => 0, 'waitlisted' => 0];
        foreach ($list as $member) {
            if (in_array($member['gender'], ['m', 'f'], true)) {
                $counts[$member['gender']]++;
            }
            if ($member['role'] === 2) {
                $counts['volunteers']++;
            } elseif ($member['role'] === 3) {
                $member['status'] === 'waitlisted' ? $counts['waitlisted']++ : $counts['subscribers']++;
            }
        }

        return $this->ok([
            'list' => $list,
            'counts' => $counts,
            'viewer_role' => $role,
            'can_manage' => $team,
            'is_admin' => $role === 'admin',
            'program_ended' => $this->isProgramEnded($program),
            'imagePath' => Yii::$app->params['userImagePath'],
        ]);
    }

    /** GET ?id_program&query: team-only search of registered users to add (min 3 characters). */
    public function actionProgramMemberSearch()
    {
        $context = $this->requireProgramTeam(Yii::$app->request->get('id_program'));
        if (!is_array($context)) {
            return $context;
        }
        [$program] = $context;

        $term = trim((string)Yii::$app->request->get('query'));
        if (mb_strlen($term) < 3) {
            return $this->fail(400, 'Type at least 3 characters.');
        }

        $rows = Customer::find()
            ->select(['id', 'firstname', 'lastname', 'image', 'gender', 'phone'])
            ->where(['or', ['like', 'firstname', $term], ['like', 'lastname', $term], ['like', 'phone', $term]])
            ->andWhere(['or', ['deleted' => 0], ['deleted' => null]])
            ->orderBy(['firstname' => SORT_ASC])
            ->limit(15)
            ->asArray()
            ->all();

        $roles = ProgramCustomer::find()
            ->select(['id_customer', 'role'])
            ->where(['id_program' => $program->id, 'id_customer' => array_column($rows, 'id')])
            ->orderBy(['role' => SORT_ASC])
            ->asArray()
            ->all();
        $roleByCustomer = [];
        foreach ($roles as $r) {
            $roleByCustomer[(int)$r['id_customer']] = $roleByCustomer[(int)$r['id_customer']] ?? (int)$r['role'];
        }

        return $this->ok(['list' => array_map(function ($row) use ($roleByCustomer, $program) {
            $id = (int)$row['id'];
            return [
                'id' => $id,
                'firstname' => $row['firstname'],
                'lastname' => $row['lastname'],
                'image' => $row['image'],
                'gender' => $row['gender'] ?: null,
                'phone' => $this->maskPhone($row['phone']),
                'role' => $id === (int)$program->id_customer ? 1 : ($roleByCustomer[$id] ?? null),
            ];
        }, $rows)]);
    }

    /**
     * POST {id_program, id_customer, role}: role 2 volunteer, 3 subscriber, 0 remove from program.
     * Admin and volunteers may add members and make volunteers; only the admin demotes or removes
     * a volunteer. The admin / organisers cannot be changed here.
     */
    public function actionProgramMemberRole()
    {
        $data = $this->readJsonBody();
        $context = $this->requireProgramTeam($data['id_program'] ?? null);
        if (!is_array($context)) {
            return $context;
        }
        [$program, $user, $role] = $context;

        if ($this->isProgramEnded($program)) {
            return $this->fail(422, 'This program has ended.');
        }
        $newRole = (int)($data['role'] ?? -1);
        if (!in_array($newRole, [0, 2, 3], true)) {
            return $this->fail(400, 'Role must be 2 (volunteer), 3 (subscriber) or 0 (remove).');
        }
        $target = Customer::findOne((int)($data['id_customer'] ?? 0));
        if (!$target) {
            return $this->fail(404, 'User not found');
        }

        $currentRoles = array_map('intval', ProgramCustomer::find()
            ->select('role')
            ->where(['id_program' => $program->id, 'id_customer' => $target->id])
            ->column());
        if ((int)$target->id === (int)$program->id_customer || in_array(1, $currentRoles, true)) {
            return $this->fail(403, 'The program admin cannot be changed here.');
        }
        if (in_array(2, $currentRoles, true) && $newRole !== 2 && $role !== 'admin') {
            return $this->fail(403, 'Only the program admin can remove a volunteer.');
        }

        $current = in_array(2, $currentRoles, true) ? 2 : (in_array(3, $currentRoles, true) ? 3 : 0);
        if ($current === $newRole) {
            return $this->ok(['message' => 'No change', 'role' => $newRole]);
        }

        $status = 'enrolled';
        if ($newRole === 3) {
            $status = $this->newSubscriberStatus($program);
            if ($status === null) {
                return $this->fail(422, 'This program is full.', ['code' => 'program_full']);
            }
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            ProgramCustomer::deleteAll(['id_program' => $program->id, 'id_customer' => $target->id, 'role' => [2, 3]]);
            if ($newRole !== 0) {
                $row = new ProgramCustomer();
                $row->id_program = $program->id;
                $row->id_customer = $target->id;
                $row->role = $newRole;
                $row->status = $status;
                $row->added_by = $user->id;
                $row->created_at = date('Y-m-d H:i:s');
                if (!$row->save()) {
                    throw new \RuntimeException(Json::encode($row->getErrors()));
                }
            }
            $transaction->commit();
        } catch (\Throwable $e) {
            $transaction->rollBack();
            Yii::error($e->getMessage(), __METHOD__);
            return $this->fail(500, 'Could not update the member.');
        }

        if ($current === 3 && $newRole !== 3) {
            $this->promoteFromWaitlist($program);
        }

        $messages = [0 => 'Removed from the program', 2 => 'Now a volunteer', 3 => $status === 'waitlisted' ? 'Added to the waitlist' : 'Now a subscriber'];
        return $this->ok(['message' => $messages[$newRole], 'role' => $newRole, 'status' => $newRole ? $status : null]);
    }

    /**
     * POST {id_program, firstname, lastname, phone, gender}: team adds someone who is not on the
     * app yet. An existing account with that mobile is enrolled instead. No SMS is sent (NF-012 Q4);
     * the person signs in later through "Forgot password" with their mobile.
     */
    public function actionProgramAddMember()
    {
        $data = $this->readJsonBody();
        $context = $this->requireProgramTeam($data['id_program'] ?? null);
        if (!is_array($context)) {
            return $context;
        }
        [$program, $user] = $context;

        if ($this->isProgramEnded($program)) {
            return $this->fail(422, 'This program has ended.');
        }

        $phone = preg_replace('/\D+/', '', (string)($data['phone'] ?? ''));
        $firstname = trim(preg_replace('/\s+/u', ' ', (string)($data['firstname'] ?? '')));
        $lastname = trim(preg_replace('/\s+/u', ' ', (string)($data['lastname'] ?? '')));
        $gender = (string)($data['gender'] ?? '');
        if (!preg_match('/^[6-9][0-9]{9}$/', $phone)) {
            return $this->fail(422, 'Enter a valid 10-digit mobile number starting with 6-9', ['key' => 'phone']);
        }

        $customer = Customer::find()->where(['username' => $phone])->orWhere(['phone' => $phone])->one();
        $created = false;
        if (!$customer) {
            if (mb_strlen($firstname) < 2 || mb_strlen($firstname) > 50 || !preg_match("/^[\\p{L}\\p{M}][\\p{L}\\p{M} .'-]*$/u", $firstname)) {
                return $this->fail(422, 'Enter the first name using letters only', ['key' => 'firstname']);
            }
            if ($lastname !== '' && (mb_strlen($lastname) > 50 || !preg_match("/^[\\p{L}\\p{M}][\\p{L}\\p{M} .'-]*$/u", $lastname))) {
                return $this->fail(422, 'Enter the last name using letters only', ['key' => 'lastname']);
            }
            if (!in_array($gender, ['m', 'f'], true)) {
                return $this->fail(422, 'Select a gender', ['key' => 'gender']);
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
            $customer->created_by = $user->id;
            if (!$customer->save()) {
                return $this->fail(422, 'Could not create the member.', ['details' => $customer->getErrors()]);
            }
            $created = true;
        }

        $currentRoles = array_map('intval', ProgramCustomer::find()
            ->select('role')
            ->where(['id_program' => $program->id, 'id_customer' => $customer->id])
            ->column());
        if ($currentRoles || (int)$customer->id === (int)$program->id_customer) {
            return $this->ok(['message' => 'Already a member of this program', 'id_customer' => (int)$customer->id, 'created' => false]);
        }

        $status = $this->newSubscriberStatus($program);
        if ($status === null) {
            return $this->fail(422, 'This program is full.', ['code' => 'program_full']);
        }
        $row = new ProgramCustomer();
        $row->id_program = $program->id;
        $row->id_customer = $customer->id;
        $row->role = 3;
        $row->status = $status;
        $row->added_by = $user->id;
        $row->created_at = date('Y-m-d H:i:s');
        if (!$row->save()) {
            return $this->fail(500, 'Could not add the member.');
        }

        return $this->ok([
            'message' => $status === 'waitlisted' ? 'Added to the waitlist' : 'Member added',
            'id_customer' => (int)$customer->id,
            'created' => $created,
            'status' => $status,
        ], 201);
    }

    /** GET ?id_program&id_customer: a subscribed member's profile for the team to edit. */
    public function actionProgramMemberProfile()
    {
        $context = $this->requireEditableMember(Yii::$app->request->get('id_program'), Yii::$app->request->get('id_customer'));
        if (!is_array($context)) {
            return $context;
        }
        [, , $target] = $context;

        return $this->ok([
            'profile' => $this->editableProfile($target),
            'history' => $this->profileHistory((int)$target->id),
            'imagePath' => Yii::$app->params['userImagePath'],
        ]);
    }

    /**
     * POST {id_program, id_customer, ...fields}: the team updates a subscribed member's profile.
     * Not mobile, email, password, role or status. Latest save wins; each changed field is logged.
     */
    public function actionSaveProgramMemberProfile()
    {
        $data = $this->readJsonBody();
        $context = $this->requireEditableMember($data['id_program'] ?? null, $data['id_customer'] ?? null);
        if (!is_array($context)) {
            return $context;
        }
        [$program, $user, $target] = $context;

        $changes = $this->validatedProfileChanges($target, $data);
        if (isset($changes['error'])) {
            return $this->fail(422, $changes['error'], ['key' => $changes['key']]);
        }
        if (!$changes) {
            return $this->ok(['message' => 'No changes', 'profile' => $this->editableProfile($target)]);
        }

        $now = date('Y-m-d H:i:s');
        $transaction = Yii::$app->db->beginTransaction();
        try {
            foreach ($changes as $field => $value) {
                Yii::$app->db->createCommand()->insert('bt_customer_profile_history', [
                    'id_customer' => $target->id,
                    'changed_by' => $user->id,
                    'id_program' => $program->id,
                    'field' => $field,
                    'old_value' => (string)($target->getAttribute($field) ?? ''),
                    'new_value' => (string)$value,
                    'changed_at' => $now,
                ])->execute();
            }
            $attributes = $changes + ['profile_updated_by' => $user->id, 'profile_updated_at' => $now];
            if (isset($changes['gender'])) {
                $attributes['gender_confirmed'] = 1;
            }
            $target->updateAttributes($attributes);
            $transaction->commit();
        } catch (\Throwable $e) {
            $transaction->rollBack();
            Yii::error($e->getMessage(), __METHOD__);
            return $this->fail(500, 'Could not save the profile.');
        }

        return $this->ok([
            'message' => 'Profile updated',
            'profile' => $this->editableProfile($target),
            'history' => $this->profileHistory((int)$target->id),
        ]);
    }

    /** GET ?id_program&date=Y-m-d[&gender]: subscribers with that day's packets (team only). */
    public function actionProgramPackets()
    {
        $context = $this->requireProgramTeam(Yii::$app->request->get('id_program'));
        if (!is_array($context)) {
            return $context;
        }
        [$program, , $role] = $context;

        $date = $this->readDate(Yii::$app->request->get('date')) ?? date('Y-m-d');
        $query = (new Query())
            ->select([
                'c.id', 'c.firstname', 'c.lastname', 'c.image', 'c.gender', 'c.phone',
                'sp.packets', 'sp.token', 'sp.updated_at', 'r.firstname AS recorded_by_name',
            ])
            ->from('bt_program_customer pc')
            ->innerJoin('bt_customer c', 'c.id = pc.id_customer')
            ->leftJoin('bt_subscriber_packets sp', 'sp.id_program = pc.id_program AND sp.id_customer = pc.id_customer AND sp.date = :d', [':d' => $date])
            ->leftJoin('bt_customer r', 'r.id = sp.recorded_by')
            ->where(['pc.id_program' => $program->id, 'pc.role' => 3, 'pc.status' => 'enrolled'])
            ->orderBy(['c.firstname' => SORT_ASC, 'c.lastname' => SORT_ASC]);
        $gender = Yii::$app->request->get('gender');
        if (in_array($gender, ['m', 'f'], true)) {
            $query->andWhere(['c.gender' => $gender]);
        }

        $list = [];
        $totalPackets = 0;
        $entered = 0;
        foreach ($query->all() as $row) {
            $hasEntry = $row['packets'] !== null;
            $totalPackets += (int)$row['packets'];
            $entered += $hasEntry ? 1 : 0;
            $list[] = [
                'id' => (int)$row['id'],
                'firstname' => $row['firstname'],
                'lastname' => $row['lastname'],
                'image' => $row['image'],
                'gender' => $row['gender'] ?: null,
                'phone' => $row['phone'],
                'packets' => $hasEntry ? (int)$row['packets'] : null,
                'token' => $row['token'] !== null ? (int)$row['token'] : null,
                'recorded_by_name' => $row['recorded_by_name'],
                'updated_at' => $row['updated_at'],
            ];
        }

        return $this->ok([
            'date' => $date,
            'list' => $list,
            'totals' => ['members' => count($list), 'entered' => $entered, 'packets' => $totalPackets],
            'editable' => $this->isPacketDateEditable($program, $date),
            'viewer_role' => $role,
            'imagePath' => Yii::$app->params['userImagePath'],
        ]);
    }

    /**
     * POST {id_program, date, entries: [{id_customer, packets, token?}]}: team saves the day's
     * packets. One row per program + member + day; saving again corrects it.
     */
    public function actionSavePackets()
    {
        $data = $this->readJsonBody();
        $context = $this->requireProgramTeam($data['id_program'] ?? null);
        if (!is_array($context)) {
            return $context;
        }
        [$program, $user] = $context;

        $date = $this->readDate($data['date'] ?? null);
        if ($date === null) {
            return $this->fail(400, 'A valid date is required.');
        }
        if (!$this->isPacketDateEditable($program, $date)) {
            return $this->fail(422, 'Packets can be entered only for days of the program, up to tomorrow.');
        }
        $entries = is_array($data['entries'] ?? null) ? $data['entries'] : [];
        if (!$entries || count($entries) > 1000) {
            return $this->fail(400, 'No packets to save.');
        }

        $subscriberIds = array_map('intval', ProgramCustomer::find()
            ->select('id_customer')
            ->where(['id_program' => $program->id, 'role' => 3, 'status' => 'enrolled'])
            ->column());
        $subscriberIds = array_flip($subscriberIds);

        $transaction = Yii::$app->db->beginTransaction();
        try {
            $saved = 0;
            foreach ($entries as $entry) {
                $customerId = (int)($entry['id_customer'] ?? 0);
                if (!isset($subscriberIds[$customerId])) {
                    throw new \InvalidArgumentException('Member ' . $customerId . ' is not a subscriber of this program.');
                }
                $packets = $entry['packets'] ?? null;
                if (!is_numeric($packets) || (float)$packets != (int)$packets || (int)$packets < 0 || (int)$packets > 999) {
                    throw new \InvalidArgumentException('Packets must be a whole number from 0 to 999.');
                }
                $token = $entry['token'] ?? null;
                if ($token !== null && $token !== '' && (!is_numeric($token) || (int)$token < 0)) {
                    throw new \InvalidArgumentException('Token must be a number.');
                }

                $row = SubscriberPackets::findOne(['id_program' => $program->id, 'id_customer' => $customerId, 'date' => $date]);
                if (!$row) {
                    $row = new SubscriberPackets();
                    $row->id_program = $program->id;
                    $row->id_customer = $customerId;
                    $row->date = $date;
                    $row->created_at = date('Y-m-d H:i:s');
                }
                $row->packets = (int)$packets;
                $row->token = ($token === null || $token === '') ? null : (int)$token;
                $row->recorded_by = $user->id;
                $row->updated_at = date('Y-m-d H:i:s');
                if (!$row->save()) {
                    throw new \RuntimeException(Json::encode($row->getErrors()));
                }
                $saved++;
            }
            $transaction->commit();
        } catch (\InvalidArgumentException $e) {
            $transaction->rollBack();
            return $this->fail(422, $e->getMessage());
        } catch (\Throwable $e) {
            $transaction->rollBack();
            Yii::error($e->getMessage(), __METHOD__);
            return $this->fail(500, 'Could not save the packets.');
        }

        $totals = (new Query())
            ->select(['COUNT(*) AS entered', 'COALESCE(SUM(packets), 0) AS packets'])
            ->from(SubscriberPackets::tableName())
            ->where(['id_program' => $program->id, 'date' => $date])
            ->one();

        return $this->ok([
            'message' => 'Saved',
            'saved' => $saved,
            'date' => $date,
            'totals' => ['entered' => (int)$totals['entered'], 'packets' => (int)$totals['packets']],
        ]);
    }

    /** GET ?id_program: program dashboard numbers (team only). */
    public function actionProgramStats()
    {
        $context = $this->requireProgramTeam(Yii::$app->request->get('id_program'));
        if (!is_array($context)) {
            return $context;
        }
        [$program] = $context;
        $today = date('Y-m-d');

        $roleCounts = (new Query())
            ->select(['pc.role', 'pc.status', 'c.gender', 'COUNT(DISTINCT pc.id_customer) AS n'])
            ->from('bt_program_customer pc')
            ->innerJoin('bt_customer c', 'c.id = pc.id_customer')
            ->where(['pc.id_program' => $program->id])
            ->groupBy(['pc.role', 'pc.status', 'c.gender'])
            ->all();
        $counts = ['subscribers' => 0, 'waitlisted' => 0, 'volunteers' => 0, 'brothers' => 0, 'sisters' => 0];
        foreach ($roleCounts as $r) {
            $n = (int)$r['n'];
            if ((int)$r['role'] === 2) {
                $counts['volunteers'] += $n;
            } elseif ((int)$r['role'] === 3) {
                if ($r['status'] === 'waitlisted') {
                    $counts['waitlisted'] += $n;
                    continue;
                }
                $counts['subscribers'] += $n;
                if ($r['gender'] === 'f') {
                    $counts['sisters'] += $n;
                } else {
                    $counts['brothers'] += $n;
                }
            }
        }

        $perDay = (new Query())
            ->select(['date', 'SUM(packets) AS packets', 'COUNT(*) AS members'])
            ->from(SubscriberPackets::tableName())
            ->where(['id_program' => $program->id])
            ->groupBy(['date'])
            ->orderBy(['date' => SORT_ASC])
            ->all();
        $packetsTotal = 0;
        $packetsToday = 0;
        foreach ($perDay as &$day) {
            $day['packets'] = (int)$day['packets'];
            $day['members'] = (int)$day['members'];
            $packetsTotal += $day['packets'];
            if ($day['date'] === $today) {
                $packetsToday = $day['packets'];
            }
        }
        unset($day);

        $noPacketsToday = (new Query())
            ->select(['c.id', 'c.firstname', 'c.lastname', 'c.phone', 'c.gender'])
            ->from('bt_program_customer pc')
            ->innerJoin('bt_customer c', 'c.id = pc.id_customer')
            ->leftJoin('bt_subscriber_packets sp', 'sp.id_program = pc.id_program AND sp.id_customer = pc.id_customer AND sp.date = :d', [':d' => $today])
            ->where(['pc.id_program' => $program->id, 'pc.role' => 3, 'pc.status' => 'enrolled', 'sp.id' => null])
            ->orderBy(['c.firstname' => SORT_ASC])
            ->limit(100)
            ->all();

        $start = strtotime((string)$program->start_date);
        $end = strtotime((string)$program->end_date);
        $daysTotal = ($start && $end) ? (int)round(($end - $start) / 86400) + 1 : null;
        $daysLeft = $end ? max(0, (int)round(($end - strtotime($today)) / 86400) + ($program->end_date >= $today ? 1 : 0)) : null;

        return $this->ok([
            'counts' => $counts,
            'packets_today' => $packetsToday,
            'packets_total' => $packetsTotal,
            'days_total' => $daysTotal,
            'days_left' => $daysLeft,
            'per_day' => $perDay,
            'no_packets_today' => array_map(function ($c) {
                return ['id' => (int)$c['id'], 'firstname' => $c['firstname'], 'lastname' => $c['lastname'], 'phone' => $c['phone'], 'gender' => $c['gender'] ?: null];
            }, $noPacketsToday),
            'today' => $today,
            'is_ended' => $this->isProgramEnded($program),
        ]);
    }

    /**
     * GET ?lat&lng[&q][&id_city]: area type-ahead for the program form (NF-012 rev). Areas are shared;
     * the response carries the city nearest to lat/lng (the form's default) and areas sorted by distance
     * from the user. With q, only areas whose name contains q (in id_city when given).
     */
    public function actionAreaSuggest()
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            return $this->fail(401, 'Unauthorized');
        }
        $request = Yii::$app->request;
        $lat = is_numeric($request->get('lat')) ? (float)$request->get('lat') : null;
        $lng = is_numeric($request->get('lng')) ? (float)$request->get('lng') : null;
        $origin = ($lat !== null && $lng !== null && abs($lat) <= 90 && abs($lng) <= 180) ? [$lat, $lng] : null;
        $term = $this->normalizeAreaName((string)$request->get('q'));
        $cityId = ctype_digit((string)$request->get('id_city')) ? (int)$request->get('id_city') : null;

        $query = (new Query())
            ->select(['h.id', 'h.name', 'h.id_city', 'h.latitude', 'h.longitude', 'c.name AS city_name', 'c.latitude AS city_lat', 'c.longitude AS city_lng'])
            ->from('bt_halqa h')
            ->leftJoin('bt_cities c', 'c.id = h.id_city')
            ->where(['h.status' => 1]);
        if ($term !== '') {
            $query->andWhere(['like', 'h.name', $term]);
        }
        if ($cityId) {
            $query->andWhere(['h.id_city' => $cityId]);
        }
        $areas = $query->limit(300)->all();

        $locations = $this->areaLocations(array_column($areas, 'id'), $origin);
        $list = [];
        foreach ($areas as $area) {
            $id = (int)$area['id'];
            $distance = null;
            if ($origin && isset($locations[$id])) {
                $distance = round($this->distanceKm($origin[0], $origin[1], $locations[$id][0], $locations[$id][1]), 1);
            }
            // Without a typed name, suggest only areas around the user.
            if ($term === '' && !$cityId && ($distance === null || $distance > 25)) {
                continue;
            }
            $list[] = [
                'id' => $id,
                'name' => $area['name'],
                'id_city' => $area['id_city'] !== null ? (int)$area['id_city'] : null,
                'city_name' => $area['city_name'],
                'distance_km' => $distance,
                'masjid_count' => (int)HalqaMasjid::find()->where(['id_halqa' => $id])->count(),
            ];
        }
        usort($list, function ($a, $b) {
            return ($a['distance_km'] ?? INF) <=> ($b['distance_km'] ?? INF) ?: strcasecmp($a['name'], $b['name']);
        });

        return $this->ok([
            'city' => $origin ? $this->nearestCity($origin[0], $origin[1]) : null,
            'list' => array_slice($list, 0, 15),
        ]);
    }

    /** GET ?q: cities for the program form's city field (min 2 characters). */
    public function actionCitySearch()
    {
        if (!$this->getAuthorizedUser()) {
            return $this->fail(401, 'Unauthorized');
        }
        $term = trim((string)Yii::$app->request->get('q'));
        if (mb_strlen($term) < 2) {
            return $this->ok(['list' => []]);
        }
        $rows = (new Query())
            ->select(['c.id', 'c.name', 'co.name AS country'])
            ->from('bt_cities c')
            ->leftJoin('bt_countries co', 'co.id = c.country_id')
            ->where(['c.is_active' => 1])
            ->andWhere(['like', 'c.name', $term . '%', false])
            ->orderBy(['c.population' => SORT_DESC])
            ->limit(10)
            ->all();
        return $this->ok(['list' => array_map(function ($r) {
            return ['id' => (int)$r['id'], 'name' => $r['name'], 'country' => $r['country']];
        }, $rows)]);
    }

    // ---- NF-012 helpers -------------------------------------------------------------------------

    /** Trims and collapses spaces so "Gandhi  Nagar " and "Gandhi Nagar" are the same area. */
    private function normalizeAreaName(string $name): string
    {
        return trim(preg_replace('/\s+/u', ' ', $name));
    }

    /**
     * The area with this name in this city (names compare case-insensitively), created when missing.
     * A new area remembers the creator's location so "Programs near you" can place it.
     * @return Halqa|string the area, or a JSON error
     */
    private function findOrCreateArea(string $name, int $cityId, $lat, $lng, Customer $user)
    {
        $name = $this->normalizeAreaName($name);
        if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
            return $this->fail(422, 'Enter an area name of 2 to 100 characters.', ['key' => 'area_name']);
        }
        $city = (new Query())->select(['c.id', 'c.name', 'co.name AS country'])->from('bt_cities c')
            ->leftJoin('bt_countries co', 'co.id = c.country_id')->where(['c.id' => $cityId])->one();
        if (!$city) {
            return $this->fail(422, 'Pick the city from the list.', ['key' => 'id_city']);
        }
        $existing = Halqa::find()->where(['id_city' => $cityId, 'name' => $name])->one();
        if ($existing) {
            return $existing;
        }
        $area = new Halqa();
        $area->name = $name;
        $area->id_city = $cityId;
        $area->city = $city['name'];
        $area->country = $city['country'];
        $area->id_customer = $user->id;
        $area->status = 1;
        if (is_numeric($lat) && is_numeric($lng) && abs((float)$lat) <= 90 && abs((float)$lng) <= 180) {
            $area->latitude = round((float)$lat, 7);
            $area->longitude = round((float)$lng, 7);
        }
        try {
            if ($area->save()) {
                return $area;
            }
        } catch (\yii\db\IntegrityException $e) {
            // Someone created the same area at the same moment: use theirs.
            $existing = Halqa::find()->where(['id_city' => $cityId, 'name' => $name])->one();
            if ($existing) {
                return $existing;
            }
        }
        return $this->fail(422, 'Could not save the area.', ['details' => $area->getErrors()]);
    }

    /**
     * Where each area is, for distances: its masjid nearest to $origin (or its first masjid), else
     * the location saved when the area was created, else its city centre.
     * @return array<int, array{0: float, 1: float}>
     */
    private function areaLocations(array $areaIds, ?array $origin): array
    {
        $areaIds = array_map('intval', $areaIds);
        if (!$areaIds) {
            return [];
        }
        $result = [];
        $masjids = (new Query())
            ->select(['hm.id_halqa', 'm.latitude', 'm.longitude'])
            ->from('bt_halqa_masjid hm')
            ->innerJoin('bt_masjid m', 'm.id = hm.id_masjid')
            ->where(['hm.id_halqa' => $areaIds])
            ->andWhere(['not', ['m.latitude' => null]])
            ->andWhere(['not', ['m.longitude' => null]])
            ->all();
        $best = [];
        foreach ($masjids as $m) {
            $id = (int)$m['id_halqa'];
            $point = [(float)$m['latitude'], (float)$m['longitude']];
            $d = $origin ? $this->distanceKm($origin[0], $origin[1], $point[0], $point[1]) : 0;
            if (!isset($best[$id]) || $d < $best[$id]) {
                $best[$id] = $d;
                $result[$id] = $point;
            }
        }
        $areas = (new Query())
            ->select(['h.id', 'h.latitude', 'h.longitude', 'c.latitude AS city_lat', 'c.longitude AS city_lng'])
            ->from('bt_halqa h')
            ->leftJoin('bt_cities c', 'c.id = h.id_city')
            ->where(['h.id' => $areaIds])
            ->all();
        foreach ($areas as $a) {
            $id = (int)$a['id'];
            if (isset($result[$id])) {
                continue;
            }
            if ($a['latitude'] !== null && $a['longitude'] !== null) {
                $result[$id] = [(float)$a['latitude'], (float)$a['longitude']];
            } elseif ($a['city_lat'] !== null && $a['city_lng'] !== null) {
                $result[$id] = [(float)$a['city_lat'], (float)$a['city_lng']];
            }
        }
        return $result;
    }

    /** The city nearest to a point (within about 110 km), for the program form's default city. */
    private function nearestCity(float $lat, float $lng): ?array
    {
        $rows = (new Query())
            ->select(['c.id', 'c.name', 'c.latitude', 'c.longitude', 'co.name AS country'])
            ->from('bt_cities c')
            ->leftJoin('bt_countries co', 'co.id = c.country_id')
            ->where(['c.is_active' => 1])
            ->andWhere(['between', 'c.latitude', $lat - 1, $lat + 1])
            ->andWhere(['between', 'c.longitude', $lng - 1, $lng + 1])
            ->all();
        $best = null;
        $bestDistance = INF;
        foreach ($rows as $row) {
            $d = $this->distanceKm($lat, $lng, (float)$row['latitude'], (float)$row['longitude']);
            if ($d < $bestDistance) {
                $bestDistance = $d;
                $best = ['id' => (int)$row['id'], 'name' => $row['name'], 'country' => $row['country']];
            }
        }
        return $best;
    }

    private function fail(int $status, string $error, array $extra = []): string
    {
        Yii::$app->response->statusCode = $status;
        return Json::encode(array_merge(['error' => $error], $extra));
    }

    private function ok(array $body, int $status = 200): string
    {
        Yii::$app->response->statusCode = $status;
        return Json::encode($body);
    }

    private function readJsonBody(): array
    {
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        return is_array($data) ? $data : [];
    }

    private function readDate($value): ?string
    {
        $value = (string)$value;
        $parsed = DateTime::createFromFormat('Y-m-d', $value);
        return ($parsed && $parsed->format('Y-m-d') === $value) ? $value : null;
    }

    private function isSuperAdmin(?Customer $user): bool
    {
        return $user !== null && (int)$user->id_role === 1;
    }

    private function viewerGender(Customer $user): ?string
    {
        return in_array($user->gender, ['m', 'f'], true) ? $user->gender : null;
    }

    private function isProgramEnded(Program $program): bool
    {
        return !empty($program->end_date) && $program->end_date < date('Y-m-d');
    }

    /** 'admin' | 'volunteer' | 'subscriber' | null for this user in this program. */
    private function programRole(Program $program, Customer $user): ?string
    {
        if ($this->isSuperAdmin($user) || (int)$program->id_customer === (int)$user->id) {
            return 'admin';
        }
        $roles = array_map('intval', ProgramCustomer::find()
            ->select('role')
            ->where(['id_program' => $program->id, 'id_customer' => $user->id])
            ->column());
        if (in_array(1, $roles, true)) {
            return 'admin';
        }
        if (in_array(2, $roles, true)) {
            return 'volunteer';
        }
        return in_array(3, $roles, true) ? 'subscriber' : null;
    }

    private function isTeamRole(?string $role): bool
    {
        return $role === 'admin' || $role === 'volunteer';
    }

    /** @return array{0: Program, 1: Customer, 2: string}|string [program, user, role] or a JSON error. */
    private function requireProgramTeam($programId)
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            return $this->fail(401, 'Unauthorized');
        }
        $program = $programId ? Program::findOne((int)$programId) : null;
        if (!$program) {
            return $this->fail(404, 'Program not found');
        }
        $role = $this->programRole($program, $user);
        if (!$this->isTeamRole($role)) {
            return $this->fail(403, 'Only the program admin and volunteers can do this.');
        }
        return [$program, $user, $role];
    }

    /**
     * Team member + a target who is a subscriber / volunteer of this running program (NF-012 Q12).
     * @return array{0: Program, 1: Customer, 2: Customer}|string
     */
    private function requireEditableMember($programId, $customerId)
    {
        $context = $this->requireProgramTeam($programId);
        if (!is_array($context)) {
            return $context;
        }
        [$program, $user] = $context;
        if ($this->isProgramEnded($program)) {
            return $this->fail(403, 'This program has ended; member profiles can no longer be edited here.');
        }
        $target = $customerId ? Customer::findOne((int)$customerId) : null;
        if (!$target) {
            return $this->fail(404, 'User not found');
        }
        $roles = array_map('intval', ProgramCustomer::find()
            ->select('role')
            ->where(['id_program' => $program->id, 'id_customer' => $target->id])
            ->column());
        if ((int)$target->id === (int)$program->id_customer || in_array(1, $roles, true)) {
            return $this->fail(403, 'The program admin edits their own profile.');
        }
        if (!array_intersect($roles, [2, 3])) {
            return $this->fail(403, 'This person is not a member of this program.');
        }
        return [$program, $user, $target];
    }

    private function enrolledCount(Program $program): int
    {
        return (int)ProgramCustomer::find()
            ->where(['id_program' => $program->id, 'role' => 3, 'status' => 'enrolled'])
            ->count();
    }

    /** 'enrolled', 'waitlisted', or null when full with no waitlist. */
    private function newSubscriberStatus(Program $program): ?string
    {
        $max = (int)$program->max_participants;
        if ($max <= 0 || $this->enrolledCount($program) < $max) {
            return 'enrolled';
        }
        return (int)$program->waitlist_enabled ? 'waitlisted' : null;
    }

    /** Moves the earliest waitlisted subscribers up while seats are free. */
    private function promoteFromWaitlist(Program $program): void
    {
        $max = (int)$program->max_participants;
        if ($max <= 0) {
            $free = PHP_INT_MAX;
        } else {
            $free = $max - $this->enrolledCount($program);
        }
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

    private function isPacketDateEditable(Program $program, string $date): bool
    {
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        return $date >= (string)$program->start_date && $date <= (string)$program->end_date && $date <= $tomorrow;
    }

    private function maskPhone($phone): string
    {
        $phone = (string)$phone;
        return strlen($phone) > 4 ? str_repeat('x', strlen($phone) - 4) . substr($phone, -4) : '';
    }

    /** Team sees contact and employment details; others only name, photo and role. */
    private function memberRow(array $c, bool $full): array
    {
        $row = [
            'id' => (int)$c['id'],
            'firstname' => $c['firstname'] ?? '',
            'lastname' => $c['lastname'] ?? '',
            'image' => $c['image'] ?? null,
            'gender' => in_array($c['gender'] ?? null, ['m', 'f'], true) ? $c['gender'] : null,
            'role' => (int)($c['role'] ?? 3),
            'status' => $c['status'] ?? 'enrolled',
        ];
        if ($full) {
            $row += [
                'phone' => $c['phone'] ?? '',
                'email' => $c['email'] ?? '',
                'occupation' => $c['occupation'] ?? '',
                'company_name' => $c['company_name'] ?? '',
                'designation' => $c['designation'] ?? '',
                'employment_status' => $c['employment_status'] ?? null,
                'pincode' => $c['pincode'] ?? '',
                'masjid_name' => $c['masjid_name'] ?? null,
                'joined_at' => $c['joined_at'] ?? null,
            ];
        }
        return $row;
    }

    private function editableProfile(Customer $c): array
    {
        $masjidId = ctype_digit((string)$c->masjid) ? (int)$c->masjid : null;
        $masjid = $masjidId ? Masjid::findOne($masjidId) : null;
        $updatedBy = $c->profile_updated_by ? Customer::findOne($c->profile_updated_by) : null;
        return [
            'id' => (int)$c->id,
            'firstname' => $c->firstname,
            'lastname' => $c->lastname,
            'gender' => in_array($c->gender, ['m', 'f'], true) ? $c->gender : '',
            'phone' => $c->phone,
            'email' => $c->email,
            'image' => $c->image,
            'pincode' => $c->pincode,
            'address' => $c->address,
            'landmark' => $c->landmark,
            'masjid_id' => $masjid ? (int)$masjid->id : null,
            'masjid_name' => $masjid ? $masjid->name : null,
            'masjid_text' => $masjid ? null : ((string)$c->masjid !== '' ? (string)$c->masjid : null),
            'employment_status' => $c->employment_status,
            'occupation' => $c->occupation,
            'company_name' => $c->company_name,
            'designation' => $c->designation,
            'notes' => $c->notes,
            'profile_updated_by_name' => $updatedBy ? trim($updatedBy->firstname . ' ' . $updatedBy->lastname) : null,
            'profile_updated_at' => $c->profile_updated_at,
        ];
    }

    private function profileHistory(int $customerId): array
    {
        return (new Query())
            ->select(['h.field', 'h.old_value', 'h.new_value', 'h.changed_at', 'p.name AS program_name', "TRIM(CONCAT(c.firstname, ' ', COALESCE(c.lastname, ''))) AS changed_by_name"])
            ->from('bt_customer_profile_history h')
            ->leftJoin('bt_customer c', 'c.id = h.changed_by')
            ->leftJoin('bt_program p', 'p.id = h.id_program')
            ->where(['h.id_customer' => $customerId])
            ->orderBy(['h.changed_at' => SORT_DESC, 'h.id' => SORT_DESC])
            ->limit(30)
            ->all();
    }

    /**
     * Validates the fields a program team may change and returns only those that differ.
     * @return array field => new value, or ['error' => msg, 'key' => field]
     */
    private function validatedProfileChanges(Customer $target, array $data): array
    {
        $namePattern = "/^[\\p{L}\\p{M}][\\p{L}\\p{M} .'-]*$/u";
        $clean = [];
        foreach (['firstname', 'lastname', 'gender', 'pincode', 'address', 'landmark', 'masjid_id', 'employment_status', 'occupation', 'company_name', 'designation', 'notes'] as $field) {
            if (array_key_exists($field, $data)) {
                $clean[$field] = is_string($data[$field]) ? trim(preg_replace('/[ \t]+/u', ' ', $data[$field])) : $data[$field];
            }
        }

        if (array_key_exists('firstname', $clean)) {
            $v = (string)$clean['firstname'];
            if (mb_strlen($v) < 2 || mb_strlen($v) > 50 || !preg_match($namePattern, $v)) {
                return ['error' => 'Enter the first name using letters only', 'key' => 'firstname'];
            }
        }
        if (array_key_exists('lastname', $clean)) {
            $v = (string)$clean['lastname'];
            if ($v !== '' && (mb_strlen($v) > 50 || !preg_match($namePattern, $v))) {
                return ['error' => 'Enter the last name using letters only', 'key' => 'lastname'];
            }
        }
        if (array_key_exists('gender', $clean) && !in_array($clean['gender'], ['m', 'f'], true)) {
            return ['error' => 'Select a gender', 'key' => 'gender'];
        }
        if (array_key_exists('pincode', $clean) && $clean['pincode'] !== '' && !preg_match('/^[1-9][0-9]{5}$/', (string)$clean['pincode'])) {
            return ['error' => 'Enter a valid 6-digit pincode', 'key' => 'pincode'];
        }
        if (array_key_exists('employment_status', $clean) && $clean['employment_status'] !== '' && $clean['employment_status'] !== null
            && !in_array($clean['employment_status'], self::EMPLOYMENT_STATUSES, true)) {
            return ['error' => 'Select a valid employment status', 'key' => 'employment_status'];
        }
        foreach (self::PROFILE_EDITABLE_LIMITS as $field => $max) {
            if (array_key_exists($field, $clean) && mb_strlen((string)$clean[$field]) > $max) {
                return ['error' => "Keep this under $max characters", 'key' => $field];
            }
        }

        $changes = [];
        if (array_key_exists('masjid_id', $clean)) {
            $masjidId = $clean['masjid_id'];
            if ($masjidId !== null && $masjidId !== '') {
                if (!ctype_digit((string)$masjidId) || !Masjid::find()->where(['id' => (int)$masjidId])->exists()) {
                    return ['error' => 'Pick a masjid from the list', 'key' => 'masjid_id'];
                }
                $masjidId = (string)(int)$masjidId;
            } else {
                $masjidId = (string)$target->masjid;
            }
            if ($masjidId !== (string)$target->masjid) {
                $changes['masjid'] = $masjidId;
            }
            unset($clean['masjid_id']);
        }
        if (array_key_exists('employment_status', $clean) && $clean['employment_status'] === '') {
            $clean['employment_status'] = null;
        }
        foreach ($clean as $field => $value) {
            if ((string)($target->getAttribute($field) ?? '') !== (string)($value ?? '')) {
                $changes[$field] = $value;
            }
        }
        return $changes;
    }

    public function beforeAction($action)
    {
        if (in_array($action->id, [
            'check-program',
            'programs-near',
            'area-suggest',
            'city-search',
            'program-members',
            'program-member-search',
            'program-member-role',
            'program-add-member',
            'program-member-profile',
            'save-program-member-profile',
            'program-packets',
            'save-packets',
            'program-stats',
            'all-programs-list',
            'program-enrollment',
            'program-list',
            'program-details',
            'save-program',
            'delete-program',

            'masjid-user-list',
            'masjid-list',
            'masjid-details',
            'masjid-details',
            'save-masjid',
            'delete-masjid',
            'masjid-timing-capture',
            'masjid-timing-versions',
            'masjid-timing-restore',
            'masjid-image-upload',
            'masjid-image-delete',
            'halqa-list',
            'halqa-details',
            'save-halqa',
            'delete-halqa',
            'area-list',
            'area-details',
            'save-area',
            'delete-area',
            'set-user-sehri',
            'get-user-sehri',
            'events',
            'event',
            'event-details',
            'delete-event',
            'member-details',
            'member',
            'members-list',
            'delete-member'
        ])) {
            $this->enableCsrfValidation = false;
        }
        return parent::beforeAction($action);
    }

    private function serializeMasjidSummary(Masjid $masjid): array
    {
        MasjidSlug::ensure($masjid);
        $detail = MasjidDetail::findOne(['id_masjid' => $masjid->id]);
        $timings = MasjidTiming::find()
            ->where(['id_masjid' => $masjid->id])
            ->orderBy(['sort_order' => SORT_ASC, 'id_masjid_timing' => SORT_ASC])
            ->asArray()
            ->all();

        $payload = [
            'id' => $masjid->id,
            'name' => $masjid->name,
            'address' => $masjid->address,
            'area' => $masjid->area,
            'city' => $masjid->city,
            'state' => $masjid->state,
            'pincode' => $masjid->pincode,
            'country' => $masjid->country,
            'latitude' => $masjid->latitude !== null ? (float)$masjid->latitude : null,
            'longitude' => $masjid->longitude !== null ? (float)$masjid->longitude : null,
            'contact' => $detail->contact ?? null,
            'email' => $detail->email ?? null,
            'created_by' => $masjid->id_customer,
            'status' => (int)$masjid->status,
            'madhab' => $masjid->madhab,
            'citySlug' => $masjid->city_slug,
            'slug' => $masjid->slug,
            'publicPath' => MasjidSlug::path($masjid),
            'timings' => array_map(static function (array $timing): array {
                return [
                    'salah' => $timing['salah'] ?? '',
                    'azan' => $timing['azan'] ?? $timing['azan_time'] ?? '',
                    'jamat' => $timing['jamat'] ?? $timing['jamat_time'] ?? '',
                ];
            }, $timings),
        ];

        return $payload;
    }

    /**
     * [lat, lng, radiusKm] from the list request's ?lat=&lng=&radius=, or null when any is missing
     * or out of range (then the list isn't filtered by distance).
     */
    private function readNearbyOrigin(): ?array
    {
        $request = Yii::$app->request;
        $lat = $request->get('lat');
        $lng = $request->get('lng');
        $radius = $request->get('radius');
        if (!is_numeric($lat) || !is_numeric($lng) || !is_numeric($radius)) {
            return null;
        }

        $lat = (float)$lat;
        $lng = (float)$lng;
        $radius = (float)$radius;
        if (abs($lat) > 90 || abs($lng) > 180 || $radius <= 0 || $radius > 500) {
            return null;
        }

        return [$lat, $lng, $radius];
    }

    /** Great-circle (haversine) distance in kilometres. */
    private function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 6371.0 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function decodeArrayField($value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    private function toBool($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private function saveMasjidQrFile(UploadedFile $file, ?string $existingUrl = null): string
    {
        $uploadDir = Yii::getAlias('@webroot') . '/masjid-qr/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0775, true);
        }

        if (!empty($existingUrl) && strpos($existingUrl, '/masjid-qr/') !== false) {
            $existingPath = $uploadDir . basename((string)parse_url($existingUrl, PHP_URL_PATH));
            if ($existingPath && file_exists($existingPath)) {
                @unlink($existingPath);
            }
        }

        $fileName = time() . '_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $file->baseName) . '.' . $file->extension;
        $file->saveAs($uploadDir . $fileName);

        return rtrim(Yii::$app->request->hostInfo . Yii::$app->request->baseUrl, '/') . '/masjid-qr/' . $fileName;
    }

    private function serializeMasjidDetails(Masjid $masjid, ?Customer $viewer): array
    {
        MasjidSlug::ensure($masjid);
        $detail = MasjidDetail::findOne(['id_masjid' => $masjid->id]);
        $committee = MasjidCommitteeMember::find()
            ->where(['id_masjid' => $masjid->id])
            ->orderBy(['sort_order' => SORT_ASC, 'id_masjid_committee_member' => SORT_ASC])
            ->asArray()
            ->all();
        $timings = MasjidTiming::find()
            ->where(['id_masjid' => $masjid->id])
            ->orderBy(['sort_order' => SORT_ASC, 'id_masjid_timing' => SORT_ASC])
            ->asArray()
            ->all();

        $isOwner = $viewer && ((int)$viewer->id === (int)$masjid->id_customer);
        $images = MasjidImage::find()
            ->where(['id_masjid' => $masjid->id])
            ->orderBy(['sort_order' => SORT_ASC, 'id_masjid_image' => SORT_ASC])
            ->all();
        $timingVersion = (new Query())
            ->from('{{%masjid_timing_version}}')
            ->where(['id_masjid' => $masjid->id])
            ->max('version_no');

        return [
            'id' => $masjid->id,
            'name' => $masjid->name,
            'address' => $masjid->address,
            'area' => $masjid->area,
            'city' => $masjid->city,
            'state' => $masjid->state,
            'pincode' => $masjid->pincode,
            'country' => $masjid->country,
            'latitude' => $masjid->latitude !== null ? (float)$masjid->latitude : null,
            'longitude' => $masjid->longitude !== null ? (float)$masjid->longitude : null,
            'madhab' => $masjid->madhab,
            // Owner-set colours for the masjid display screens; null = built-in themes.
            'displayColors' => $masjid->getDisplayColorsArray(),
            'citySlug' => $masjid->city_slug,
            'slug' => $masjid->slug,
            'publicPath' => MasjidSlug::path($masjid),
            'images' => array_map(static function (MasjidImage $image): array {
                return $image->serialize();
            }, $images),
            'timingVersion' => $timingVersion !== null ? (int)$timingVersion : null,
            'status' => (int)$masjid->status,
            'created_by' => $masjid->id_customer,
            'email' => $detail->email ?? null,
            'contact' => $detail->contact ?? null,
            'location' => $detail->location ?? $masjid->address,
        ] + MasjidDetail::contactPayload($detail, $viewer !== null) + [
            'temperature' => $detail ? $detail->temperature : null,
            'qrCodeUrl' => $detail->qr_code_url ?? null,
            'qrApproved' => (bool)($detail->qr_approved ?? false),
            'qrApprovedBy' => $detail->qr_approved_by ?? null,
            'stayNearby' => (bool)($detail->stay_nearby ?? false),
            // Public facility info, shown in the app's "Access & Stay" card to every viewer.
            'ladiesJamat' => (bool)($detail->ladies_jamat ?? false),
            'ladiesRamzanAccess' => (bool)($detail->ladies_ramzan_access ?? false),
            'facilities' => [
                'wazuKhana' => (bool)($detail->wazu_khana ?? false),
                'toilet' => (bool)($detail->toilet ?? false),
                'guslKhana' => (bool)($detail->gusl_khana ?? false),
                'airConditioners' => (bool)($detail->air_conditioners ?? false),
                'chairs' => (bool)($detail->chairs ?? false),
            ],
            'committeeMembers' => array_map(function (array $member) {
                return [
                    'name' => $member['name'],
                    'role' => $member['role'],
                    'phone' => $member['phone'],
                ];
            }, $committee),
            'timings' => array_map(function (array $timing) {
                return [
                    'salah' => $timing['salah'],
                    'azan' => $timing['azan_time'],
                    'jamat' => $timing['jamat_time'],
                ];
            }, $timings),
            // Shown as "Last updated" on the masjid display screen.
            'timingsUpdatedAt' => $timings ? max(array_column($timings, 'updated_at')) : null,
            'canEdit' => (bool)$isOwner,
            'canDelete' => (bool)$isOwner,
            // Any signed-in user may send board-photo timings for an approved masjid.
            'canUploadTimings' => $viewer && ($isOwner || (int)$masjid->status === Masjid::STATUS_ACTIVE),
            'maxImages' => MasjidMedia::MAX_GALLERY_IMAGES,
        ];
    }

    /**
     * Loads the masjid named by the request's id and checks the caller owns it.
     * Returns [Masjid, Customer] or a JSON error string to return as-is.
     */
    private function requireOwnedMasjid($id)
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return Json::encode(['error' => 'Unauthorized']);
        }
        $masjid = $id ? Masjid::findOne((int)$id) : null;
        if (!$masjid) {
            Yii::$app->response->statusCode = 404;
            return Json::encode(['error' => 'Masjid not found']);
        }
        if ((int)$masjid->id_customer !== (int)$user->id) {
            Yii::$app->response->statusCode = 403;
            return Json::encode(['error' => 'You can edit only your own masjid.']);
        }
        return [$masjid, $user];
    }

    /**
     * Like requireOwnedMasjid, but any signed-in user may contribute timings to an approved
     * masjid. A masjid still waiting for approval stays owner-only.
     */
    private function requireTimingContributableMasjid($id)
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return Json::encode(['error' => 'Unauthorized']);
        }
        $masjid = $id ? Masjid::findOne((int)$id) : null;
        $isOwner = $masjid && (int)$masjid->id_customer === (int)$user->id;
        if (!$masjid || (!$isOwner && (int)$masjid->status !== Masjid::STATUS_ACTIVE)) {
            Yii::$app->response->statusCode = 404;
            return Json::encode(['error' => 'Masjid not found']);
        }
        return [$masjid, $user];
    }

    private function requestParam(string $name)
    {
        $value = Yii::$app->request->post($name, Yii::$app->request->get($name));
        if ($value === null) {
            $body = json_decode(Yii::$app->request->getRawBody(), true);
            $value = is_array($body) ? ($body[$name] ?? null) : null;
        }
        return $value;
    }

    private function serializeProgramSummary(array $program, ?Customer $viewer): array
    {
        $programId = $program['id'] ?? null;
        $subscriptionRow = ($programId && $viewer) ? ProgramCustomer::find()
            ->where([
                'id_program' => $programId,
                'id_customer' => $viewer->id,
                'role' => 3
            ])
            ->one() : null;
        $currentUserSubscription = $subscriptionRow !== null;

        $currentUserProgramRole = ($programId && $viewer) ? ProgramCustomer::find()
            ->select('role')
            ->where([
                'id_program' => $programId,
                'id_customer' => $viewer->id
            ])
            ->orderBy(['role' => SORT_ASC])
            ->scalar() : false;

        $subscriptionCount = $programId ? (int)ProgramCustomer::find()
            ->where(['id_program' => $programId, 'role' => 3, 'status' => 'enrolled'])
            ->count() : 0;
        $maxParticipants = (int)($program['max_participants'] ?? 0);

        $isOwner = $viewer && (int)($program['id_customer'] ?? 0) === (int)$viewer->id;
        $isSuperAdmin = $viewer && (int)$viewer->id_customer_type === 1;
        $area = !empty($program['id_halqa']) ? (new Query())->select(['h.name', 'h.id_city', 'c.name AS city'])->from('bt_halqa h')
            ->leftJoin('bt_cities c', 'c.id = h.id_city')->where(['h.id' => (int)$program['id_halqa']])->one() : null;
        $canViewSubscriptions = (bool)($isSuperAdmin || $isOwner || in_array((int)$currentUserProgramRole, [1, 2], true));
        $endDate = $program['end_date'] ?? null;
        $isExpired = !empty($endDate) && $endDate < date('Y-m-d');
        $status = strtolower((string)($program['status'] ?? 'active'));
        $isActive = $status === 'active' && !$isExpired;
        $canDelete = (bool)($isSuperAdmin || ($isOwner && !$isExpired));

        return array_merge($program, [
            'id_program' => $programId,
            'created_by' => $program['id_customer'] ?? null,
            'area_name' => $area['name'] ?? null,
            'area_city' => $area['city'] ?? null,
            'area_id_city' => isset($area['id_city']) ? (int)$area['id_city'] : null,
            'entrolled' => $currentUserSubscription ? 1 : 0,
            'is_subscribed' => $currentUserSubscription,
            'subscription_count' => $subscriptionCount,
            'current_user_program_role' => $currentUserProgramRole !== false ? (int)$currentUserProgramRole : null,
            'is_mine' => (bool)($isOwner || $currentUserSubscription || in_array((int)$currentUserProgramRole, [1, 2], true)),
            'enrolment_status' => $subscriptionRow ? ($subscriptionRow->status ?: 'enrolled') : null,
            'seats_left' => $maxParticipants > 0 ? max(0, $maxParticipants - $subscriptionCount) : null,
            'viewer_role' => ($isSuperAdmin || $isOwner || (int)$currentUserProgramRole === 1) ? 'admin'
                : ((int)$currentUserProgramRole === 2 ? 'volunteer' : ($currentUserSubscription ? 'subscriber' : null)),
            'canViewSubscriptions' => $canViewSubscriptions,
            'can_view_subscriptions' => $canViewSubscriptions,
            'is_active' => $isActive,
            'is_expired' => $isExpired,
            'canEdit' => (bool)$isOwner,
            'can_edit' => (bool)$isOwner,
            'canDelete' => $canDelete,
            'can_delete' => $canDelete,
            'delete_warning' => $isExpired && !$isSuperAdmin
                ? 'This program has ended and can only be deleted by a super admin.'
                : null,
        ]);
    }

    private function canViewProgramSubscriptions(int $programId, Customer $viewer): bool
    {
        if ((int)$viewer->id_customer_type === 1) {
            return true;
        }

        $program = Program::findOne($programId);
        if (!$program) {
            return false;
        }

        if ((int)$program->id_customer === (int)$viewer->id) {
            return true;
        }

        return ProgramCustomer::find()
            ->where([
                'id_program' => $programId,
                'id_customer' => $viewer->id,
            ])
            ->andWhere(['in', 'role', [1, 2]])
            ->exists();
    }

    private function getSubscriptionVisibleProgramIds(Customer $viewer): array
    {
        if ((int)$viewer->id_customer_type === 1) {
            return array_map('intval', Program::find()->select('id')->column());
        }

        $ownedProgramIds = Program::find()
            ->select('id')
            ->where(['id_customer' => $viewer->id])
            ->column();

        $assignedProgramIds = ProgramCustomer::find()
            ->select('id_program')
            ->where(['id_customer' => $viewer->id])
            ->andWhere(['in', 'role', [1, 2]])
            ->column();

        return array_values(array_unique(array_map('intval', array_merge($ownedProgramIds, $assignedProgramIds))));
    }
}
