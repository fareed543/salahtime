<?php

namespace app\models;

use Yii;

/**
 * This is the model class for table "bt_budget_planner".
 *
 * @property int $id_planner
 * @property int $id_customer
 * @property int $id_category
 * @property float $amount
 * @property int $month
 * @property int $year
 * @property string $created_at
 * @property string $updated_at
 */
class BudgetPlanner extends \yii\db\ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'bt_budget_planner';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['id_customer', 'id_category', 'amount', 'month', 'year'], 'required'],
            [['id_customer', 'id_category', 'month', 'year'], 'integer'],
            [['amount'], 'number'],
            [['created_at', 'updated_at'], 'safe'],
            [['month'], 'integer', 'min' => 1, 'max' => 12],
            [['year'], 'integer', 'min' => 2000, 'max' => date('Y') + 10],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id_planner' => 'Id Planner',
            'id_customer' => 'User ID',
            'id_category' => 'Category ID',
            'amount' => 'Amount',
            'month' => 'Month',
            'year' => 'Year',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }
}
