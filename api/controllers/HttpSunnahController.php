<?php

namespace app\controllers;

use app\components\SunnahShorts;
use app\models\SunnahCard;
use app\models\SunnahLike;
use Yii;
use yii\db\IntegrityException;
use yii\web\Controller;
use yii\web\Response;

/**
 * Sunnah Shorts (NF-015), app side. No login.
 *
 *   GET  http-sunnah/list    published categories + cards (content cached 5 min, likes live)
 *   POST http-sunnah/like    { cardId, deviceId, liked: bool } -> { likes, liked }
 *
 * A like is one row per card + device id (a random id the app keeps in localStorage). Likes are
 * limited per IP so a script cannot inflate counts quickly.
 */
class HttpSunnahController extends Controller
{
    private const LIKES_PER_IP_PER_10_MIN = 200;

    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'OPTIONS'],
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
        if (!parent::beforeAction($action)) {
            return false;
        }
        Yii::$app->response->format = Response::FORMAT_JSON;
        return true;
    }

    public function actionList()
    {
        return SunnahShorts::publicList();
    }

    public function actionLike()
    {
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            return ['error' => 'Use POST.'];
        }
        $data = $this->body();
        $deviceId = (string)($data['deviceId'] ?? '');
        $liked = filter_var($data['liked'] ?? true, FILTER_VALIDATE_BOOLEAN);
        if (!preg_match('/^[A-Za-z0-9-]{16,64}$/', $deviceId)) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Invalid device.'];
        }
        $card = SunnahCard::find()->where(['id' => (int)($data['cardId'] ?? 0), 'status' => SunnahCard::STATUS_PUBLISHED])->one();
        if (!$card) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Card not found.'];
        }

        $ip = (string)Yii::$app->request->userIP;
        $existing = SunnahLike::find()->where(['card_id' => $card->id, 'device_id' => $deviceId])->one();
        if ($liked && !$existing) {
            $recent = SunnahLike::find()
                ->where(['ip' => $ip])
                ->andWhere(['>', 'created_at', date('Y-m-d H:i:s', time() - 600)])
                ->count();
            if ($recent >= self::LIKES_PER_IP_PER_10_MIN) {
                Yii::$app->response->statusCode = 429;
                return ['error' => 'Too many likes. Please try again later.'];
            }
            $like = new SunnahLike();
            $like->card_id = (int)$card->id;
            $like->device_id = $deviceId;
            $like->ip = $ip;
            try {
                if ($like->save(false)) {
                    $card->updateCounters(['likes' => 1]);
                }
            } catch (IntegrityException $e) {
                // Same device liked twice at once: the unique key kept one row.
            }
        } elseif (!$liked && $existing) {
            if ($existing->delete()) {
                SunnahCard::updateAll(['likes' => new \yii\db\Expression('GREATEST(likes - 1, 0)')], ['id' => $card->id]);
            }
        }

        return [
            'likes' => (int)SunnahCard::find()->select('likes')->where(['id' => $card->id])->scalar(),
            'liked' => $liked,
        ];
    }

    private function body(): array
    {
        $request = Yii::$app->request;
        $data = $request->getBodyParams();
        if (!is_array($data) || empty($data)) {
            $data = json_decode($request->rawBody, true);
        }
        return is_array($data) ? $data : [];
    }
}
