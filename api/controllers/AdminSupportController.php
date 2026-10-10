<?php

namespace app\controllers;

use app\components\BackofficeAccess;
use app\models\Customer;
use app\models\SupportTicket;
use Yii;
use yii\web\Controller;
use yii\web\Response;

/**
 * Support Desk, back office side: issues reported by users.
 *
 *   GET admin-support/options        categories and statuses for filters/forms
 *   GET admin-support/tickets        list (search, status, category, page, perPage) + counts per status
 *   GET admin-support/ticket/{id}    details
 *   PUT admin-support/ticket/{id}    { status?, adminNote? } update handling
 *
 * Access: administrator, manager or support.
 */
class AdminSupportController extends Controller
{
    private const ALLOWED_ROLES = ['administrator', 'manager', 'support'];

    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['GET', 'PUT', 'OPTIONS'],
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

    public function actionOptions()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        return [
            'categories' => $this->toOptions(SupportTicket::CATEGORIES),
            'statuses' => $this->toOptions(SupportTicket::STATUSES),
        ];
    }

    public function actionTickets()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $request = Yii::$app->request;
        $query = SupportTicket::find();

        $search = trim((string)$request->get('search', ''));
        if ($search !== '') {
            $query->andWhere(['or',
                ['like', 'reference', $search],
                ['like', 'message', $search],
                ['like', 'name', $search],
                ['like', 'email', $search],
                ['like', 'location', $search],
            ]);
        }

        $category = trim((string)$request->get('category', ''));
        if ($category !== '' && isset(SupportTicket::CATEGORIES[$category])) {
            $query->andWhere(['category' => $category]);
        }

        // Counts per status follow the search/category filters, before the status filter itself.
        $counts = array_fill_keys(array_keys(SupportTicket::STATUSES), 0);
        foreach ((clone $query)->select(['status', 'total' => 'COUNT(*)'])->groupBy('status')->asArray()->all() as $row) {
            $counts[$row['status']] = (int)$row['total'];
        }

        $status = trim((string)$request->get('status', ''));
        if ($status === 'open') {
            $query->andWhere(['status' => ['new', 'in_progress']]);
        } elseif ($status !== '' && isset(SupportTicket::STATUSES[$status])) {
            $query->andWhere(['status' => $status]);
        }

        $pagination = $this->paginate($query);
        $rows = $query->orderBy(['created_at' => SORT_DESC, 'id' => SORT_DESC])
            ->offset($pagination['offset'])
            ->limit($pagination['perPage'])
            ->all();

        return [
            'items' => array_map(function (SupportTicket $ticket) {
                return $this->serializeRow($ticket);
            }, $rows),
            'summary' => ['statusCounts' => $counts, 'open' => $counts['new'] + $counts['in_progress']],
            'pagination' => $pagination['response'],
        ];
    }

    public function actionTicket($id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $ticket = SupportTicket::findOne((int)$id);
        if (!$ticket) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Issue not found.'];
        }

        $request = Yii::$app->request;
        if ($request->isPut || $request->isPost) {
            $data = $request->getBodyParams();
            if (!is_array($data) || empty($data)) {
                $data = json_decode($request->rawBody, true) ?: [];
            }

            if (array_key_exists('status', $data)) {
                $status = (string)$data['status'];
                if (!isset(SupportTicket::STATUSES[$status])) {
                    Yii::$app->response->statusCode = 422;
                    return ['error' => 'Unknown status.'];
                }
                if ($status !== $ticket->status) {
                    $ticket->status = $status;
                    $ticket->resolved_at = in_array($status, ['resolved', 'closed'], true) ? date('Y-m-d H:i:s') : null;
                }
            }
            if (array_key_exists('adminNote', $data)) {
                $note = trim((string)$data['adminNote']);
                $ticket->admin_note = $note === '' ? null : $note;
            }

            $ticket->handled_by = $admin->id;
            $ticket->updated_at = date('Y-m-d H:i:s');
            if (!$ticket->save()) {
                Yii::$app->response->statusCode = 422;
                return ['error' => 'Could not update the issue.', 'errors' => $ticket->getFirstErrors()];
            }
            $ticket->refresh();
        }

        return $this->serializeDetail($ticket);
    }

    private function serializeRow(SupportTicket $ticket): array
    {
        return [
            'id' => (int)$ticket->id,
            'reference' => $ticket->reference,
            'category' => $ticket->category,
            'categoryLabel' => $ticket->getCategoryLabel(),
            'status' => $ticket->status,
            'statusLabel' => $ticket->getStatusLabel(),
            'excerpt' => mb_strimwidth(preg_replace('/\s+/', ' ', (string)$ticket->message), 0, 120, '…'),
            'name' => $ticket->name,
            'email' => $ticket->email,
            'platform' => $ticket->platform,
            'location' => $ticket->location,
            'createdAt' => $ticket->created_at,
        ];
    }

    private function serializeDetail(SupportTicket $ticket): array
    {
        $handledBy = $ticket->handled_by ? Customer::findOne($ticket->handled_by) : null;

        return $this->serializeRow($ticket) + [
            'message' => $ticket->message,
            'customerId' => $ticket->customer_id ? (int)$ticket->customer_id : null,
            'pageUrl' => $ticket->page_url,
            'appVersion' => $ticket->app_version,
            'language' => $ticket->language,
            'context' => $ticket->getContextData(),
            'userAgent' => $ticket->user_agent,
            'adminNote' => $ticket->admin_note,
            'handledBy' => $handledBy ? trim(preg_replace('/\s+/', ' ', $handledBy->firstname . ' ' . $handledBy->lastname)) : null,
            'resolvedAt' => $ticket->resolved_at,
            'updatedAt' => $ticket->updated_at,
        ];
    }

    private function toOptions(array $map): array
    {
        $options = [];
        foreach ($map as $value => $label) {
            $options[] = ['value' => $value, 'label' => $label];
        }
        return $options;
    }

    private function paginate($query): array
    {
        $page = max(1, (int)Yii::$app->request->get('page', 1));
        $perPage = max(1, min(100, (int)Yii::$app->request->get('perPage', 20)));
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

        if (!BackofficeAccess::userHasAnyRole($user, self::ALLOWED_ROLES)) {
            Yii::$app->response->statusCode = 403;
            return ['error' => 'You do not have permission to access this back office resource.'];
        }

        return $user;
    }
}
