<?php

namespace app\controllers;

use Yii;
use app\models\CalendarSpecialDate;
use app\models\City;
use app\models\FestivalOccurrence;
use app\models\HijriCalendarAdjustment;
use app\models\LocationObservance;
use yii\web\Controller;
use yii\web\Response;

class HttpCalendarController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['GET', 'HEAD', 'OPTIONS'],
                'Access-Control-Allow-Credentials' => Yii::$app->params['corsAllowCredentials'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Max-Age' => 86400,
            ],
        ];

        return $behaviors;
    }

    public function actionAdjustments()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        return [
            'items' => array_map([$this, 'serializeCalendarAdjustment'], HijriCalendarAdjustment::find()
                ->where(['is_active' => 1])
                ->orderBy(['hijri_year' => SORT_DESC, 'hijri_month' => SORT_ASC, 'id' => SORT_ASC])
                ->all()),
            'specialDates' => array_map([$this, 'serializeSpecialDate'], CalendarSpecialDate::find()
                ->where(['is_active' => 1])
                ->orderBy(['event_date' => SORT_ASC, 'sort_order' => SORT_ASC, 'id' => SORT_ASC])
                ->all()),
        ];
    }

    public function actionSpecialDates()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        return [
            'items' => array_map([$this, 'serializeSpecialDate'], CalendarSpecialDate::find()
                ->where(['is_active' => 1])
                ->orderBy(['event_date' => SORT_ASC, 'sort_order' => SORT_ASC, 'id' => SORT_ASC])
                ->all()),
        ];
    }

    public function actionCity(string $cityPublicId)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $year = (int)Yii::$app->request->get('year', date('Y'));
        return $this->buildCityCalendarResponse($cityPublicId, $year);
    }

    public function actionCityMonth(string $cityPublicId, int $month)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $year = (int)Yii::$app->request->get('year', date('Y'));
        $response = $this->buildCityCalendarResponse($cityPublicId, $year);
        if (isset($response['error'])) {
            return $response;
        }

        $prefix = sprintf('%04d-%02d-', $year, max(1, min(12, $month)));
        $response['items'] = array_values(array_filter($response['items'], static function (array $item) use ($prefix): bool {
            return strpos((string)$item['date'], $prefix) === 0;
        }));
        $response['month'] = max(1, min(12, $month));

        return $response;
    }

    public function actionCityFestival(string $cityPublicId, string $festivalSlug)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $year = (int)Yii::$app->request->get('year', date('Y'));
        $response = $this->buildCityCalendarResponse($cityPublicId, $year);
        if (isset($response['error'])) {
            return $response;
        }

        $items = array_values(array_filter($response['items'], static function (array $item) use ($festivalSlug): bool {
            return (string)($item['festival']['slug'] ?? '') === $festivalSlug;
        }));
        if (!$items) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Festival occurrence not found for this city and year.'];
        }

        $response['items'] = $items;
        return $response;
    }

    private function serializeCalendarAdjustment(HijriCalendarAdjustment $adjustment): array
    {
        return [
            'id' => (int)$adjustment->id,
            'title' => (string)$adjustment->title,
            'hijriYear' => (int)($adjustment->hijri_year ?? 0),
            'hijriMonth' => (int)($adjustment->hijri_month ?? 0),
            'originalStartDate' => (string)($adjustment->original_start_date ?? ''),
            'originalEndDate' => (string)($adjustment->original_end_date ?? ''),
            'updatedStartDate' => (string)($adjustment->updated_start_date ?: $adjustment->start_date ?: ''),
            'updatedEndDate' => (string)($adjustment->updated_end_date ?: $adjustment->end_date ?: ''),
            'startDate' => (string)($adjustment->start_date ?? ''),
            'endDate' => (string)($adjustment->end_date ?? ''),
            'adjustmentDays' => (int)($adjustment->adjustment_days ?? 0),
            'notes' => (string)($adjustment->notes ?? ''),
            'isActive' => ((int)($adjustment->is_active ?? 0) === 1),
        ];
    }

    private function serializeSpecialDate(CalendarSpecialDate $specialDate): array
    {
        return [
            'id' => (int)$specialDate->id,
            'title' => (string)$specialDate->title,
            'eventDate' => (string)$specialDate->event_date,
            'description' => (string)($specialDate->description ?? ''),
            'isActive' => ((int)($specialDate->is_active ?? 0) === 1),
            'sortOrder' => (int)($specialDate->sort_order ?? 0),
        ];
    }

    private function buildCityCalendarResponse(string $cityPublicId, int $year): array
    {
        $city = City::find()
            ->where(['public_id' => $cityPublicId, 'status' => 1])
            ->one();

        if (!$city) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'City not found.'];
        }

        $occurrences = FestivalOccurrence::find()
            ->alias('occurrence')
            ->joinWith('festival festival')
            ->where(['occurrence.gregorian_year' => $year, 'occurrence.status' => 1, 'festival.status' => 1])
            ->orderBy(['occurrence.start_date' => SORT_ASC, 'festival.name' => SORT_ASC])
            ->all();

        return [
            'city' => $this->serializeCity($city),
            'year' => $year,
            'items' => array_map(function (FestivalOccurrence $occurrence) use ($city): array {
                return $this->serializeResolvedOccurrence($occurrence, $city);
            }, $occurrences),
        ];
    }

    private function serializeResolvedOccurrence(FestivalOccurrence $occurrence, City $city): array
    {
        $observance = $this->resolveObservance($occurrence, $city);
        $festival = $occurrence->festival;
        $profile = $observance ? $observance->profile : null;

        return [
            'festival' => [
                'name' => $festival ? (string)$festival->name : '',
                'slug' => $festival ? (string)$festival->slug : '',
            ],
            'date' => (string)($observance->start_date ?? $occurrence->start_date),
            'endDate' => (string)($observance->end_date ?? $occurrence->end_date),
            'dateStatus' => (string)($observance->date_status ?? $occurrence->date_status),
            'sourceType' => (string)($observance->source_type ?? $occurrence->source_type),
            'notes' => (string)($observance->notes ?? $occurrence->notes ?? ''),
            'location' => [
                'country' => $city->country ? (string)$city->country->name : '',
                'state' => $city->state ? (string)$city->state->name : '',
                'city' => (string)$city->name,
                'cityPublicId' => (string)$city->public_id,
            ],
            'observanceProfile' => [
                'name' => $profile ? (string)$profile->name : '',
            ],
            'isOverride' => $observance !== null,
            'publishedAt' => $observance ? (string)($observance->published_at ?? '') : '',
        ];
    }

    private function resolveObservance(FestivalOccurrence $occurrence, City $city): ?LocationObservance
    {
        $base = LocationObservance::find()
            ->where(['festival_occurrence_id' => (int)$occurrence->id, 'status' => 1]);

        $citySpecific = (clone $base)->andWhere(['city_id' => (int)$city->id])->one();
        if ($citySpecific) {
            return $citySpecific;
        }

        $stateSpecific = (clone $base)
            ->andWhere(['state_id' => (int)$city->state_id])
            ->andWhere(['city_id' => null])
            ->one();
        if ($stateSpecific) {
            return $stateSpecific;
        }

        $countrySpecific = (clone $base)
            ->andWhere(['country_id' => (int)$city->country_id])
            ->andWhere(['state_id' => null, 'city_id' => null])
            ->one();
        if ($countrySpecific) {
            return $countrySpecific;
        }

        return (clone $base)
            ->andWhere(['country_id' => null, 'state_id' => null, 'city_id' => null])
            ->one();
    }

    private function serializeCity(City $city): array
    {
        return [
            'publicId' => (string)$city->public_id,
            'name' => (string)$city->name,
            'slug' => (string)$city->slug,
            'timezone' => (string)$city->timezone,
            'country' => $city->country ? (string)$city->country->name : '',
            'countrySlug' => $city->country ? (string)$city->country->slug : '',
            'state' => $city->state ? (string)$city->state->name : '',
            'stateSlug' => $city->state ? (string)$city->state->slug : '',
        ];
    }
}
