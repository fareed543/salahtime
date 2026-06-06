<?php

namespace app\controllers;

use Yii;
use app\models\Customer;
use app\models\KnowledgeHadith;
use app\models\KnowledgeHadithTag;
use app\models\KnowledgeHadithTranslation;
use app\models\KnowledgeTag;
use yii\db\Query;
use yii\web\Controller;
use yii\web\Response;

class HttpKnowledgeController extends Controller
{
    private const LANGUAGES = ['en', 'te', 'ar', 'ur'];

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
        Yii::$app->response->format = Response::FORMAT_JSON;
        return parent::beforeAction($action);
    }

    public function actionList()
    {
        $tagCodes = array_filter(explode(',', (string)Yii::$app->request->get('tags', '')));
        $ruleType = trim((string)Yii::$app->request->get('ruleType', ''));
        $search = trim((string)Yii::$app->request->get('search', ''));

        $query = KnowledgeHadith::find()
            ->alias('h')
            ->where(['h.status' => 1]);

        if ($ruleType !== '') {
            $query->andWhere(['h.rule_type' => $ruleType]);
        }

        if ($search !== '') {
            $query->andWhere([
                'or',
                ['like', 'h.title', $search],
                ['like', 'h.arabic_text', $search],
                ['like', 'h.reference_source', $search],
            ]);
        }

        if (!empty($tagCodes)) {
            $query
                ->innerJoin('bt_knowledge_hadith_tag ht', 'ht.id_hadith = h.id')
                ->innerJoin('bt_knowledge_tag t', 't.id = ht.id_tag')
                ->andWhere(['t.code' => $tagCodes])
                ->groupBy('h.id')
                ->having(['>=', 'COUNT(DISTINCT t.code)', count($tagCodes)]);
        }

        $hadiths = $query
            ->orderBy(['h.sort_order' => SORT_ASC, 'h.id' => SORT_DESC])
            ->all();

        return [
            'tags' => $this->serializeTags(),
            'hadiths' => array_map(fn(KnowledgeHadith $hadith) => $this->serializeHadith($hadith), $hadiths),
        ];
    }

    public function actionManage()
    {
        if ($this->requireSuperAdmin() === null) {
            return Yii::$app->response->data;
        }

        $hadiths = KnowledgeHadith::find()
            ->orderBy(['sort_order' => SORT_ASC, 'id' => SORT_DESC])
            ->all();

        return [
            'tags' => $this->serializeTags(),
            'hadiths' => array_map(fn(KnowledgeHadith $hadith) => $this->serializeHadith($hadith), $hadiths),
        ];
    }

    public function actionSaveHadith()
    {
        if ($this->requireSuperAdmin() === null) {
            return Yii::$app->response->data;
        }

        $data = Yii::$app->request->getBodyParams();
        $id = $data['id'] ?? null;
        $hadith = $id ? KnowledgeHadith::findOne($id) : new KnowledgeHadith();

        if (!$hadith) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Hadith not found'];
        }

        $hadith->title = trim((string)($data['title'] ?? ''));
        $hadith->arabic_text = trim((string)($data['arabicText'] ?? ''));
        $hadith->reference_source = trim((string)($data['referenceSource'] ?? ''));
        $hadith->reference_link = trim((string)($data['referenceLink'] ?? ''));
        $hadith->rule_type = trim((string)($data['ruleType'] ?? ''));
        $hadith->is_farz = !empty($data['isFarz']) ? 1 : 0;
        $hadith->status = array_key_exists('status', $data) ? (int)$data['status'] : 1;
        $hadith->sort_order = (int)($data['sortOrder'] ?? 0);

        if (!$hadith->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Unable to save hadith', 'details' => $hadith->getErrors()];
        }

        $translations = is_array($data['translations'] ?? null) ? $data['translations'] : [];
        foreach (self::LANGUAGES as $languageCode) {
            $translation = KnowledgeHadithTranslation::findOne([
                'id_hadith' => $hadith->id,
                'language_code' => $languageCode,
            ]) ?? new KnowledgeHadithTranslation([
                'id_hadith' => $hadith->id,
                'language_code' => $languageCode,
            ]);

            $translation->meaning_text = trim((string)($translations[$languageCode] ?? ''));
            $translation->save(false);
        }

        KnowledgeHadithTag::deleteAll(['id_hadith' => $hadith->id]);
        foreach ((array)($data['tagIds'] ?? []) as $tagId) {
            if (!$tagId) {
                continue;
            }

            $pivot = new KnowledgeHadithTag();
            $pivot->id_hadith = (int)$hadith->id;
            $pivot->id_tag = (int)$tagId;
            $pivot->save(false);
        }

        return [
            'message' => 'Hadith saved successfully.',
            'hadith' => $this->serializeHadith($hadith),
        ];
    }

    public function actionDeleteHadith()
    {
        if ($this->requireSuperAdmin() === null) {
            return Yii::$app->response->data;
        }

        $id = Yii::$app->request->getBodyParam('id');
        $hadith = $id ? KnowledgeHadith::findOne($id) : null;

        if (!$hadith) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Hadith not found'];
        }

        KnowledgeHadithTranslation::deleteAll(['id_hadith' => $hadith->id]);
        KnowledgeHadithTag::deleteAll(['id_hadith' => $hadith->id]);
        $hadith->delete();

        return ['message' => 'Hadith deleted successfully.'];
    }

    public function actionSaveTag()
    {
        if ($this->requireSuperAdmin() === null) {
            return Yii::$app->response->data;
        }

        $data = Yii::$app->request->getBodyParams();
        $id = $data['id'] ?? null;
        $tag = $id ? KnowledgeTag::findOne($id) : new KnowledgeTag();

        if (!$tag) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Tag not found'];
        }

        $tag->code = trim((string)($data['code'] ?? ''));
        $tag->name = trim((string)($data['name'] ?? ''));
        $tag->status = array_key_exists('status', $data) ? (int)$data['status'] : 1;
        $tag->sort_order = (int)($data['sortOrder'] ?? 0);

        if (!$tag->save()) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Unable to save tag', 'details' => $tag->getErrors()];
        }

        return [
            'message' => 'Tag saved successfully.',
            'tag' => $this->serializeTag($tag),
        ];
    }

    private function serializeHadith(KnowledgeHadith $hadith): array
    {
        $translations = KnowledgeHadithTranslation::find()
            ->where(['id_hadith' => $hadith->id])
            ->all();

        $tagRows = (new Query())
            ->select(['t.id', 't.code', 't.name'])
            ->from(['ht' => 'bt_knowledge_hadith_tag'])
            ->innerJoin(['t' => 'bt_knowledge_tag'], 't.id = ht.id_tag')
            ->where(['ht.id_hadith' => $hadith->id])
            ->orderBy(['t.sort_order' => SORT_ASC, 't.id' => SORT_ASC])
            ->all();

        $translationMap = [];
        foreach (self::LANGUAGES as $languageCode) {
            $translationMap[$languageCode] = '';
        }
        foreach ($translations as $translation) {
            $translationMap[$translation->language_code] = $translation->meaning_text ?? '';
        }

        return [
            'id' => (int)$hadith->id,
            'title' => $hadith->title,
            'arabicText' => $hadith->arabic_text,
            'referenceSource' => $hadith->reference_source,
            'referenceLink' => $hadith->reference_link,
            'ruleType' => $hadith->rule_type,
            'isFarz' => (bool)$hadith->is_farz,
            'status' => (int)$hadith->status,
            'sortOrder' => (int)$hadith->sort_order,
            'translations' => $translationMap,
            'tags' => array_map(fn(array $tagRow) => [
                'id' => (int)$tagRow['id'],
                'code' => $tagRow['code'],
                'name' => $tagRow['name'],
            ], $tagRows),
            'tagIds' => array_map(fn(array $tagRow) => (int)$tagRow['id'], $tagRows),
        ];
    }

    private function serializeTags(): array
    {
        $tags = KnowledgeTag::find()
            ->where(['status' => 1])
            ->orderBy(['sort_order' => SORT_ASC, 'id' => SORT_ASC])
            ->all();

        return array_map(fn(KnowledgeTag $tag) => $this->serializeTag($tag), $tags);
    }

    private function serializeTag(KnowledgeTag $tag): array
    {
        return [
            'id' => (int)$tag->id,
            'code' => $tag->code,
            'name' => $tag->name,
            'status' => (int)$tag->status,
            'sortOrder' => (int)$tag->sort_order,
        ];
    }

    private function requireSuperAdmin(): ?Customer
    {
        $authorizationHeader = Yii::$app->request->headers->get('Authorization', '');
        $token = str_replace('Bearer ', '', $authorizationHeader);
        $user = $token ? Customer::find()->where(['authKey' => $token])->one() : null;

        if ($user === null) {
            Yii::$app->response->statusCode = 401;
            Yii::$app->response->data = ['error' => 'Unauthorized user'];
            return null;
        }

        if ((int)$user->id_customer_type !== 1) {
            Yii::$app->response->statusCode = 403;
            Yii::$app->response->data = ['error' => 'Only Super Admin can manage knowledge'];
            return null;
        }

        return $user;
    }
}
