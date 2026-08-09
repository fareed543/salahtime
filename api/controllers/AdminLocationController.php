<?php

namespace app\controllers;

use Yii;
use app\components\BackofficeAccess;
use app\models\City;
use app\models\Country;
use app\models\Customer;
use app\models\LocationObservance;
use app\models\StateProvince;
use yii\db\Query;
use yii\web\Controller;
use yii\web\Response;

class AdminLocationController extends Controller
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

    public function actionCountries()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        if (Yii::$app->request->isPost) {
            return $this->saveCountry(new Country(), $admin);
        }

        $query = Country::find()->alias('country');
        $this->applySearch($query, ['country.name', 'country.iso2_code', 'country.iso3_code', 'country.slug']);
        $this->applyStatus($query, 'country.status');
        $pagination = $this->paginate($query);

        $items = $query
            ->orderBy(['country.sort_order' => SORT_ASC, 'country.name' => SORT_ASC])
            ->offset($pagination['offset'])
            ->limit($pagination['perPage'])
            ->all();

        return [
            'items' => array_map([$this, 'serializeCountry'], $items),
            'summary' => [
                'totalCountries' => (int)Country::find()->count(),
                'activeCountries' => (int)Country::find()->where(['status' => 1])->count(),
                'inactiveCountries' => (int)Country::find()->where(['status' => 0])->count(),
                'totalCities' => (int)City::find()->count(),
            ],
            'pagination' => $pagination['response'],
        ];
    }

    public function actionCountry(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $model = Country::findOne(['id' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Country not found.'];
        }

        if (Yii::$app->request->isDelete) {
            if ((int)StateProvince::find()->where(['country_id' => $id])->count() > 0 || (int)City::find()->where(['country_id' => $id])->count() > 0) {
                Yii::$app->response->statusCode = 409;
                return ['error' => 'Country has dependent states or cities. Deactivate it instead.'];
            }
            $model->delete();
            return ['message' => 'Country deleted successfully.'];
        }

        if (Yii::$app->request->isPut) {
            return $this->saveCountry($model, $admin);
        }

        return $this->serializeCountry($model, true);
    }

    public function actionCountryStatus(int $id)
    {
        return $this->toggleStatus(Country::class, $id, 'country');
    }

    public function actionStates()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        if (Yii::$app->request->isPost) {
            return $this->saveState(new StateProvince(), $admin);
        }

        $query = StateProvince::find()->alias('state')->joinWith('country country');
        $this->applySearch($query, ['state.name', 'state.code', 'state.type', 'state.slug', 'country.name']);
        $this->applyStatus($query, 'state.status');
        if ((int)Yii::$app->request->get('countryId', 0) > 0) {
            $query->andWhere(['state.country_id' => (int)Yii::$app->request->get('countryId')]);
        }
        $pagination = $this->paginate($query);

        $items = $query
            ->orderBy(['country.name' => SORT_ASC, 'state.sort_order' => SORT_ASC, 'state.name' => SORT_ASC])
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
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $model = StateProvince::findOne(['id' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'State/province not found.'];
        }

        if (Yii::$app->request->isDelete) {
            if ((int)City::find()->where(['state_id' => $id])->count() > 0) {
                Yii::$app->response->statusCode = 409;
                return ['error' => 'State/province has dependent cities. Deactivate it instead.'];
            }
            $model->delete();
            return ['message' => 'State/province deleted successfully.'];
        }

        if (Yii::$app->request->isPut) {
            return $this->saveState($model, $admin);
        }

        return $this->serializeState($model, true);
    }

    public function actionStateStatus(int $id)
    {
        return $this->toggleStatus(StateProvince::class, $id, 'state/province');
    }

    public function actionCities()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        if (Yii::$app->request->isPost) {
            return $this->saveCity(new City(), $admin);
        }

        $query = City::find()->alias('city')->joinWith(['country country', 'state state']);
        $this->applySearch($query, ['city.name', 'city.public_id', 'city.slug', 'city.timezone', 'city.search_aliases', 'state.name', 'country.name']);
        $this->applyStatus($query, 'city.status');
        foreach (['countryId' => 'city.country_id', 'stateId' => 'city.state_id'] as $param => $column) {
            if ((int)Yii::$app->request->get($param, 0) > 0) {
                $query->andWhere([$column => (int)Yii::$app->request->get($param)]);
            }
        }
        if (Yii::$app->request->get('featured', '') !== '') {
            $query->andWhere(['city.is_featured' => (int)Yii::$app->request->get('featured')]);
        }
        $pagination = $this->paginate($query);

        $items = $query
            ->orderBy(['city.is_featured' => SORT_DESC, 'country.name' => SORT_ASC, 'state.name' => SORT_ASC, 'city.name' => SORT_ASC])
            ->offset($pagination['offset'])
            ->limit($pagination['perPage'])
            ->all();

        return [
            'items' => array_map([$this, 'serializeCity'], $items),
            'filterOptions' => [
                'countries' => $this->countryOptions(),
                'states' => $this->stateOptions((int)Yii::$app->request->get('countryId', 0)),
            ],
            'pagination' => $pagination['response'],
        ];
    }

    public function actionCity(int $id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $model = City::findOne(['id' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'City not found.'];
        }

        if (Yii::$app->request->isDelete) {
            if ((int)LocationObservance::find()->where(['city_id' => $id])->count() > 0) {
                Yii::$app->response->statusCode = 409;
                return ['error' => 'City is referenced by calendar observances. Deactivate it instead.'];
            }
            $model->delete();
            return ['message' => 'City deleted successfully.'];
        }

        if (Yii::$app->request->isPut) {
            return $this->saveCity($model, $admin);
        }

        return $this->serializeCity($model, true);
    }

    public function actionCityStatus(int $id)
    {
        return $this->toggleStatus(City::class, $id, 'city');
    }

    private function saveCountry(Country $model, Customer $admin): array
    {
        $payload = Yii::$app->request->getBodyParams();
        $model->name = trim((string)($payload['name'] ?? ''));
        $model->official_name = $this->nullable($payload['officialName'] ?? $payload['official_name'] ?? null);
        $model->iso2_code = trim((string)($payload['iso2Code'] ?? $payload['iso2_code'] ?? ''));
        $model->iso3_code = trim((string)($payload['iso3Code'] ?? $payload['iso3_code'] ?? ''));
        $model->numeric_code = $this->nullable($payload['numericCode'] ?? $payload['numeric_code'] ?? null);
        $model->slug = trim((string)($payload['slug'] ?? $model->name));
        $model->default_timezone = trim((string)($payload['defaultTimezone'] ?? $payload['default_timezone'] ?? ''));
        $model->default_language = trim((string)($payload['defaultLanguage'] ?? $payload['default_language'] ?? 'en')) ?: 'en';
        $model->status = !empty($payload['status']) ? 1 : 0;
        $model->sort_order = (int)($payload['sortOrder'] ?? $payload['sort_order'] ?? 0);
        $model->updated_by = (int)$admin->id;
        if ($model->isNewRecord) {
            $model->created_by = (int)$admin->id;
        }

        return $this->saveModel($model, [$this, 'serializeCountry']);
    }

    private function saveState(StateProvince $model, Customer $admin): array
    {
        $payload = Yii::$app->request->getBodyParams();
        $model->country_id = (int)($payload['countryId'] ?? $payload['country_id'] ?? 0);
        $model->name = trim((string)($payload['name'] ?? ''));
        $model->official_name = $this->nullable($payload['officialName'] ?? $payload['official_name'] ?? null);
        $model->code = trim((string)($payload['code'] ?? ''));
        $model->slug = trim((string)($payload['slug'] ?? $model->name));
        $model->type = trim((string)($payload['type'] ?? 'state')) ?: 'state';
        $model->timezone = $this->nullable($payload['timezone'] ?? null);
        $model->status = !empty($payload['status']) ? 1 : 0;
        $model->sort_order = (int)($payload['sortOrder'] ?? $payload['sort_order'] ?? 0);
        $model->updated_by = (int)$admin->id;
        if ($model->isNewRecord) {
            $model->created_by = (int)$admin->id;
        }

        return $this->saveModel($model, [$this, 'serializeState']);
    }

    private function saveCity(City $model, Customer $admin): array
    {
        $payload = Yii::$app->request->getBodyParams();
        if ($model->isNewRecord) {
            $model->public_id = trim((string)($payload['publicId'] ?? $payload['public_id'] ?? ''));
        }
        $model->country_id = (int)($payload['countryId'] ?? $payload['country_id'] ?? 0);
        $model->state_id = (int)($payload['stateId'] ?? $payload['state_id'] ?? 0);
        $model->name = trim((string)($payload['name'] ?? ''));
        $model->official_name = $this->nullable($payload['officialName'] ?? $payload['official_name'] ?? null);
        $model->slug = trim((string)($payload['slug'] ?? $model->name));
        $model->latitude = (float)($payload['latitude'] ?? 0);
        $model->longitude = (float)($payload['longitude'] ?? 0);
        $model->timezone = trim((string)($payload['timezone'] ?? ''));
        $model->city_type = trim((string)($payload['cityType'] ?? $payload['city_type'] ?? 'city')) ?: 'city';
        $model->search_aliases = $this->nullable($payload['searchAliases'] ?? $payload['search_aliases'] ?? null);
        $model->status = !empty($payload['status']) ? 1 : 0;
        $model->is_featured = !empty($payload['isFeatured'] ?? $payload['is_featured'] ?? false) ? 1 : 0;
        $model->sort_order = (int)($payload['sortOrder'] ?? $payload['sort_order'] ?? 0);
        $model->updated_by = (int)$admin->id;
        if ($model->isNewRecord) {
            $model->created_by = (int)$admin->id;
        }

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

    private function toggleStatus(string $class, int $id, string $label): array
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $admin = $this->requireAdmin(['administrator', 'manager']);
        if (!$admin instanceof Customer) {
            return $admin;
        }

        $model = $class::findOne(['id' => $id]);
        if (!$model) {
            Yii::$app->response->statusCode = 404;
            return ['error' => ucfirst($label) . ' not found.'];
        }

        $model->status = (int)$model->status === 1 ? 0 : 1;
        if ($model->hasAttribute('updated_by')) {
            $model->updated_by = (int)$admin->id;
        }
        if (!$model->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => $this->firstModelError($model) ?: 'Unable to update status.'];
        }

        return ['message' => ucfirst($label) . ' status updated successfully.'];
    }

    private function serializeCountry(Country $country, bool $withOptions = false): array
    {
        $item = [
            'id' => (int)$country->id,
            'name' => (string)$country->name,
            'officialName' => (string)($country->official_name ?? ''),
            'iso2Code' => (string)$country->iso2_code,
            'iso3Code' => (string)$country->iso3_code,
            'numericCode' => (string)($country->numeric_code ?? ''),
            'slug' => (string)$country->slug,
            'defaultTimezone' => (string)$country->default_timezone,
            'defaultLanguage' => (string)$country->default_language,
            'status' => (int)$country->status === 1,
            'sortOrder' => (int)$country->sort_order,
            'stateCount' => (int)StateProvince::find()->where(['country_id' => (int)$country->id])->count(),
            'cityCount' => (int)City::find()->where(['country_id' => (int)$country->id])->count(),
            'createdAt' => (string)$country->created_at,
            'updatedAt' => (string)$country->updated_at,
        ];

        if ($withOptions) {
            $item['options'] = ['countries' => $this->countryOptions()];
        }

        return $item;
    }

    private function serializeState(StateProvince $state, bool $withOptions = false): array
    {
        $country = $state->country;
        $item = [
            'id' => (int)$state->id,
            'countryId' => (int)$state->country_id,
            'countryName' => $country ? (string)$country->name : '',
            'name' => (string)$state->name,
            'officialName' => (string)($state->official_name ?? ''),
            'code' => (string)$state->code,
            'slug' => (string)$state->slug,
            'type' => (string)$state->type,
            'timezone' => (string)($state->timezone ?? ''),
            'status' => (int)$state->status === 1,
            'sortOrder' => (int)$state->sort_order,
            'cityCount' => (int)City::find()->where(['state_id' => (int)$state->id])->count(),
            'createdAt' => (string)$state->created_at,
            'updatedAt' => (string)$state->updated_at,
        ];

        if ($withOptions) {
            $item['options'] = ['countries' => $this->countryOptions()];
        }

        return $item;
    }

    private function serializeCity(City $city, bool $withOptions = false): array
    {
        $country = $city->country;
        $state = $city->state;
        $item = [
            'id' => (int)$city->id,
            'publicId' => (string)$city->public_id,
            'countryId' => (int)$city->country_id,
            'countryName' => $country ? (string)$country->name : '',
            'countrySlug' => $country ? (string)$country->slug : '',
            'stateId' => (int)$city->state_id,
            'stateName' => $state ? (string)$state->name : '',
            'stateSlug' => $state ? (string)$state->slug : '',
            'name' => (string)$city->name,
            'officialName' => (string)($city->official_name ?? ''),
            'slug' => (string)$city->slug,
            'latitude' => (float)$city->latitude,
            'longitude' => (float)$city->longitude,
            'timezone' => (string)$city->timezone,
            'cityType' => (string)$city->city_type,
            'searchAliases' => (string)($city->search_aliases ?? ''),
            'status' => (int)$city->status === 1,
            'isFeatured' => (int)$city->is_featured === 1,
            'sortOrder' => (int)$city->sort_order,
            'createdAt' => (string)$city->created_at,
            'updatedAt' => (string)$city->updated_at,
        ];
        $item['canonicalPath'] = $this->canonicalCityPath($item);

        if ($withOptions) {
            $item['options'] = [
                'countries' => $this->countryOptions(),
                'states' => $this->stateOptions((int)$city->country_id),
            ];
        }

        return $item;
    }

    private function canonicalCityPath(array $city, string $language = 'en'): string
    {
        return sprintf(
            '/%s/prayer-times/%s/%s-%s/%s',
            $language,
            $city['countrySlug'],
            $city['stateSlug'],
            $city['slug'],
            $city['publicId']
        );
    }

    private function countryOptions(): array
    {
        return array_map(static function (Country $country): array {
            return ['id' => (int)$country->id, 'name' => (string)$country->name, 'slug' => (string)$country->slug, 'timezone' => (string)$country->default_timezone];
        }, Country::find()->where(['status' => 1])->orderBy(['sort_order' => SORT_ASC, 'name' => SORT_ASC])->all());
    }

    private function stateOptions(int $countryId = 0): array
    {
        $query = StateProvince::find()->where(['status' => 1])->orderBy(['sort_order' => SORT_ASC, 'name' => SORT_ASC]);
        if ($countryId > 0) {
            $query->andWhere(['country_id' => $countryId]);
        }
        return array_map(static function (StateProvince $state): array {
            return ['id' => (int)$state->id, 'countryId' => (int)$state->country_id, 'name' => (string)$state->name, 'slug' => (string)$state->slug, 'timezone' => (string)($state->timezone ?? '')];
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

    private function nullable($value): ?string
    {
        $value = trim((string)$value);
        return $value === '' ? null : $value;
    }

    private function firstModelError($model): string
    {
        $errors = $model->getFirstErrors();
        return $errors ? (string)reset($errors) : '';
    }
}
