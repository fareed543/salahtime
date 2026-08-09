<?php

namespace app\controllers;

use Yii;
use app\components\BackofficeAccess;
use app\models\City;
use app\models\Country;
use app\models\Customer;
use app\models\Festival;
use app\models\FestivalOccurrence;
use app\models\LocationObservance;
use app\models\ObservanceProfile;
use app\models\StateProvince;
use yii\web\Controller;
use yii\web\Response;

class AdminCalendarController extends Controller
{
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

    public function actionOptions($id = null)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->statusCode = 204;
        return null;
    }

    public function actionEvents()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        if (Yii::$app->request->isPost) {
            return $this->saveEvent(new FestivalOccurrence(), $admin);
        }

        $year = (int)Yii::$app->request->get('year', date('Y'));
        $search = trim((string)Yii::$app->request->get('search', ''));
        $status = trim((string)Yii::$app->request->get('status', ''));
        $dateStatus = trim((string)Yii::$app->request->get('dateStatus', ''));
        $page = max(1, (int)Yii::$app->request->get('page', 1));
        $perPage = max(1, min(100, (int)Yii::$app->request->get('perPage', 10)));

        $query = FestivalOccurrence::find()
            ->alias('occurrence')
            ->joinWith('festival festival')
            ->where(['occurrence.gregorian_year' => $year]);

        if ($search !== '') {
            $query->andWhere([
                'or',
                ['like', 'festival.name', $search],
                ['like', 'festival.slug', $search],
                ['like', 'occurrence.notes', $search],
            ]);
        }
        if ($status === 'active') {
            $query->andWhere(['occurrence.status' => 1]);
        } elseif ($status === 'inactive') {
            $query->andWhere(['occurrence.status' => 0]);
        }
        if ($dateStatus !== '') {
            $query->andWhere(['occurrence.date_status' => $dateStatus]);
        }

        $total = (int)(clone $query)->count();
        $events = $query
            ->orderBy(['occurrence.start_date' => SORT_ASC, 'festival.name' => SORT_ASC])
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->all();

        return [
            'items' => array_map([$this, 'serializeEvent'], $events),
            'filterOptions' => $this->filterOptions(),
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => max(1, (int)ceil($total / $perPage)),
            ],
        ];
    }

    public function actionEvent(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $event = FestivalOccurrence::findOne(['id' => $id]);
        if (!$event) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Calendar event not found.'];
        }

        return $this->saveEvent($event, $admin);
    }

    public function actionPublish(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $observance = $this->loadOrCreateObservance($id);
        if (is_array($observance)) {
            return $observance;
        }

        $observance->published_at = date('Y-m-d H:i:s');
        $observance->updated_by = (int)$admin->id;

        if (!$observance->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($observance) ?: 'Unable to publish calendar event.'];
        }

        return ['item' => $this->serializeObservance($observance), 'message' => 'Calendar event published successfully.'];
    }

    public function actionConfirm(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $observance = $this->loadOrCreateObservance($id);
        if (is_array($observance)) {
            return $observance;
        }

        $observance->date_status = 'confirmed';
        $observance->source_type = 'admin-override';
        $observance->updated_by = (int)$admin->id;

        if (!$observance->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($observance) ?: 'Unable to confirm calendar event.'];
        }

        return ['item' => $this->serializeObservance($observance), 'message' => 'Calendar event confirmed successfully.'];
    }

    public function actionOverride(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $observance = $this->loadOrCreateObservance($id);
        if (is_array($observance)) {
            return $observance;
        }

        $payload = Yii::$app->request->getBodyParams();
        $this->assignObservance($observance, $payload, $admin);

        if (!$observance->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($observance) ?: 'Unable to override calendar event.'];
        }

        return ['item' => $this->serializeObservance($observance), 'message' => 'Calendar event override saved successfully.'];
    }

    private function saveEvent(FestivalOccurrence $event, Customer $admin): array
    {
        $payload = Yii::$app->request->getBodyParams();
        $festival = $this->loadOrCreateFestival($payload);
        if (is_array($festival)) {
            return $festival;
        }

        $event->festival_id = (int)$festival->id;
        $event->hijri_year = $this->nullableInt($payload['hijriYear'] ?? $payload['hijri_year'] ?? null);
        $event->gregorian_year = (int)($payload['gregorianYear'] ?? $payload['gregorian_year'] ?? date('Y'));
        $event->start_date = trim((string)($payload['startDate'] ?? $payload['start_date'] ?? ''));
        $event->end_date = trim((string)($payload['endDate'] ?? $payload['end_date'] ?? $event->start_date));
        $event->date_status = trim((string)($payload['dateStatus'] ?? $payload['date_status'] ?? 'expected')) ?: 'expected';
        $event->source_type = trim((string)($payload['sourceType'] ?? $payload['source_type'] ?? 'calculated')) ?: 'calculated';
        $event->notes = $this->nullableString($payload['notes'] ?? null);
        $event->status = !empty($payload['status']) ? 1 : 0;

        if (!$event->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($event) ?: 'Unable to save calendar event.'];
        }

        if (isset($payload['observance']) && is_array($payload['observance'])) {
            $observance = $this->loadOrCreateObservance((int)$event->id, $payload['observance']);
            if ($observance instanceof LocationObservance) {
                $this->assignObservance($observance, $payload['observance'], $admin);
                if (!$observance->save()) {
                    Yii::$app->response->statusCode = 422;
                    return ['error' => $this->firstModelError($observance) ?: 'Unable to save location observance.'];
                }
            }
        }

        return ['item' => $this->serializeEvent($event)];
    }

    private function loadOrCreateFestival(array $payload)
    {
        $festivalId = (int)($payload['festivalId'] ?? $payload['festival_id'] ?? 0);
        $festival = $festivalId > 0 ? Festival::findOne(['id' => $festivalId]) : null;
        if (!$festival) {
            $slug = Country::slugify((string)($payload['festivalSlug'] ?? $payload['festival_slug'] ?? $payload['festivalName'] ?? $payload['festival_name'] ?? ''));
            $festival = $slug !== '' ? Festival::findOne(['slug' => $slug]) : null;
        }
        if (!$festival) {
            $festival = new Festival();
        }

        $festival->name = trim((string)($payload['festivalName'] ?? $payload['festival_name'] ?? $festival->name ?? ''));
        $festival->slug = trim((string)($payload['festivalSlug'] ?? $payload['festival_slug'] ?? $festival->slug ?? $festival->name));
        $festival->category = $this->nullableString($payload['category'] ?? $festival->category ?? 'festival');
        $festival->description = $this->nullableString($payload['description'] ?? $festival->description ?? null);
        $festival->is_islamic = !array_key_exists('isIslamic', $payload) || !empty($payload['isIslamic']) ? 1 : 0;
        $festival->is_recurring = !array_key_exists('isRecurring', $payload) || !empty($payload['isRecurring']) ? 1 : 0;
        $festival->status = !array_key_exists('festivalStatus', $payload) || !empty($payload['festivalStatus']) ? 1 : 0;

        if (!$festival->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($festival) ?: 'Unable to save festival.'];
        }

        return $festival;
    }

    private function loadOrCreateObservance(int $eventId, ?array $payload = null)
    {
        $event = FestivalOccurrence::findOne(['id' => $eventId]);
        if (!$event) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Calendar event not found.'];
        }

        $payload = $payload ?? Yii::$app->request->getBodyParams();
        $query = LocationObservance::find()->where(['festival_occurrence_id' => $eventId]);

        $countryId = $this->nullableInt($payload['countryId'] ?? $payload['country_id'] ?? null);
        $stateId = $this->nullableInt($payload['stateId'] ?? $payload['state_id'] ?? null);
        $cityId = $this->nullableInt($payload['cityId'] ?? $payload['city_id'] ?? null);

        $query->andWhere(['country_id' => $countryId, 'state_id' => $stateId, 'city_id' => $cityId]);
        $observance = $query->one();
        if (!$observance) {
            $observance = new LocationObservance();
            $observance->festival_occurrence_id = $eventId;
            $observance->country_id = $countryId;
            $observance->state_id = $stateId;
            $observance->city_id = $cityId;
            $observance->start_date = (string)$event->start_date;
            $observance->end_date = (string)$event->end_date;
            $observance->date_status = (string)$event->date_status;
            $observance->source_type = 'admin-override';
            $observance->status = 1;
        }

        return $observance;
    }

    private function assignObservance(LocationObservance $observance, array $payload, Customer $admin): void
    {
        $observance->country_id = $this->nullableInt($payload['countryId'] ?? $payload['country_id'] ?? $observance->country_id);
        $observance->state_id = $this->nullableInt($payload['stateId'] ?? $payload['state_id'] ?? $observance->state_id);
        $observance->city_id = $this->nullableInt($payload['cityId'] ?? $payload['city_id'] ?? $observance->city_id);
        $observance->observance_profile_id = $this->nullableInt($payload['observanceProfileId'] ?? $payload['observance_profile_id'] ?? $observance->observance_profile_id);
        $observance->start_date = trim((string)($payload['startDate'] ?? $payload['start_date'] ?? $observance->start_date));
        $observance->end_date = trim((string)($payload['endDate'] ?? $payload['end_date'] ?? $observance->end_date));
        $observance->date_status = trim((string)($payload['dateStatus'] ?? $payload['date_status'] ?? $observance->date_status)) ?: 'expected';
        $observance->source_type = trim((string)($payload['sourceType'] ?? $payload['source_type'] ?? $observance->source_type)) ?: 'admin-override';
        $observance->notes = $this->nullableString($payload['notes'] ?? $observance->notes);
        $observance->status = !array_key_exists('status', $payload) || !empty($payload['status']) ? 1 : 0;
        $observance->updated_by = (int)$admin->id;
    }

    private function serializeEvent(FestivalOccurrence $event): array
    {
        return [
            'id' => (int)$event->id,
            'festival' => [
                'id' => $event->festival ? (int)$event->festival->id : null,
                'name' => $event->festival ? (string)$event->festival->name : '',
                'slug' => $event->festival ? (string)$event->festival->slug : '',
                'category' => $event->festival ? (string)($event->festival->category ?? '') : '',
            ],
            'hijriYear' => $event->hijri_year === null ? null : (int)$event->hijri_year,
            'gregorianYear' => (int)$event->gregorian_year,
            'startDate' => (string)$event->start_date,
            'endDate' => (string)$event->end_date,
            'dateStatus' => (string)$event->date_status,
            'sourceType' => (string)$event->source_type,
            'notes' => (string)($event->notes ?? ''),
            'status' => (int)$event->status === 1,
            'observances' => array_map([$this, 'serializeObservance'], LocationObservance::find()
                ->where(['festival_occurrence_id' => (int)$event->id])
                ->orderBy(['city_id' => SORT_DESC, 'state_id' => SORT_DESC, 'country_id' => SORT_DESC])
                ->all()),
            'createdAt' => (string)$event->created_at,
            'updatedAt' => (string)$event->updated_at,
        ];
    }

    private function serializeObservance(LocationObservance $observance): array
    {
        $country = $observance->country_id ? Country::findOne(['id' => (int)$observance->country_id]) : null;
        $state = $observance->state_id ? StateProvince::findOne(['id' => (int)$observance->state_id]) : null;
        $city = $observance->city_id ? City::findOne(['id' => (int)$observance->city_id]) : null;
        $profile = $observance->profile;

        return [
            'id' => (int)$observance->id,
            'countryId' => $observance->country_id === null ? null : (int)$observance->country_id,
            'countryName' => $country ? (string)$country->name : '',
            'stateId' => $observance->state_id === null ? null : (int)$observance->state_id,
            'stateName' => $state ? (string)$state->name : '',
            'cityId' => $observance->city_id === null ? null : (int)$observance->city_id,
            'cityName' => $city ? (string)$city->name : '',
            'observanceProfileId' => $observance->observance_profile_id === null ? null : (int)$observance->observance_profile_id,
            'observanceProfileName' => $profile ? (string)$profile->name : '',
            'startDate' => (string)$observance->start_date,
            'endDate' => (string)$observance->end_date,
            'dateStatus' => (string)$observance->date_status,
            'sourceType' => (string)$observance->source_type,
            'notes' => (string)($observance->notes ?? ''),
            'status' => (int)$observance->status === 1,
            'publishedAt' => (string)($observance->published_at ?? ''),
        ];
    }

    private function filterOptions(): array
    {
        return [
            'dateStatuses' => ['predicted', 'expected', 'tentative', 'confirmed', 'cancelled'],
            'sourceTypes' => ['calculated', 'government-announcement', 'moon-sighting-committee', 'admin-override', 'imported'],
            'countries' => array_map(static function (Country $country): array {
                return ['id' => (int)$country->id, 'name' => (string)$country->name];
            }, Country::find()->orderBy(['name' => SORT_ASC])->all()),
            'states' => array_map(static function (StateProvince $state): array {
                return ['id' => (int)$state->id, 'countryId' => (int)$state->country_id, 'name' => (string)$state->name];
            }, StateProvince::find()->orderBy(['name' => SORT_ASC])->all()),
            'cities' => array_map(static function (City $city): array {
                return ['id' => (int)$city->id, 'stateId' => (int)$city->state_id, 'countryId' => (int)$city->country_id, 'name' => (string)$city->name, 'publicId' => (string)$city->public_id];
            }, City::find()->orderBy(['name' => SORT_ASC])->all()),
            'observanceProfiles' => array_map(static function (ObservanceProfile $profile): array {
                return ['id' => (int)$profile->id, 'name' => (string)$profile->name];
            }, ObservanceProfile::find()->where(['status' => 1])->orderBy(['name' => SORT_ASC])->all()),
        ];
    }

    private function requireAdmin(array $allowedRoles)
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

        if (!BackofficeAccess::userHasAnyRole($user, $allowedRoles)) {
            Yii::$app->response->statusCode = 403;
            return ['error' => 'You do not have permission to access this back office resource.'];
        }

        return $user;
    }

    private function nullableString($value): ?string
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
