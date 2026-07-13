<?php

namespace app\controllers;

use Yii;
use app\models\CalendarSpecialDate;
use app\models\HijriCalendarAdjustment;
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
}
