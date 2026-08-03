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
use app\models\HalqaMasjid;
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
                ->innerJoin('bt_masjid', 'bt_masjid.id = bt_customer.masjid')
                ->orderBy(['bt_customer.id' => SORT_DESC])
                ->asArray();

            if (!empty($programId)) {
                $query->where(['bt_program_customer.id_program' => $programId]);
            } else {
                $query->where(['bt_program_customer.id_program' => $allowedProgramIds]);
            }

            $users = $query->all();
            $cache->set($cacheKey, $users, 43400);
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

        if ((int)$masjid->id_customer !== (int)$user->id) {
            Yii::$app->response->statusCode = 403;
            return Json::encode(['error' => 'You do not have permission to view linked users for this masjid']);
        }

        $users = Customer::find()
            ->select([
                'id',
                'firstname',
                'lastname',
                'phone',
                'email',
                'occupation',
                'company_name',
                'image',
                'pincode'
            ])
            ->where(['masjid' => (string)$masjidId])
            ->andWhere(['active' => 1])
            ->orderBy(['firstname' => SORT_ASC, 'lastname' => SORT_ASC])
            ->asArray()
            ->all();

        Yii::$app->response->statusCode = 200;
        return Json::encode([
            'list' => $users,
            'total' => count($users),
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
        $query = Masjid::find()->orderBy(['id' => SORT_DESC]);

        $pincode = Yii::$app->request->get('pincode');
        if (!empty($pincode)) {
            $query->andWhere(['pincode' => $pincode]);
        }

        $masjidList = array_map(function (Masjid $masjid) {
            return $this->serializeMasjidSummary($masjid);
        }, $query->all());

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

        if (!$id) {
            Yii::$app->response->statusCode = 400;
            return \yii\helpers\Json::encode(['error' => 'Invalid request, missing Masjid ID']);
        }

        $masjid = Masjid::findOne($id);
        if (!$masjid) {
            Yii::$app->response->statusCode = 404;
            return \yii\helpers\Json::encode(['error' => 'Masjid not found']);
        }

        Yii::$app->response->statusCode = 200;
        return Json::encode($this->serializeMasjidDetails($masjid, $this->getAuthorizedUser()));
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
        $masjid->status = $data['status'] ?? 0;

        if ($masjid->save()) {
            $detail = MasjidDetail::findOne(['id_masjid' => $masjid->id]) ?? new MasjidDetail(['id_masjid' => $masjid->id]);
            $uploadedQrFile = UploadedFile::getInstanceByName('qrCodeFile');
            $detail->email = $data['email'] ?? null;
            $detail->contact = $data['contact'] ?? null;
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

            MasjidTiming::deleteAll(['id_masjid' => $masjid->id]);
            foreach (($data['timings'] ?? []) as $index => $timing) {
                if (empty($timing['salah'])) {
                    continue;
                }

                $timingModel = new MasjidTiming();
                $timingModel->id_masjid = $masjid->id;
                $timingModel->salah = $timing['salah'];
                $timingModel->azan_time = $timing['azan'] ?? $timing['azan_time'] ?? null;
                $timingModel->jamat_time = $timing['jamat'] ?? $timing['jamat_time'] ?? null;
                $timingModel->sort_order = $index;
                $timingModel->save();
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

        if ($masjid->delete()) {
            Yii::$app->response->statusCode = 200;
            return \yii\helpers\Json::encode(['message' => 'Masjid deleted successfully']);
        } else {
            Yii::$app->response->statusCode = 500;
            return \yii\helpers\Json::encode(['error' => 'Failed to delete Masjid']);
        }
    }


    public function actionGetAssignedPackets()
{
    $user = $this->getAuthorizedUser();

    if (!$user) {
        Yii::$app->response->statusCode = 401;
        return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
    }

    // Fetch query parameters
    $idCustomer = Yii::$app->request->get('id_customer');
    $date = Yii::$app->request->get('date');
    $idProgram = Yii::$app->request->get('id_program');

    if (!$idCustomer) {
        Yii::$app->response->statusCode = 400;
        return \yii\helpers\Json::encode(['error' => 'Customer ID is required']);
    }

    // Query to fetch assigned packets
    $query = SubscriberPackets::find()->where(['id_customer' => $idCustomer]);

    if ($date) {
        $query->andWhere(['date' => $date]);
    }

    if ($idProgram) {
        $query->andWhere(['id_program' => $idProgram]);
    }

    $subscriberPackets = $query->all();

    // If no records found, try to get the latest token
    if (empty($subscriberPackets)) {
        $recentRecord = SubscriberPackets::find()
            ->where(['id_customer' => $idCustomer])
            ->andWhere(['IS NOT', 'token', null]) // Using token instead of token_id
            ->orderBy(['date' => SORT_DESC])
            ->one();

        if ($recentRecord) {
            Yii::$app->response->statusCode = 200;
            return \yii\helpers\Json::encode([
                'token' => $recentRecord->token,
                'id_customer' => $idCustomer,
                'id_program' => $idProgram,
                'date' => $date,
                'packets' => '',
            ]);
        }

        Yii::$app->response->statusCode = 200;
        return \yii\helpers\Json::encode([
            'token' => null,
            'id_customer' => $idCustomer,
            'id_program' => $idProgram,
            'date' => $date,
            'packets' => '',
        ]);
    }

    Yii::$app->response->statusCode = 200;
    return \yii\helpers\Json::encode($subscriberPackets);
}





    public function actionUpdateSubscriberPacket()
    {
      
        // $tableName = 'bt_subscriber_packets';
        // $db = Yii::$app->db;
        // // Get table schema
        // $schema = $db->createCommand("SHOW CREATE TABLE `$tableName`")->queryOne();
        // $sqlDump = $schema['Create Table'] . ";\n\n";

        // // Get table data
        // $rows = $db->createCommand("SELECT * FROM `$tableName`")->queryAll();

        // foreach ($rows as $row) {
        //     $values = array_map(function ($value) use ($db) {
        //         return $db->quoteValue($value); // Escape values safely
        //     }, array_values($row));

        //     $sqlDump .= "INSERT INTO `$tableName` VALUES (" . implode(", ", $values) . ");\n";
        // }

        // // Save SQL file
        // $filePath = Yii::getAlias('@webroot') . "/{$tableName}.sql";
        // file_put_contents($filePath, $sqlDump);

        // return Yii::$app->response->sendFile($filePath);

        


        // Find the existing record
        $updated = Yii::$app->db->createCommand()
        ->update('bt_subscriber_packets', ['id_program' => 1]) // No WHERE condition = Updates all rows
        ->execute();

        return $updated ? "Updated $updated records successfully!" : "Update failed!";
    }

    public function actionAssignPackets()
    {
        $user = $this->getAuthorizedUser();

        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }

        $data = json_decode(Yii::$app->request->getRawBody(), true);

        if (!isset($data['id_customer'], $data['packets'])) {
            Yii::$app->response->statusCode = 400; // Bad Request
            return \yii\helpers\Json::encode(['error' => 'Customer ID and packets are required']);
        }

        $idCustomer = $data['id_customer'];
        $date = $data['date'] ?? date('Y-m-d'); // Default to current date

        // Check if an entry already exists for the same customer and date
        $subscriberPacket = SubscriberPackets::findOne(['id_customer' => $idCustomer, 'date' => $date]);

        if (!$subscriberPacket) {
            $subscriberPacket = new SubscriberPackets(); // Create new record if not found
            $subscriberPacket->id_customer = $idCustomer;
            $subscriberPacket->id_program  =  $data['id_program'];
            $subscriberPacket->date = $date;
            $subscriberPacket->created_at = date('Y-m-d H:i:s'); // Set creation timestamp
        }

        // Update the existing or new record
        $subscriberPacket->token = $data['token'] ?? null; // Optional
        $subscriberPacket->packets = $data['packets']; // Required
        $subscriberPacket->updated_at = date('Y-m-d H:i:s'); // Update timestamp

        if ($subscriberPacket->save()) {
            Yii::$app->response->statusCode = 201; // Created/Updated
            return \yii\helpers\Json::encode($subscriberPacket);
        } else {
            Yii::$app->response->statusCode = 422; // Unprocessable Entity
            return \yii\helpers\Json::encode($subscriberPacket->getErrors());
        }
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
    
    public function actionProgramEnrollment()
    {
        $user = $this->getAuthorizedUser();
    
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized or invalid role']);
        }
    
        $request = json_decode(Yii::$app->request->getRawBody(), true);
        $programId = $request['id_program'] ?? null;

        if (empty($programId)) {
            Yii::$app->response->statusCode = 400;
            return \yii\helpers\Json::encode(['error' => 'Program ID is required']);
        }

        $program = Program::findOne($programId);
        $isExpired = $program && !empty($program->end_date) && $program->end_date < date('Y-m-d');
        if (!$program || $isExpired) {
            Yii::$app->response->statusCode = $program ? 422 : 404;
            return \yii\helpers\Json::encode([
                'error' => $program ? 'This program is closed for subscription changes' : 'Program not found'
            ]);
        }
    
        $existingEnrollment = ProgramCustomer::findOne([
            'id_customer' => $user->id,
            'id_program' => $programId,
            'role' => 3
        ]);
    
        if ($existingEnrollment) {
            // If already enrolled, cancel it (Unsubscribe)
            if ($existingEnrollment->delete()) {
                $subscriptionCount = (int)ProgramCustomer::find()
                    ->where(['id_program' => $programId, 'role' => 3])
                    ->count();
                Yii::$app->response->statusCode = 200;
                return \yii\helpers\Json::encode([
                    'message' => 'Unsubscribed successfully',
                    'entrolled' => 0,
                    'subscription_count' => $subscriptionCount
                ]);
            } else {
                Yii::$app->response->statusCode = 500;
                return \yii\helpers\Json::encode(['error' => 'Failed to unsubscribe']);
            }
        } else {
            // If not enrolled, enroll the user (Subscribe)
            $newEnrollment = new ProgramCustomer();
            $newEnrollment->role = 3;
            $newEnrollment->id_customer = $user->id;
            $newEnrollment->id_program = $programId;
            $newEnrollment->created_at = date('Y-m-d H:i:s');
    
            if ($newEnrollment->save()) {
                Yii::$app->response->statusCode = 200;
                $subscriptionCount = (int)ProgramCustomer::find()
                    ->where(['id_program' => $programId, 'role' => 3])
                    ->count();
                return \yii\helpers\Json::encode([
                    'message' => 'Subscribed successfully',
                    'entrolled' => 1,
                    'subscription_count' => $subscriptionCount
                ]);
            } else {
                Yii::$app->response->statusCode = 500;
                return \yii\helpers\Json::encode(['error' => 'Failed to subscribe']);
            }
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


    
    public function actionCustomerSearch()
    {
        Yii::$app->response->format = \yii\web\Response::FORMAT_JSON;
        $query = Yii::$app->request->get('query');

        if (empty($query)) {
            Yii::$app->response->statusCode = 400;
            return ['error' => 'Query parameter is required'];
        }

        // Search customers by name or phone number
        $customers = Customer::find()
            ->where(['or', 
                ['like', 'firstname', $query],
                ['like', 'phone', $query]
            ])
            ->limit(10) // Limit results to 10 for efficiency
            ->asArray()
            ->all();

        if (!$customers) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'No matching customers found'];
        }

        return $customers;
    }

    public function actionAssignMember()
    {
        Yii::$app->response->format = \yii\web\Response::FORMAT_JSON;
        $rawBody = Yii::$app->request->rawBody;
        $data = json_decode($rawBody, true);
    
        if (empty($data['customerId']) || empty($data['programId']) || empty($data['role'])) {
            Yii::$app->response->statusCode = 400;
            return ['error' => 'Missing required fields: customerId, programId, and role'];
        }
    
        // Check if the customer exists
        $customer = Customer::findOne($data['customerId']);
        if (!$customer) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Customer not found'];
        }
    
        // Check if the program exists
        $program = Program::findOne($data['programId']);
        if (!$program) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Program not found'];
        }
    
        // Check if the assignment already exists
        $existingAssignment = ProgramCustomer::find()
            ->where(['id_customer' => $data['customerId'], 'id_program' => $data['programId']])
            ->one();
    
        if ($existingAssignment) {
            if ((string)$existingAssignment->role === (string)$data['role']) {
                Yii::$app->response->statusCode = 200;
                return ['warning' => 'User is already assigned to this program with the same role'];
            }
    
            // Update the role if different
            $existingAssignment->role = $data['role'];
            if ($existingAssignment->save()) {
                Yii::$app->response->statusCode = 200;
                return ['success' => 'User role updated successfully'];
            } else {
                Yii::$app->response->statusCode = 500;
                return ['error' => 'Failed to update user role'];
            }
        }
    
        // Create a new assignment
        $programCustomer = new ProgramCustomer();
        $programCustomer->id_customer = $data['customerId'];
        $programCustomer->id_program = $data['programId'];
        $programCustomer->role = $data['role'];
    
        if ($programCustomer->save()) {
            Yii::$app->response->statusCode = 200;
            return ['success' => 'Customer assigned successfully'];
        }
    
        Yii::$app->response->statusCode = 500;
        return ['error' => 'Failed to assign customer'];
    }
    



    public function actionProgramDetails()
    {
        $user = $this->getAuthorizedUser();

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
        $program->id_halqa = $data['id_halqa'] ?? null;
        $program->start_date = $data['start_date'] ?? null;
        $program->end_date = $data['end_date'] ?? null;
        $program->contact_number = $data['contact_number'] ?? null;
        $program->email = $data['email'] ?? null;
        $program->registration_allowed = $data['registration_allowed'] ?? true;
        $program->max_participants = $data['max_participants'] ?? 100;
        $program->waitlist_enabled = $data['waitlist_enabled'] ?? true;
        $program->description = $data['description'] ?? null;
        $program->status = $data['status'] ?? 'active';
    
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
    

    public function actionPacketsPerDay()
    {
        $user = $this->getAuthorizedUser();
        if (!$user) {
            Yii::$app->response->statusCode = 401;
            return Json::encode([
                'success' => false,
                'message' => 'Unauthorized',
                'data' => null
            ]);
        }
    
        // Get optional query parameters
        $idProgram = Yii::$app->request->get('id_program');
    
        // Build the query
        $query = (new \yii\db\Query())
            ->select([
                'date',
                'SUM(packets) AS total_packets',
                'COUNT(*) AS total_records'
            ])
            ->from(SubscriberPackets::tableName());
    
        // Apply filter if id_program is provided
        if ($idProgram && $idProgram !== 'all') {
            $query->where(['id_program' => $idProgram]);
        }
    
        $query->groupBy(['date'])->orderBy(['date' => SORT_DESC]);
    
        $packetsPerDay = $query->all();
    
        Yii::$app->response->statusCode = 200;
        return Json::encode([
            'success' => true,
            'message' => 'Packets per day retrieved successfully',
            'data' => $packetsPerDay
        ]);
    }
    
    

    public function beforeAction($action)
    {
        if (in_array($action->id, [
            'update-subscriber-packet',
            'packets-per-day',
            'customer-search',
            'assign-member',
            'check-program',
            'all-programs-list',
            'program-enrollment',
            'program-list',
            'program-details',
            'save-program',
            'delete-program',

            'get-assigned-packets',
            'assign-packets',
            'masjid-user-list',
            'masjid-list',
            'masjid-details',
            'masjid-details',
            'save-masjid',
            'delete-masjid',
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
            'contact' => $detail->contact ?? null,
            'email' => $detail->email ?? null,
            'created_by' => $masjid->id_customer,
            'status' => $masjid->status,
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

        return [
            'id' => $masjid->id,
            'name' => $masjid->name,
            'address' => $masjid->address,
            'area' => $masjid->area,
            'city' => $masjid->city,
            'state' => $masjid->state,
            'pincode' => $masjid->pincode,
            'country' => $masjid->country,
            'status' => $masjid->status,
            'created_by' => $masjid->id_customer,
            'email' => $detail->email ?? null,
            'contact' => $detail->contact ?? null,
            'location' => $detail->location ?? $masjid->address,
            'temperature' => $detail ? $detail->temperature : null,
            'qrCodeUrl' => $detail->qr_code_url ?? null,
            'qrApproved' => (bool)($detail->qr_approved ?? false),
            'qrApprovedBy' => $detail->qr_approved_by ?? null,
            'stayNearby' => (bool)($detail->stay_nearby ?? false),
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
            'canEdit' => (bool)$isOwner,
            'canDelete' => (bool)$isOwner,
        ];

        if ($isOwner) {
            $payload['ladiesJamat'] = (bool)($detail->ladies_jamat ?? false);
            $payload['ladiesRamzanAccess'] = (bool)($detail->ladies_ramzan_access ?? false);
        }

        return $payload;
    }

    private function serializeProgramSummary(array $program, ?Customer $viewer): array
    {
        $programId = $program['id'] ?? null;
        $currentUserSubscription = ($programId && $viewer) ? ProgramCustomer::find()
            ->where([
                'id_program' => $programId,
                'id_customer' => $viewer->id,
                'role' => 3
            ])
            ->exists() : false;

        $currentUserProgramRole = ($programId && $viewer) ? ProgramCustomer::find()
            ->select('role')
            ->where([
                'id_program' => $programId,
                'id_customer' => $viewer->id
            ])
            ->orderBy(['role' => SORT_ASC])
            ->scalar() : false;

        $subscriptionCount = $programId ? (int)ProgramCustomer::find()
            ->where(['id_program' => $programId, 'role' => 3])
            ->count() : 0;

        $isOwner = $viewer && (int)($program['id_customer'] ?? 0) === (int)$viewer->id;
        $isSuperAdmin = $viewer && (int)$viewer->id_customer_type === 1;
        $canViewSubscriptions = (bool)($isSuperAdmin || $isOwner || in_array((int)$currentUserProgramRole, [1, 2], true));
        $endDate = $program['end_date'] ?? null;
        $isExpired = !empty($endDate) && $endDate < date('Y-m-d');
        $status = strtolower((string)($program['status'] ?? 'active'));
        $isActive = $status === 'active' && !$isExpired;
        $canDelete = (bool)($isSuperAdmin || ($isOwner && !$isExpired));

        return array_merge($program, [
            'id_program' => $programId,
            'created_by' => $program['id_customer'] ?? null,
            'entrolled' => $currentUserSubscription ? 1 : 0,
            'is_subscribed' => $currentUserSubscription,
            'subscription_count' => $subscriptionCount,
            'current_user_program_role' => $currentUserProgramRole !== false ? (int)$currentUserProgramRole : null,
            'is_mine' => (bool)($isOwner || $currentUserSubscription),
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
