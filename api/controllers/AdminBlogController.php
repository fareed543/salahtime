<?php

namespace app\controllers;

use app\components\BackofficeAccess;
use app\components\BlogMailer;
use app\components\BlogWorkflow;
use app\models\BlogArticle;
use app\models\BlogArticleEvent;
use app\models\BlogArticleVersion;
use app\models\Customer;
use Yii;
use yii\web\Controller;
use yii\web\Response;

/**
 * Blog review, back office side (NF-003).
 *
 *   GET  admin-blog/options             categories and statuses
 *   GET  admin-blog/articles            list (search, status, page, perPage) + counts per status
 *   GET  admin-blog/article/{id}        latest / live / proposal versions, versions, timeline, author
 *   GET  admin-blog/version/{id}        one version with its content (preview, compare)
 *   POST admin-blog/approve/{id}        publish the author's latest version
 *   POST admin-blog/reject/{id}         { reason } (required)
 *   POST admin-blog/propose/{id}        { title?, contentHtml?, metaTitle?, ..., note? } changes for the author to accept
 *   POST admin-blog/unpublish/{id}      { reason? } take the article off the site
 *   POST admin-blog/restore/{id}        { versionId } make an older version live again
 *
 * Access: administrator or manager.
 */
class AdminBlogController extends Controller
{
    private const ALLOWED_ROLES = ['administrator', 'manager'];

