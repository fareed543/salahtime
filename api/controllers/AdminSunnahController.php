<?php

namespace app\controllers;

use app\components\BackofficeAccess;
use app\components\SunnahShorts;
use app\models\Customer;
use app\models\SunnahCard;
use app\models\SunnahCardReference;
use app\models\SunnahCategory;
use app\models\SunnahLike;
use app\models\SunnahReferenceBook;
use Yii;
use yii\web\Controller;
use yii\web\Response;
use yii\web\UploadedFile;

/**
 * Sunnah Shorts (NF-015), back office side.
 *
 *   GET  admin-sunnah/options                 templates, languages, limits, categories (+ card counts), books
 *   GET  admin-sunnah/cards                   list (categoryId?, status?, search?)
 *   GET  admin-sunnah/card/{id}               one card
 *   POST admin-sunnah/save-card               { id?, categoryId, headline, body, zikr?, template, imageUrl?, thumbUrl?, sourcePage?, references: [{bookId, number}] }
 *   POST admin-sunnah/publish/{id}            { published: bool }
 *   POST admin-sunnah/delete-card/{id}
 *   POST admin-sunnah/reorder-cards           { ids: [...] } order inside one category
 *   POST admin-sunnah/save-category           { id?, name: {en, ...}, active }
 *   POST admin-sunnah/delete-category/{id}    only when it has no cards
 *   POST admin-sunnah/reorder-categories      { ids: [...] }
 *   POST admin-sunnah/save-book               { id?, name, active }
 *   POST admin-sunnah/image                   multipart "image" (already cropped 9:16) -> { imageUrl, thumbUrl }
 *
 * Access: administrator or manager.
 */
class AdminSunnahController extends Controller
{
    private const ALLOWED_ROLES = ['administrator', 'manager'];

