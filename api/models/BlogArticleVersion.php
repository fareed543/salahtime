<?php

namespace app\models;

use yii\db\ActiveRecord;

/**
 * One saved state of a blog article (NF-003). Never updated after insert: every save by the
 * author, every admin proposal and every restore adds a new row.
 *
 * @property int $id
 * @property int $article_id
 * @property int $version_no
 * @property string $source            author | admin_proposal | admin_restore
 * @property string $title
 * @property string $slug
 * @property string $content_html      cleaned by BlogSeo::cleanHtml
 * @property string|null $meta_title
 * @property string|null $meta_description
 * @property string|null $focus_keyword
 * @property string|null $category
 * @property string|null $tags          comma separated
 * @property string|null $language
 * @property string|null $cover_image_url
 * @property string|null $cover_thumb_url
 * @property string|null $cover_alt
 * @property string|null $references_text
 * @property int $seo_score
 * @property int $word_count
 * @property string|null $note          admin's note on a proposal, or the author's change note
 * @property int $created_by
 * @property string $created_at
 */
class BlogArticleVersion extends ActiveRecord
{
    public const SOURCE_AUTHOR = 'author';
    public const SOURCE_ADMIN_PROPOSAL = 'admin_proposal';
    public const SOURCE_ADMIN_RESTORE = 'admin_restore';

    public const CATEGORIES = [
        'salah' => 'Salah',
        'quran' => 'Quran',
        'hadith' => 'Hadith',
        'duas' => 'Duas & dhikr',
        'ramadan' => 'Ramadan & fasting',
        'masjid' => 'Masjid & community',
        'history' => 'Islamic history',
        'family' => 'Family & life',
        'other' => 'Other',
    ];

    /** Fields an author or admin edits; compared field by field for a proposal. */
    public const CONTENT_FIELDS = [
        'title', 'slug', 'content_html', 'meta_title', 'meta_description', 'focus_keyword',
        'category', 'tags', 'language', 'cover_image_url', 'cover_thumb_url', 'cover_alt', 'references_text',
    ];

    /** Slugs that are routes of their own under /blog. */
    public const RESERVED_SLUGS = ['write', 'my-articles', 'author', 'category', 'page'];

    public static function tableName()
    {
        return '{{%blog_article_version}}';
    }

    public function rules()
    {
        return [
            [['title', 'slug', 'content_html'], 'required'],
            [['title', 'slug', 'meta_title', 'meta_description', 'focus_keyword', 'tags', 'cover_alt', 'references_text', 'note'], 'trim'],
            ['title', 'string', 'min' => 5, 'max' => 190],
            ['slug', 'string', 'max' => 190],
            ['slug', 'match', 'pattern' => '/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'message' => 'Slug may use only lowercase letters, numbers and dashes.'],
            ['slug', 'in', 'range' => self::RESERVED_SLUGS, 'not' => true, 'message' => 'This slug is reserved. Please choose another.'],
            ['content_html', 'string', 'max' => 200000],
            ['meta_title', 'string', 'max' => 120],
            ['meta_description', 'string', 'max' => 300],
            ['focus_keyword', 'string', 'max' => 100],
            ['category', 'in', 'range' => array_keys(self::CATEGORIES)],
            ['tags', 'string', 'max' => 300],
            ['language', 'string', 'max' => 10],
            [['cover_image_url', 'cover_thumb_url'], 'string', 'max' => 500],
            ['cover_alt', 'string', 'max' => 190],
            ['references_text', 'string', 'max' => 5000],
            ['note', 'string', 'max' => 2000],
        ];
    }

    /** @return string[] */
    public function tagList(): array
    {
        return array_values(array_filter(array_map('trim', explode(',', (string)$this->tags)), 'strlen'));
    }

    public function getCategoryLabel(): ?string
    {
        return $this->category ? (self::CATEGORIES[$this->category] ?? $this->category) : null;
    }

    /** Minutes to read at about 200 words a minute; never less than 1. */
    public function readingMinutes(): int
    {
        return max(1, (int)round($this->word_count / 200));
    }

    /** Values of the editable fields, for comparing two versions. */
    public function contentValues(): array
    {
        $values = [];
        foreach (self::CONTENT_FIELDS as $field) {
            $values[$field] = $this->$field === null ? '' : (string)$this->$field;
        }
        return $values;
    }
}