    /** Status tabs: "unpublished" is a published article taken off the site. */
    private const FILTERS = ['submitted', 'changes_proposed', 'published', 'unpublished', 'rejected', 'draft'];

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
        return true;
    }

    public function actionOptions()
    {
        $statuses = [];
        foreach (BlogArticle::STATUSES as $value => $label) {
            $statuses[] = ['value' => $value, 'label' => $label];
        }
        return [
            'categories' => BlogWorkflow::categoryOptions(),
            'statuses' => $statuses,
            'actions' => BlogArticleEvent::ACTIONS,
        ];
    }

    public function actionArticles()
    {
        $request = Yii::$app->request;
        $query = BlogArticle::find()->alias('a')
            ->innerJoin(BlogArticleVersion::tableName() . ' v', 'v.id = a.latest_version_id')
            ->with(['latestVersion', 'author']);

        $search = trim((string)$request->get('search', ''));
        if ($search !== '') {
            $authorIds = Customer::find()->select('id')->where(['or',
                ['like', 'firstname', $search], ['like', 'lastname', $search], ['like', 'email', $search],
            ])->column();
            $query->andWhere(['or', ['like', 'v.title', $search], ['like', 'v.tags', $search], ['a.author_id' => $authorIds ?: [0]]]);
        }

        $counts = array_fill_keys(self::FILTERS, 0);
        foreach ((clone $query)->select(['a.status', 'a.is_public', 'total' => 'COUNT(*)'])->groupBy(['a.status', 'a.is_public'])->asArray()->all() as $row) {
            $key = $row['status'] === BlogArticle::STATUS_PUBLISHED && !(int)$row['is_public'] ? 'unpublished' : $row['status'];
            $counts[$key] = ($counts[$key] ?? 0) + (int)$row['total'];
        }

        $status = trim((string)$request->get('status', ''));
        if ($status === 'unpublished') {
            $query->andWhere(['a.status' => BlogArticle::STATUS_PUBLISHED, 'a.is_public' => 0]);
        } elseif ($status === 'published') {
            $query->andWhere(['a.status' => BlogArticle::STATUS_PUBLISHED, 'a.is_public' => 1]);
        } elseif (in_array($status, self::FILTERS, true)) {
            $query->andWhere(['a.status' => $status]);
        }

        $page = max(1, (int)$request->get('page', 1));
        $perPage = max(1, min(100, (int)$request->get('perPage', 20)));
        $total = (int)(clone $query)->count();
        // Waiting items oldest first (fair queue); everything else newest first.
        $order = in_array($status, ['submitted', 'changes_proposed'], true)
            ? ['a.submitted_at' => SORT_ASC, 'a.id' => SORT_ASC]
            : ['a.updated_at' => SORT_DESC, 'a.id' => SORT_DESC];
        $articles = $query->orderBy($order)->offset(($page - 1) * $perPage)->limit($perPage)->all();

        return [
            'items' => array_map(function (BlogArticle $article) {
                return $this->row($article);
            }, $articles),
            'summary' => ['statusCounts' => $counts, 'waiting' => $counts['submitted'] + $counts['changes_proposed']],
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => max(1, (int)ceil($total / $perPage)),
            ],
        ];
    }

    public function actionArticle($id)
    {
        $article = $this->findArticle($id);
        return $article instanceof BlogArticle ? $this->detail($article) : $article;
    }

    public function actionVersion($id)
    {
        $version = BlogArticleVersion::findOne((int)$id);
        if (!$version) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Version not found.'];
        }
        return BlogWorkflow::versionDetail($version);
    }

    public function actionApprove($id)
    {
        $article = $this->findArticle($id);
        if (!$article instanceof BlogArticle) {
            return $article;
        }
        if (!in_array($article->status, [BlogArticle::STATUS_SUBMITTED, BlogArticle::STATUS_CHANGES_PROPOSED], true)
            && !($article->status === BlogArticle::STATUS_PUBLISHED && !(int)$article->is_public)) {
            Yii::$app->response->statusCode = 409;
            return ['error' => 'Only articles waiting for review (or unpublished ones) can be published.'];
        }
        $note = $this->text('note');
        $error = BlogWorkflow::publish($article, $article->latestVersion, $this->admin, 'published', 'admin', $note);
        if ($error) {
            Yii::$app->response->statusCode = 409;
            return ['error' => $error];
        }
        $article->refresh();
        return $this->detail($article) + ['message' => 'Published. The author has been notified.'];
    }

    public function actionReject($id)
    {
        $article = $this->findArticle($id);
        if (!$article instanceof BlogArticle) {
            return $article;
        }
        if (!in_array($article->status, [BlogArticle::STATUS_SUBMITTED, BlogArticle::STATUS_CHANGES_PROPOSED], true)) {
            Yii::$app->response->statusCode = 409;
            return ['error' => 'Only articles waiting for review can be rejected.'];
        }
        $reason = $this->text('reason');
        if ($reason === null || mb_strlen($reason) < 10) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Please give the author a reason (at least 10 characters).', 'errors' => ['reason' => 'Reason is required.']];
        }

        $from = $article->status;
        $article->status = BlogArticle::STATUS_REJECTED;
        $article->reject_reason = mb_substr($reason, 0, 2000);
        $article->proposal_version_id = null;
        $article->reviewed_by = (int)$this->admin->id;
        BlogWorkflow::touch($article);
        BlogArticleEvent::log($article, 'rejected', $from, (int)$this->admin->id, 'admin', (int)$article->latest_version_id, $reason);
        BlogMailer::notifyAuthorRejected($article, $article->latestVersion, $article->author, $reason);

        $article->refresh();
        return $this->detail($article) + ['message' => 'Rejected. The author has been told why.'];
    }

    public function actionPropose($id)
    {
        $article = $this->findArticle($id);
        if (!$article instanceof BlogArticle) {
            return $article;
        }
        if (!in_array($article->status, [BlogArticle::STATUS_SUBMITTED, BlogArticle::STATUS_CHANGES_PROPOSED], true)) {
            Yii::$app->response->statusCode = 409;
            return ['error' => 'Changes can be proposed only while an article is waiting for review.'];
        }

        $base = $article->latestVersion;
        [$proposal, $errors] = BlogWorkflow::buildVersion($article, $base, $this->body(), BlogArticleVersion::SOURCE_ADMIN_PROPOSAL, (int)$this->admin->id);
        if ($errors) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Please check the changes.', 'errors' => $errors];
        }
        if (BlogWorkflow::sameContent($base, $proposal)) {
            Yii::$app->response->statusCode = 422;
            return ['error' => 'Nothing was changed. Edit at least one field, or publish the article as it is.'];
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            BlogWorkflow::saveVersion($article, $proposal);
            $from = $article->status;
            $article->status = BlogArticle::STATUS_CHANGES_PROPOSED;
            $article->proposal_version_id = (int)$proposal->id;
            $article->reviewed_by = (int)$this->admin->id;
            BlogWorkflow::touch($article);
            BlogArticleEvent::log($article, 'proposed', $from, (int)$this->admin->id, 'admin', (int)$proposal->id, $proposal->note);
            $transaction->commit();
        } catch (\Throwable $error) {
            $transaction->rollBack();
            Yii::error('Blog proposal failed: ' . $error->getMessage(), __METHOD__);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Could not save the proposed changes.'];
        }
        BlogMailer::notifyAuthorProposal($article, $proposal, $article->author);

        $article->refresh();
        return $this->detail($article) + ['message' => 'Changes sent to the author for approval.'];
    }

    public function actionUnpublish($id)
    {
        $article = $this->findArticle($id);
        if (!$article instanceof BlogArticle) {
            return $article;
        }
        if (!(int)$article->is_public) {
            Yii::$app->response->statusCode = 409;
            return ['error' => 'This article is not on the site.'];
        }
        $article->is_public = 0;
        BlogWorkflow::touch($article);
        BlogArticleEvent::log($article, 'unpublished', $article->status, (int)$this->admin->id, 'admin', (int)$article->live_version_id, $this->text('reason'));

        $article->refresh();
        return $this->detail($article) + ['message' => 'Unpublished. It is no longer on the site.'];
    }

    public function actionRestore($id)
    {
        $article = $this->findArticle($id);
        if (!$article instanceof BlogArticle) {
            return $article;
        }
        if (!in_array($article->status, [BlogArticle::STATUS_PUBLISHED, BlogArticle::STATUS_SUBMITTED, BlogArticle::STATUS_REJECTED, BlogArticle::STATUS_DRAFT], true)) {
            Yii::$app->response->statusCode = 409;
            return ['error' => 'Answer or withdraw the proposed changes before restoring a version.'];
        }
        $body = $this->body();
        $old = BlogArticleVersion::find()->where(['id' => (int)($body['versionId'] ?? 0), 'article_id' => $article->id])->one();
        if (!$old) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Version not found.'];
        }

        // A restore is a new version (a copy), so the history keeps every step.
        [$copy, $errors] = BlogWorkflow::buildVersion($article, $old, ['note' => 'Restored from v' . $old->version_no], BlogArticleVersion::SOURCE_ADMIN_RESTORE, (int)$this->admin->id);
        if ($errors) {
            Yii::$app->response->statusCode = 422;
            return ['error' => reset($errors), 'errors' => $errors];
        }
        $transaction = Yii::$app->db->beginTransaction();
        try {
            BlogWorkflow::saveVersion($article, $copy);
            $error = BlogWorkflow::publish($article, $copy, $this->admin, 'restored', 'admin', 'Restored v' . $old->version_no);
            if ($error) {
                $transaction->rollBack();
                Yii::$app->response->statusCode = 409;
                return ['error' => $error];
            }
            $transaction->commit();
        } catch (\Throwable $error) {
            $transaction->rollBack();
            Yii::error('Blog restore failed: ' . $error->getMessage(), __METHOD__);
            Yii::$app->response->statusCode = 500;
            return ['error' => 'Could not restore the version.'];
        }

        $article->refresh();
        return $this->detail($article) + ['message' => sprintf('Version %d restored and live.', $old->version_no)];
    }

    // ------------------------------------------------------------------ helpers

    private function row(BlogArticle $article): array
    {
        $version = $article->latestVersion;
        return [
            'id' => (int)$article->id,
            'title' => $version ? $version->title : '',
            'status' => $article->status,
            'statusLabel' => $article->getStatusLabel(),
            'isPublic' => (int)$article->is_public === 1,
            'path' => $article->slug ? '/blog/' . $article->slug : null,
            'category' => $version ? $version->category : null,
            'categoryLabel' => $version ? $version->getCategoryLabel() : null,
            'seoScore' => $version ? (int)$version->seo_score : 0,
            'wordCount' => $version ? (int)$version->word_count : 0,
            'versionNo' => $version ? (int)$version->version_no : 0,
            'views' => (int)$article->views,
            'author' => BlogWorkflow::authorSummary($article->author),
            'submittedAt' => $article->submitted_at,
            'publishedAt' => $article->published_at,
            'updatedAt' => $article->updated_at,
        ];
    }

    private function detail(BlogArticle $article): array
    {
        $latest = $article->latestVersion;
        $live = $article->liveVersion;
        $proposal = $article->proposalVersion;
        $author = $article->author;
        $reviewer = $article->reviewed_by ? Customer::findOne($article->reviewed_by) : null;

        return [
            'article' => $this->row($article) + [
                'rejectReason' => $article->reject_reason,
                'reviewedBy' => $reviewer ? BlogArticle::authorName($reviewer) : null,
                'liveVersionId' => $article->live_version_id ? (int)$article->live_version_id : null,
                'latestVersionId' => (int)$article->latest_version_id,
                'proposalVersionId' => $article->proposal_version_id ? (int)$article->proposal_version_id : null,
            ],
            'author' => BlogWorkflow::authorSummary($author) + [
                'email' => $author ? $author->email : null,
                'phone' => $author ? $author->phone : null,
                'articleCount' => (int)BlogArticle::find()->where(['author_id' => $article->author_id])->count(),
                'publishedCount' => (int)BlogArticle::find()->where(['author_id' => $article->author_id, 'is_public' => 1])->count(),
            ],
            'latest' => BlogWorkflow::versionDetail($latest),
            'live' => $live && (int)$live->id !== (int)$latest->id ? BlogWorkflow::versionDetail($live) : null,
            // What changes compared with the live version, when the author edited a published article.
            'changesFromLive' => $live && (int)$live->id !== (int)$latest->id ? BlogWorkflow::diff($live, $latest) : [],
            'proposal' => $proposal ? [
                'version' => BlogWorkflow::versionDetail($proposal),
                'changes' => BlogWorkflow::diff($latest, $proposal),
            ] : null,
            'versions' => BlogWorkflow::versionList($article),
            'timeline' => BlogWorkflow::timeline($article, true),
        ];
    }

    private function findArticle($id)
    {
        $article = BlogArticle::findOne((int)$id);
        if (!$article || !$article->latestVersion) {
            Yii::$app->response->statusCode = 404;
            return ['error' => 'Article not found.'];
        }
        return $article;
    }

    private function text(string $key): ?string
    {
        $value = trim((string)($this->body()[$key] ?? ''));
        return $value === '' ? null : $value;
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
