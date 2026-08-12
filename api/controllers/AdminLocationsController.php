<?php

namespace app\controllers;

use app\components\BackofficeAccess;
use app\models\Customer;
use app\models\LocationCity;
use app\models\LocationCountry;
use app\models\LocationState;
use Yii;
use yii\web\Controller;
use yii\web\Response;

class AdminLocationsController extends Controller
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

    public function actionOptions()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        Yii::$app->response->statusCode = 204;
        return null;
    }

    public function actionBulkDelete()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $payload = Yii::$app->request->getBodyParams();
        $kind = trim((string)($payload['kind'] ?? ''));
        $ids = array_values(array_unique(array_filter(array_map('intval', (array)($payload['ids'] ?? [])))));

        if (!$ids) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Please select at least one record.'];
        }

        if (!in_array($kind, ['countries', 'states', 'cities'], true)) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Invalid location type.'];
        }

        $deletedCount = 0;
        foreach ($ids as $id) {
            $result = $kind === 'countries'
                ? $this->deleteCountryById($id)
                : ($kind === 'states' ? $this->deleteStateById($id) : $this->deleteCityById($id));

            if (($result['success'] ?? false) !== true) {
                Yii::$app->response->statusCode = (int)($result['statusCode'] ?? 409);
                return ['error' => $result['error'] ?? 'Unable to delete selected records.', 'deletedCount' => $deletedCount];
            }

            $deletedCount++;
        }

        return [
            'message' => sprintf('%d %s deleted successfully.', $deletedCount, $deletedCount === 1 ? 'record was' : 'records were'),
            'deletedCount' => $deletedCount,
        ];
    }

    public function actionCountries()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        if (Yii::$app->request->isPost) {
            return $this->saveCountry(new LocationCountry());
        }

        $query = LocationCountry::find()->alias('country');
        $this->applySearch($query, ['country.name', 'country.code', 'country.slug', 'country.timezone']);
        $this->applyStatus($query, 'country.is_active');
        $pagination = $this->paginate($query);
        $items = $query
            ->orderBy(['country.name' => SORT_ASC])
            ->offset($pagination['offset'])
            ->limit($pagination['perPage'])
            ->all();

        return [
            'items' => array_map([$this, 'serializeCountry'], $items),
            'pagination' => $pagination['response'],
        ];
    }

    public function actionCountry(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $model = LocationCountry::findOne(['id' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Country not found.'];
        }

        if (Yii::$app->request->isDelete) {
            $result = $this->deleteCountryById($id);
            if (($result['success'] ?? false) !== true) {
                Yii::$app->response->statusCode = (int)($result['statusCode'] ?? 409);
                return ['error' => $result['error'] ?? 'Unable to delete country.'];
            }

            return ['message' => 'Country deleted successfully.'];
        }

        if (Yii::$app->request->isPut) {
            return $this->saveCountry($model);
        }

        return $this->serializeCountry($model, true);
    }

    public function actionCountryStatus(int $id)
    {
        return $this->toggleStatus(LocationCountry::class, $id, 'country');
    }

    public function actionStates()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        if (Yii::$app->request->isPost) {
            return $this->saveState(new LocationState());
        }

        $query = LocationState::find()->alias('state')->joinWith('country country');
        $this->applySearch($query, ['state.name', 'state.code', 'state.slug', 'country.name']);
        $this->applyStatus($query, 'state.is_active');
        $countryId = (int)Yii::$app->request->get('countryId', 0);
        if ($countryId > 0) {
            $query->andWhere(['state.country_id' => $countryId]);
        }

        $pagination = $this->paginate($query);
        $items = $query
            ->orderBy(['country.name' => SORT_ASC, 'state.name' => SORT_ASC])
            ->offset($pagination['offset'])
            ->limit($pagination['perPage'])
            ->all();

        return [
            'items' => array_map([$this, 'serializeState'], $items),
            'filterOptions' => ['countries' => $this->countryOptions()],
            'pagination' => $pagination['response'],
        ];
    }

    public function actionState(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $model = LocationState::findOne(['id' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'State not found.'];
        }

        if (Yii::$app->request->isDelete) {
            $result = $this->deleteStateById($id);
            if (($result['success'] ?? false) !== true) {
                Yii::$app->response->statusCode = (int)($result['statusCode'] ?? 409);
                return ['error' => $result['error'] ?? 'Unable to delete state.'];
            }

            return ['message' => 'State deleted successfully.'];
        }

        if (Yii::$app->request->isPut) {
            return $this->saveState($model);
        }

        return $this->serializeState($model, true);
    }

    public function actionStateStatus(int $id)
    {
        return $this->toggleStatus(LocationState::class, $id, 'state');
    }

    public function actionCities()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        if (Yii::$app->request->isPost) {
            return $this->saveCity(new LocationCity());
        }

        $query = LocationCity::find()->alias('city')->joinWith(['country country', 'state state']);
        $this->applySearch($query, ['city.name', 'city.ascii_name', 'city.slug', 'city.timezone', 'city.geoname_id', 'state.name', 'country.name']);
        $this->applyStatus($query, 'city.is_active');

        $countryId = (int)Yii::$app->request->get('countryId', 0);
        $stateId = (int)Yii::$app->request->get('stateId', 0);
        if ($countryId > 0) {
            $query->andWhere(['city.country_id' => $countryId]);
        }
        if ($stateId > 0) {
            $query->andWhere(['city.state_id' => $stateId]);
        }

        $pagination = $this->paginate($query);
        $items = $query
            ->orderBy(['country.name' => SORT_ASC, 'state.name' => SORT_ASC, 'city.name' => SORT_ASC])
            ->offset($pagination['offset'])
            ->limit($pagination['perPage'])
            ->all();

        return [
            'items' => array_map([$this, 'serializeCity'], $items),
            'filterOptions' => [
                'countries' => $this->countryOptions(),
                'states' => $this->stateOptions($countryId),
            ],
            'pagination' => $pagination['response'],
        ];
    }

    public function actionCity(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $model = LocationCity::findOne(['id' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'City not found.'];
        }

        if (Yii::$app->request->isDelete) {
            $result = $this->deleteCityById($id);
            if (($result['success'] ?? false) !== true) {
                Yii::$app->response->statusCode = (int)($result['statusCode'] ?? 409);
                return ['error' => $result['error'] ?? 'Unable to delete city.'];
            }

            return ['message' => 'City deleted successfully.'];
        }

        if (Yii::$app->request->isPut) {
            return $this->saveCity($model);
        }

        return $this->serializeCity($model, true);
    }

    public function actionCityStatus(int $id)
    {
        return $this->toggleStatus(LocationCity::class, $id, 'city');
    }

    private function saveCountry(LocationCountry $model): array
    {
        $payload = Yii::$app->request->getBodyParams();
        $model->name = trim((string)($payload['name'] ?? ''));
        $model->code = trim((string)($payload['code'] ?? ''));
        $model->slug = trim((string)($payload['slug'] ?? $model->name));
        $model->timezone = $this->nullable($payload['timezone'] ?? null);
        $model->is_active = !empty($payload['isActive'] ?? $payload['is_active'] ?? true) ? 1 : 0;

        return $this->saveModel($model, [$this, 'serializeCountry']);
    }

    private function saveState(LocationState $model): array
    {
        $payload = Yii::$app->request->getBodyParams();
        $model->country_id = (int)($payload['countryId'] ?? $payload['country_id'] ?? 0);
        $model->name = trim((string)($payload['name'] ?? ''));
        $model->code = $this->nullable($payload['code'] ?? null);
        $model->slug = trim((string)($payload['slug'] ?? $model->name));
        $model->is_active = !empty($payload['isActive'] ?? $payload['is_active'] ?? true) ? 1 : 0;

        return $this->saveModel($model, [$this, 'serializeState']);
    }

    private function saveCity(LocationCity $model): array
    {
        $payload = Yii::$app->request->getBodyParams();
        $model->geoname_id = $this->nullableInt($payload['geonameId'] ?? $payload['geoname_id'] ?? null);
        $model->country_id = (int)($payload['countryId'] ?? $payload['country_id'] ?? 0);
        $model->state_id = $this->nullableInt($payload['stateId'] ?? $payload['state_id'] ?? null);
        $model->name = trim((string)($payload['name'] ?? ''));
        $model->ascii_name = $this->nullable($payload['asciiName'] ?? $payload['ascii_name'] ?? null);
        $model->slug = trim((string)($payload['slug'] ?? $model->name));
        $model->latitude = (float)($payload['latitude'] ?? 0);
        $model->longitude = (float)($payload['longitude'] ?? 0);
        $model->timezone = trim((string)($payload['timezone'] ?? ''));
        $model->population = (int)($payload['population'] ?? 0);
        $model->is_active = !empty($payload['isActive'] ?? $payload['is_active'] ?? true) ? 1 : 0;

        return $this->saveModel($model, [$this, 'serializeCity']);
    }

    private function saveModel($model, callable $serializer): array
    {
        if (!$model->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($model) ?: 'Unable to save record.'];
        }

        return ['item' => $serializer($model, true)];
    }

    private function deleteCountryById(int $id): array
    {
        $model = LocationCountry::findOne(['id' => $id]);
        if (!$model) {
            return ['success' => false, 'statusCode' => 404, 'error' => 'Country not found.'];
        }

        if (LocationState::find()->where(['country_id' => $id])->exists() || LocationCity::find()->where(['country_id' => $id])->exists()) {
            return ['success' => false, 'statusCode' => 409, 'error' => 'Country has states or cities. Delete them first or mark country inactive.'];
        }

        $model->delete();
        return ['success' => true];
    }

    private function deleteStateById(int $id): array
    {
        $model = LocationState::findOne(['id' => $id]);
        if (!$model) {
            return ['success' => false, 'statusCode' => 404, 'error' => 'State not found.'];
        }

        if (LocationCity::find()->where(['state_id' => $id])->exists()) {
            return ['success' => false, 'statusCode' => 409, 'error' => 'State has cities. Delete them first or mark state inactive.'];
        }

        $model->delete();
        return ['success' => true];
    }

    private function deleteCityById(int $id): array
    {
        $model = LocationCity::findOne(['id' => $id]);
        if (!$model) {
            return ['success' => false, 'statusCode' => 404, 'error' => 'City not found.'];
        }

        $model->delete();
        return ['success' => true];
    }

    private function toggleStatus(string $class, int $id, string $label): array
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $model = $class::findOne(['id' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => ucfirst($label) . ' not found.'];
        }

        $model->is_active = (int)$model->is_active === 1 ? 0 : 1;
        if (!$model->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($model) ?: 'Unable to update status.'];
        }

        return ['message' => ucfirst($label) . ' status updated successfully.'];
    }

    private function serializeCountry(LocationCountry $country, bool $withOptions = false): array
    {
        $item = [
            'id' => (int)$country->id,
            'name' => (string)$country->name,
            'code' => (string)$country->code,
            'slug' => (string)$country->slug,
            'timezone' => (string)($country->timezone ?? ''),
            'isActive' => (int)$country->is_active === 1,
            'stateCount' => (int)LocationState::find()->where(['country_id' => (int)$country->id])->count(),
            'cityCount' => (int)LocationCity::find()->where(['country_id' => (int)$country->id])->count(),
        ];

        if ($withOptions) {
            $item['options'] = ['countries' => $this->countryOptions()];
        }

        return $item;
    }

    private function serializeState(LocationState $state, bool $withOptions = false): array
    {
        $country = $state->country;
        $item = [
            'id' => (int)$state->id,
            'countryId' => (int)$state->country_id,
            'countryName' => $country ? (string)$country->name : '',
            'name' => (string)$state->name,
            'code' => (string)($state->code ?? ''),
            'slug' => (string)$state->slug,
            'isActive' => (int)$state->is_active === 1,
            'cityCount' => (int)LocationCity::find()->where(['state_id' => (int)$state->id])->count(),
        ];

        if ($withOptions) {
            $item['options'] = ['countries' => $this->countryOptions()];
        }

        return $item;
    }

    private function serializeCity(LocationCity $city, bool $withOptions = false): array
    {
        $country = $city->country;
        $state = $city->state;
        $item = [
            'id' => (int)$city->id,
            'geonameId' => $city->geoname_id === null ? null : (int)$city->geoname_id,
            'countryId' => (int)$city->country_id,
            'countryName' => $country ? (string)$country->name : '',
            'stateId' => $city->state_id === null ? null : (int)$city->state_id,
            'stateName' => $state ? (string)$state->name : '',
            'name' => (string)$city->name,
            'asciiName' => (string)($city->ascii_name ?? ''),
            'slug' => (string)$city->slug,
            'latitude' => (float)$city->latitude,
            'longitude' => (float)$city->longitude,
            'timezone' => (string)$city->timezone,
            'population' => (int)($city->population ?? 0),
            'isActive' => (int)$city->is_active === 1,
        ];

        if ($withOptions) {
            $item['options'] = [
                'countries' => $this->countryOptions(),
                'states' => $this->stateOptions((int)$city->country_id),
            ];
        }

        return $item;
    }

    private function countryOptions(): array
    {
        return array_map(static function (LocationCountry $country): array {
            return [
                'id' => (int)$country->id,
                'name' => (string)$country->name,
                'timezone' => (string)($country->timezone ?? ''),
            ];
        }, LocationCountry::find()->where(['is_active' => 1])->orderBy(['name' => SORT_ASC])->all());
    }

    private function stateOptions(int $countryId = 0): array
    {
        $query = LocationState::find()->where(['is_active' => 1])->orderBy(['name' => SORT_ASC]);
        if ($countryId > 0) {
            $query->andWhere(['country_id' => $countryId]);
        }

        return array_map(static function (LocationState $state): array {
            return [
                'id' => (int)$state->id,
                'countryId' => (int)$state->country_id,
                'name' => (string)$state->name,
            ];
        }, $query->all());
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