    /** @var Customer */
    private $admin;

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
        if (Yii::$app->request->isOptions) {
            return true;
        }
        $admin = $this->requireAdmin();
        if (!$admin instanceof Customer) {
            Yii::$app->response->data = $admin;
            return false;
        }
        $this->admin = $admin;
        if ($action->id !== 'options' && !in_array($action->id, ['cards', 'card'], true) && !Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            Yii::$app->response->data = ['error' => 'Use POST.'];
            return false;
        }
        return true;
    }

    public function actionOptions()
    {
        $counts = SunnahCard::find()->select(['COUNT(*)', 'category_id'])->groupBy('category_id')->indexBy('category_id')->column();
        return [
            'templates' => array_map(static function ($key, $name) {
                return ['key' => $key, 'name' => $name];
            }, array_keys(SunnahShorts::TEMPLATES), SunnahShorts::TEMPLATES),
            'languages' => SunnahShorts::LANGUAGES,
            'limits' => [
                'headline' => SunnahShorts::HEADLINE_MAX,
                'body' => SunnahShorts::BODY_MAX,
                'category' => SunnahShorts::CATEGORY_MAX,
            ],
            'categories' => array_map(static function (SunnahCategory $category) use ($counts) {
                return SunnahShorts::categoryJson($category, (int)($counts[$category->id] ?? 0));
            }, SunnahCategory::find()->orderBy(['sort_order' => SORT_ASC, 'id' => SORT_ASC])->all()),
            'books' => array_map([SunnahShorts::class, 'bookJson'], SunnahReferenceBook::find()->orderBy(['sort_order' => SORT_ASC, 'name' => SORT_ASC])->all()),
        ];
    }

    public function actionCards()
    {
        $request = Yii::$app->request;
        $query = SunnahCard::find()->with(['references.book'])->orderBy(['category_id' => SORT_ASC, 'sort_order' => SORT_ASC, 'id' => SORT_ASC]);
        if ($request->get('categoryId')) {
            $query->andWhere(['category_id' => (int)$request->get('categoryId')]);
        }
        if (in_array($request->get('status'), [SunnahCard::STATUS_DRAFT, SunnahCard::STATUS_PUBLISHED], true)) {
            $query->andWhere(['status' => $request->get('status')]);
        }
        $search = trim((string)$request->get('search', ''));
        if ($search !== '') {
            $query->andWhere(['or', ['like', 'headline', $search], ['like', 'body', $search], ['like', 'slug', $search]]);
        }
        return ['cards' => array_map(static function (SunnahCard $card) {
            return SunnahShorts::cardJson($card, true);
        }, $query->all())];
    }

    public function actionCard($id)
    {
        $card = SunnahCard::find()->where(['id' => (int)$id])->with(['references.book'])->one();
        if (!$card) {
            return $this->fail(404, 'Card not found.');
        }
        return ['card' => SunnahShorts::cardJson($card, true)];
    }

    public function actionSaveCard()
    {
        $data = $this->body();
        $id = (int)($data['id'] ?? 0);
        $card = $id ? SunnahCard::findOne($id) : new SunnahCard();
        if (!$card) {
            return $this->fail(404, 'Card not found.');
        }

        $category = SunnahCategory::findOne((int)($data['categoryId'] ?? 0));
        if (!$category) {
            return $this->fail(422, 'Choose a category.');
        }
        [$headline, $error] = SunnahShorts::cleanTexts($data['headline'] ?? null, 'Headline', SunnahShorts::HEADLINE_MAX, true, true);
        if ($error) {
            return $this->fail(422, $error);
        }
        [$body, $error] = SunnahShorts::cleanTexts($data['body'] ?? null, 'Sunnah text', SunnahShorts::BODY_MAX);
        if ($error) {
            return $this->fail(422, $error);
        }
        [$zikr, $error] = SunnahShorts::cleanZikr($data['zikr'] ?? null);
        if ($error) {
            return $this->fail(422, $error);
        }
        $template = (string)($data['template'] ?? 't01');
        if (!isset(SunnahShorts::TEMPLATES[$template])) {
            return $this->fail(422, 'Choose a template.');
        }
        $imageUrl = $data['imageUrl'] ?? null;
        $thumbUrl = $data['thumbUrl'] ?? null;
        if ($imageUrl && (!SunnahShorts::imagePath($imageUrl) || !SunnahShorts::imagePath($thumbUrl))) {
            return $this->fail(422, 'Upload the photo again.');
        }

        $references = [];
        foreach ((array)($data['references'] ?? []) as $reference) {
            $number = trim((string)($reference['number'] ?? ''));
            $bookId = (int)($reference['bookId'] ?? 0);
            if ($number === '' && !$bookId) {
                continue;
            }
            if (!$bookId || !SunnahReferenceBook::find()->where(['id' => $bookId])->exists()) {
                return $this->fail(422, 'Choose the book for every reference.');
            }
            if ($number === '' || mb_strlen($number) > 40) {
                return $this->fail(422, 'Enter the reference number (up to 40 characters).');
            }
            $references[] = ['bookId' => $bookId, 'number' => $number];
        }
        if (!$references) {
            return $this->fail(422, 'Add at least one reference.');
        }

        $oldImage = $card->image_url;
        $oldThumb = $card->thumb_url;
        $isNew = $card->isNewRecord;
        // The slug follows the headline until the card is first published; after that shared links must keep working.
        if ($isNew || !$card->published_at) {
            $card->slug = SunnahShorts::uniqueSlug($headline['en'], $isNew ? null : (int)$card->id);
        }
        if ($isNew || (int)$card->category_id !== (int)$category->id) {
            $card->sort_order = (int)SunnahCard::find()->where(['category_id' => $category->id])->max('sort_order') + 1;
        }
        $card->category_id = (int)$category->id;
        $card->headline = SunnahShorts::encode((object)$headline);
        $card->body = SunnahShorts::encode((object)$body);
        $card->zikr = $zikr ? SunnahShorts::encode($zikr) : null;
        $card->template = $template;
        $card->image_url = $imageUrl ?: null;
        $card->thumb_url = $imageUrl ? $thumbUrl : null;
        $card->source_page = mb_substr(trim((string)($data['sourcePage'] ?? '')), 0, 100) ?: null;
        $card->updated_by = (int)$this->admin->id;
        $card->updated_at = date('Y-m-d H:i:s');
        if ($isNew) {
            $card->status = SunnahCard::STATUS_DRAFT;
            $card->created_by = (int)$this->admin->id;
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            $card->save(false);
            SunnahCardReference::deleteAll(['card_id' => $card->id]);
            foreach ($references as $index => $reference) {
                $row = new SunnahCardReference();
                $row->card_id = (int)$card->id;
                $row->book_id = $reference['bookId'];
                $row->number = $reference['number'];
                $row->sort_order = $index;
                $row->save(false);
            }
            $transaction->commit();
        } catch (\Throwable $e) {
            $transaction->rollBack();
            Yii::error('Sunnah card save failed: ' . $e->getMessage(), __METHOD__);
            return $this->fail(500, 'The card could not be saved.');
        }

        if ($oldImage && $oldImage !== $card->image_url) {
            SunnahShorts::deleteImage($oldImage);
            SunnahShorts::deleteImage($oldThumb);
        }
        SunnahShorts::clearCache();
        $card->refresh();
        return ['card' => SunnahShorts::cardJson($card, true)];
    }

    public function actionPublish($id)
    {
        $card = SunnahCard::findOne((int)$id);
        if (!$card) {
            return $this->fail(404, 'Card not found.');
        }
        $publish = filter_var($this->body()['published'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $card->status = $publish ? SunnahCard::STATUS_PUBLISHED : SunnahCard::STATUS_DRAFT;
        if ($publish && !$card->published_at) {
            $card->published_at = date('Y-m-d H:i:s');
        }
        $card->updated_by = (int)$this->admin->id;
        $card->updated_at = date('Y-m-d H:i:s');
        $card->save(false);
        SunnahShorts::clearCache();
        return ['card' => SunnahShorts::cardJson($card, true)];
    }

    public function actionDeleteCard($id)
    {
        $card = SunnahCard::findOne((int)$id);
        if (!$card) {
            return $this->fail(404, 'Card not found.');
        }
        $transaction = Yii::$app->db->beginTransaction();
        try {
            SunnahCardReference::deleteAll(['card_id' => $card->id]);
            SunnahLike::deleteAll(['card_id' => $card->id]);
            $card->delete();
            $transaction->commit();
        } catch (\Throwable $e) {
            $transaction->rollBack();
            Yii::error('Sunnah card delete failed: ' . $e->getMessage(), __METHOD__);
            return $this->fail(500, 'The card could not be deleted.');
        }
        SunnahShorts::deleteImage($card->image_url);
        SunnahShorts::deleteImage($card->thumb_url);
        SunnahShorts::clearCache();
        return ['deleted' => true];
    }

    public function actionReorderCards()
    {
        $ids = array_values(array_filter(array_map('intval', (array)($this->body()['ids'] ?? []))));
        foreach ($ids as $index => $cardId) {
            SunnahCard::updateAll(['sort_order' => $index + 1], ['id' => $cardId]);
        }
        SunnahShorts::clearCache();
        return ['saved' => count($ids)];
    }

    public function actionSaveCategory()
    {
        $data = $this->body();
        $id = (int)($data['id'] ?? 0);
        $category = $id ? SunnahCategory::findOne($id) : new SunnahCategory();
        if (!$category) {
            return $this->fail(404, 'Category not found.');
        }
        [$name, $error] = SunnahShorts::cleanTexts($data['name'] ?? null, 'Category name', SunnahShorts::CATEGORY_MAX);
        if ($error) {
            return $this->fail(422, $error);
        }
        if ($category->isNewRecord) {
            $category->sort_order = (int)SunnahCategory::find()->max('sort_order') + 1;
        }
        $category->name = SunnahShorts::encode((object)$name);
        $category->active = array_key_exists('active', $data) ? (int)filter_var($data['active'], FILTER_VALIDATE_BOOLEAN) : 1;
        $category->updated_at = date('Y-m-d H:i:s');
        $category->save(false);
        SunnahShorts::clearCache();
        return ['category' => SunnahShorts::categoryJson($category)];
    }

    public function actionDeleteCategory($id)
    {
        $category = SunnahCategory::findOne((int)$id);
        if (!$category) {
            return $this->fail(404, 'Category not found.');
        }
        if (SunnahCard::find()->where(['category_id' => $category->id])->exists()) {
            return $this->fail(422, 'Move or delete the cards in this category first.');
        }
        $category->delete();
        SunnahShorts::clearCache();
        return ['deleted' => true];
    }

    public function actionReorderCategories()
    {
        $ids = array_values(array_filter(array_map('intval', (array)($this->body()['ids'] ?? []))));
        foreach ($ids as $index => $categoryId) {
            SunnahCategory::updateAll(['sort_order' => $index + 1], ['id' => $categoryId]);
        }
        SunnahShorts::clearCache();
        return ['saved' => count($ids)];
    }

    public function actionSaveBook()
    {
        $data = $this->body();
        $id = (int)($data['id'] ?? 0);
        $book = $id ? SunnahReferenceBook::findOne($id) : new SunnahReferenceBook();
        if (!$book) {
            return $this->fail(404, 'Book not found.');
        }
        $name = trim(preg_replace('/\s+/u', ' ', (string)($data['name'] ?? '')));
        if ($name === '' || mb_strlen($name) > 80) {
            return $this->fail(422, 'Enter the book name (up to 80 characters).');
        }
        $duplicate = SunnahReferenceBook::find()->where(['name' => $name]);
        if (!$book->isNewRecord) {
            $duplicate->andWhere(['<>', 'id', $book->id]);
        }
        if ($duplicate->exists()) {
            return $this->fail(422, 'This book is already in the list.');
        }
        if ($book->isNewRecord) {
            $book->sort_order = (int)SunnahReferenceBook::find()->max('sort_order') + 1;
        }
        $book->name = $name;
        $book->active = array_key_exists('active', $data) ? (int)filter_var($data['active'], FILTER_VALIDATE_BOOLEAN) : 1;
        $book->save(false);
        SunnahShorts::clearCache();
        return ['book' => SunnahShorts::bookJson($book)];
    }

    public function actionImage()
    {
        $file = UploadedFile::getInstanceByName('image');
        $error = SunnahShorts::validateImage($file);
        if ($error !== null) {
            return $this->fail(422, $error);
        }
        try {
            $saved = SunnahShorts::saveImage($file);
        } catch (\Throwable $e) {
            Yii::error('Sunnah image save failed: ' . $e->getMessage(), __METHOD__);
            return $this->fail(500, 'We could not save the image. Please try another one.');
        }
        return ['imageUrl' => $saved['image_url'], 'thumbUrl' => $saved['thumb_url']];
    }

    // ------------------------------------------------------------------ helpers

    private function fail(int $status, string $message): array
    {
        Yii::$app->response->statusCode = $status;
        return ['error' => $message];
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
