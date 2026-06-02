<?php

namespace app\controllers;
use Yii;
use yii\db\Query;
use app\models\City;
use app\models\Customer;
use app\models\CityPrice;


class ZakatController extends \yii\web\Controller
{   
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                'Access-Control-Allow-Credentials' => true,
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Max-Age' => 86400,
            ],
        ];
        return $behaviors;
    }
    
    public function __construct($id, $module, $config = [])
    {
        parent::__construct($id, $module, $config);

        $headers = Yii::$app->request->headers;
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $user = Customer::find()->where(['authKey' => $token])->one();
            
            if (!$user) {
                Yii::$app->response->statusCode = 401;
                return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
            }
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
        }
    }


    
 


    public function actionZakatCategories(){
        $rawBody = Yii::$app->request->rawBody;
        $data = json_decode($rawBody, true);


        $query = (new Query())
        ->select('*,bt_category.id_category as id_category ')
        ->from('bt_category')
        ->leftJoin('bt_category_configuation config', 'bt_category.id_category = config.id_category')
        ->where(['bt_category.id_type' => 5, 'bt_category.status' => 1]);
        $command = $query->createCommand();
        $list = $command->queryAll();
        $response['list'] = $list;
        $response['categoryImagePath'] = Yii::$app->params['categoryImagePath'];
        
        Yii::$app->response->statusCode = 200;
        return \yii\helpers\Json::encode($response);    
    }
    
    // public function actionCitiList() {
    //     // exit("Control here");
    //     $cities = City::find()
    //         ->orderBy(['name' => SORT_ASC]) // Sorting cities alphabetically
    //         ->all();
    //     $response = [  'list' => $cities ];
    //     Yii::$app->response->statusCode = 200;
    //     return \yii\helpers\Json::encode($response);
    // }
    
    public function actionCityList() {
        $prices = City::find() ->all();
        $response['list'] = $prices;
        Yii::$app->response->statusCode = 200;
        return \yii\helpers\Json::encode($response);
    }

    public function actionLocationPrices() {
        $city = Yii::$app->getRequest()->getQueryParam('city');
        if($city){
            $prices = CityPrice::find()
            ->where(['id_city' => $city])
            ->all();
        }
        $response['list'] = $prices;
        Yii::$app->response->statusCode = 200;
        return \yii\helpers\Json::encode($response);
    }



    public function beforeAction($action)
    {
        if (in_array($action->id, ['zakat-categories','statistics', 'category-list', 'get', 'update','delete', 'get-list', 'add', 'suggestion'])) {
            $this->enableCsrfValidation = false;
        }
        return parent::beforeAction($action);
    }

}