<?php

namespace app\controllers;

use app\components\SupportTicketMailer;
use app\models\Customer;
use app\models\SupportTicket;
use Yii;
use yii\web\Controller;
use yii\web\Response;

/**
 * Support Desk, public side: "Report an Issue" from the app and website.
 *
 *   GET  http-support/categories   category options for the form
 *   POST http-support/submit       { category, message, name?, email?, pageUrl?, platform?, appVersion?,
 *                                    language?, location?, context?: {..}, website (honeypot, must be empty) }
 *                                  -> { reference, message }
 *
 * Anyone can report; a valid Bearer token links the report to the logged-in user.
 * Limited to MAX_PER_HOUR reports per IP address. The admin is emailed for every report.
 */
class HttpSupportController extends Controller
{
    private const MAX_PER_HOUR = 5;

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
        return parent::beforeAction($action);
    }

    public function actionCategories()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $options = [];
        foreach (SupportTicket::CATEGORIES as $value => $label) {
            $options[] = ['value' => $value, 'label' => $label];
        }
        return ['items' => $options];
    }

    public function actionSubmit()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $request = Yii::$app->request;
        if (!$request->isPost) {
            Yii::$app->response->statusCode = 405;
            return ['error' => 'Use POST to report an issue.'];
        }

        $data = $request->getBodyParams();
        if (!is_array($data) || empty($data)) {
            $data = json_decode($request->rawBody, true);
        }
        if (!is_array($data)) {
            Yii::$app->response->statusCode = 400;
            return ['error' => 'Invalid request body. Expected JSON payload.'];
        }

        // Bots fill every field; people never see this one.
        if (trim((string)($data['website'] ?? '')) !== '') {
            return ['reference' => null, 'message' => 'Thank you. Your report has been received.'];
        }

        $ip = (string)$request->userIP;
        $recent = SupportTicket::find()
            ->where(['ip_address' => $ip])
            ->andWhere(['>=', 'created_at', date('Y-m-d H:i:s', time() - 3600)])
            ->count();
        if ($recent >= self::MAX_PER_HOUR) {
            Yii::$app->response->statusCode = 429;
            return ['error' => 'You have sent several reports in the last hour. Please try again later.'];
        }

        $ticket = new SupportTicket();
        $ticket->category = (string)($data['category'] ?? '');
        $ticket->message = (string)($data['message'] ?? '');
        $ticket->name = $this->nullable($data['name'] ?? null);
        $ticket->email = $this->nullable($data['email'] ?? null);
        $ticket->page_url = $this->limit($data['pageUrl'] ?? null, 500);
        $platform = strtolower((string)($data['platform'] ?? ''));
        $ticket->platform = in_array($platform, SupportTicket::PLATFORMS, true) ? $platform : null;
        $ticket->app_version = $this->limit($data['appVersion'] ?? null, 30);
        $ticket->language = $this->limit($data['language'] ?? null, 10);
        $ticket->location = $this->limit($data['location'] ?? null, 190);
        $context = $data['context'] ?? null;
        $ticket->context = is_array($context) ? substr(json_encode($context), 0, 5000) : null;
        $ticket->user_agent = $this->limit($request->userAgent, 500);
        $ticket->ip_address = $ip;
        $ticket->status = 'new';

        $user = $this->currentUser();
        if ($user) {
            $ticket->customer_id = $user->id;
            $ticket->name = $ticket->name ?: $this->nullable(trim($user->firstname . ' ' . $user->lastname));
            $ticket->email = $ticket->email ?: $this->nullable($user->email);
        }

        if (!$ticket->validate()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Please check the form.', 'errors' => $ticket->getFirstErrors()];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            $ticket->save(false);
            $ticket->reference = SupportTicket::formatReference((int)$ticket->id);
            $ticket->updateAttributes(['reference' => $ticket->reference]);
            $transaction->commit();
        } catch (\Throwable $error) {
            $transaction->rollBack();
            Yii::error('Support ticket save failed: ' . $error->getMessage(), __METHOD__);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'We could not save your report. Please try again.'];
        }

        $ticket->refresh();
        // The report is saved either way; a mail failure is only logged.
        SupportTicketMailer::notifyAdmin($ticket);

        return [
            'reference' => $ticket->reference,
            'message' => 'Thank you. Your report has been received.',
        ];
    }

    /** The logged-in user when a valid Bearer token is sent; reports work without one. */
    private function currentUser(): ?Customer
    {
        $header = (string)Yii::$app->request->headers->get('Authorization', '');
        $token = trim(str_replace('Bearer ', '', $header));
        if ($token === '') {
            return null;
        }
        return Customer::find()->where(['authKey' => $token, 'deleted' => 0])->one();
    }

    private function nullable($value): ?string
    {
        $value = trim((string)$value);
        return $value === '' ? null : $value;
    }

    private function limit($value, int $max): ?string
    {
        $value = $this->nullable($value);
        return $value === null ? null : mb_substr($value, 0, $max);
    }
}
