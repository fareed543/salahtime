<?php

namespace app\components;

use app\models\SunnahCard;
use app\models\SunnahCardReference;
use app\models\SunnahCategory;
use app\models\SunnahReferenceBook;
use Intervention\Image\ImageManagerStatic as Image;
use Yii;
use yii\web\UploadedFile;

/**
 * NF-015 Sunnah Shorts: validation, slugs and the JSON shape shared by the public and the
 * back-office controllers.
 *
 * Multi-language values are objects keyed by the app's language codes; English is required
 * (the app falls back to it), every other language is optional.
 */
class SunnahShorts
{
    /** Card templates designed for NF-015 (WorkStation NF-015_templates.png). */
    public const TEMPLATES = [
        't01' => 'Classic',
        't02' => 'Cream Paper',
        't03' => 'Ink',
        't04' => 'Emerald',
        't05' => 'Gold Frame',
        't06' => 'Split Red',
        't07' => 'Masjid Skyline',
        't08' => 'Night',
        't09' => 'Desert Sand',
        't10' => 'Marker',
    ];

    /** Same codes as frontend/src/assets/i18n/*.json. */
    public const LANGUAGES = ['en', 'ar', 'es', 'fr', 'hi', 'hi-latn', 'id', 'ms', 'ta', 'te', 'te-latn', 'tr', 'ur'];

    public const HEADLINE_MAX = 40;
    public const BODY_MAX = 400;
    public const CATEGORY_MAX = 60;
    public const ZIKR_ARABIC_MAX = 300;
    public const ZIKR_TEXT_MAX = 400;

    private const CACHE_KEY = 'nf015-sunnah-shorts-public-list';

    // ------------------------------------------------------------------ input

    /**
     * Cleans a {lang: text} value. Returns [value, error]. Unknown languages and empty strings are
     * dropped; English is required when $required. Headline length is counted without the *marks*.
     */
    public static function cleanTexts($value, string $label, int $max, bool $required = true, bool $headline = false): array
    {
        $clean = [];
        if (is_array($value)) {
            foreach (self::LANGUAGES as $lang) {
                $text = trim(preg_replace('/\s+/u', ' ', (string)($value[$lang] ?? '')));
                if ($text === '') {
                    continue;
                }
                $length = mb_strlen($headline ? self::plain($text) : $text);
                if ($length > $max) {
                    return [null, sprintf('%s (%s) is too long: %d characters, maximum %d.', $label, $lang, $length, $max)];
                }
                $clean[$lang] = $text;
            }
        }
        if ($required && !isset($clean['en'])) {
            return [null, $label . ' in English is required.'];
        }
        return [$clean, null];
    }

    /** Zikr: optional; when given, Arabic is required. Returns [value|null, error]. */
    public static function cleanZikr($value): array
    {
        if (!is_array($value)) {
            return [null, null];
        }
        $arabic = trim((string)($value['arabic'] ?? ''));
        $transliteration = trim((string)($value['transliteration'] ?? ''));
        [$meaning, $error] = self::cleanTexts($value['meaning'] ?? [], 'Zikr meaning', self::ZIKR_TEXT_MAX, false);
        if ($error) {
            return [null, $error];
        }
        if ($arabic === '' && $transliteration === '' && !$meaning) {
            return [null, null];
        }
        if ($arabic === '') {
            return [null, 'Zikr needs the Arabic text.'];
        }
        if (mb_strlen($arabic) > self::ZIKR_ARABIC_MAX || mb_strlen($transliteration) > self::ZIKR_TEXT_MAX) {
            return [null, 'Zikr text is too long.'];
        }
        return [['arabic' => $arabic, 'transliteration' => $transliteration, 'meaning' => (object)$meaning], null];
    }

    /** Headline without the *accent* marks. */
    public static function plain(string $text): string
    {
        return trim(str_replace('*', '', $text));
    }

    public static function decode(?string $json): array
    {
        $value = $json ? json_decode($json, true) : null;
        return is_array($value) ? $value : [];
    }

    public static function encode($value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /** Unique URL slug from the English headline, e.g. "4-before-zuhr-2-after". */
    public static function uniqueSlug(string $headline, ?int $exceptId = null): string
    {
        $base = strtolower(self::plain($headline));
        $base = preg_replace('/[^a-z0-9]+/', '-', $base);
        $base = trim(substr(trim($base, '-'), 0, 80), '-');
        if ($base === '') {
            $base = 'sunnah';
        }
        $slug = $base;
        for ($n = 2; ; $n++) {
            $query = SunnahCard::find()->where(['slug' => $slug]);
            if ($exceptId) {
                $query->andWhere(['<>', 'id', $exceptId]);
            }
            if (!$query->exists()) {
                return $slug;
            }
            $slug = $base . '-' . $n;
        }
    }

    // ------------------------------------------------------------------ output

    public static function categoryJson(SunnahCategory $category, ?int $cardCount = null): array
    {
        $json = [
            'id' => (int)$category->id,
            'name' => (object)self::decode($category->name),
            'sortOrder' => (int)$category->sort_order,
            'active' => (bool)$category->active,
        ];
        if ($cardCount !== null) {
            $json['cardCount'] = $cardCount;
        }
        return $json;
    }

    public static function bookJson(SunnahReferenceBook $book): array
    {
        return ['id' => (int)$book->id, 'name' => $book->name, 'sortOrder' => (int)$book->sort_order, 'active' => (bool)$book->active];
    }

    /** Card for the app; $admin adds the fields only the back office needs. */
    public static function cardJson(SunnahCard $card, bool $admin = false): array
    {
        $zikr = self::decode($card->zikr);
        $json = [
            'id' => (int)$card->id,
            'slug' => $card->slug,
            'categoryId' => (int)$card->category_id,
            'headline' => (object)self::decode($card->headline),
            'body' => (object)self::decode($card->body),
            'zikr' => $zikr ? ['arabic' => $zikr['arabic'] ?? '', 'transliteration' => $zikr['transliteration'] ?? '', 'meaning' => (object)($zikr['meaning'] ?? [])] : null,
            'template' => $card->template,
            'imageUrl' => $card->image_url,
            'thumbUrl' => $card->thumb_url,
            'references' => array_map(static function (SunnahCardReference $reference) use ($admin) {
                $item = ['book' => $reference->book ? $reference->book->name : '', 'number' => $reference->number];
                if ($admin) {
                    $item['bookId'] = (int)$reference->book_id;
                }
                return $item;
            }, $card->references),
            'likes' => (int)$card->likes,
        ];
        if ($admin) {
            $json += [
                'status' => $card->status,
                'sortOrder' => (int)$card->sort_order,
                'sourcePage' => $card->source_page,
                'publishedAt' => $card->published_at,
                'updatedAt' => $card->updated_at,
            ];
        }
        return $json;
    }

    /**
     * Everything the app shows: active categories that have published cards, and those cards.
     * The content is cached; like counts are read fresh (one small query) so likes need no cache clear.
     */
    public static function publicList(): array
    {
        $list = self::cachedContent();
        $likes = SunnahCard::find()->select(['likes', 'id'])->where(['status' => SunnahCard::STATUS_PUBLISHED])->indexBy('id')->column();
        foreach ($list['cards'] as &$card) {
            $card['likes'] = (int)($likes[$card['id']] ?? $card['likes']);
        }
        unset($card);
        return $list;
    }

    private static function cachedContent(): array
    {
        return Yii::$app->cache->getOrSet(self::CACHE_KEY, static function () {
            $categories = SunnahCategory::find()->where(['active' => 1])->orderBy(['sort_order' => SORT_ASC, 'id' => SORT_ASC])->all();
            $order = [];
            foreach ($categories as $index => $category) {
                $order[(int)$category->id] = $index;
            }
            $cards = SunnahCard::find()
                ->where(['status' => SunnahCard::STATUS_PUBLISHED, 'category_id' => array_keys($order)])
                ->with(['references.book'])
                ->orderBy(['sort_order' => SORT_ASC, 'id' => SORT_ASC])
                ->all();
            usort($cards, static function (SunnahCard $a, SunnahCard $b) use ($order) {
                return [$order[(int)$a->category_id], (int)$a->sort_order, (int)$a->id] <=> [$order[(int)$b->category_id], (int)$b->sort_order, (int)$b->id];
            });
            $counts = [];
            foreach ($cards as $card) {
                $counts[(int)$card->category_id] = ($counts[(int)$card->category_id] ?? 0) + 1;
            }
            $categoryJson = [];
            foreach ($categories as $category) {
                if (!empty($counts[(int)$category->id])) {
                    $categoryJson[] = self::categoryJson($category, $counts[(int)$category->id]);
                }
            }
            return [
                'version' => 1,
                'categories' => $categoryJson,
                'cards' => array_map(static function (SunnahCard $card) {
                    return self::cardJson($card);
                }, $cards),
            ];
        }, 300);
    }

    /** Called after every back-office change, so the app sees it at once. */
    public static function clearCache(): void
    {
        Yii::$app->cache->delete(self::CACHE_KEY);
    }

    // ------------------------------------------------------------------ photos
    // Kept here (not in MasjidMedia) so Sunnah Shorts can be removed without touching shared code.

    public const IMAGE_WIDTH = 1080;
    public const IMAGE_HEIGHT = 1920;
    public const THUMB_WIDTH = 360;
    public const THUMB_HEIGHT = 640;
    public const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
    private const IMAGE_FOLDER = 'sunnah-images';
    private const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

    public static function validateImage(?UploadedFile $file): ?string
    {
        if (!$file || $file->hasError) {
            return 'Please choose an image to upload.';
        }
        if ($file->size > self::MAX_UPLOAD_BYTES) {
            return 'Image is too large (max 12 MB).';
        }
        $mime = function_exists('mime_content_type') ? mime_content_type($file->tempName) : $file->type;
        return in_array($mime, self::ALLOWED_MIME, true) ? null : 'Only JPG, PNG or WebP images are supported.';
    }

    /**
     * The back office already crops to 9:16; fit() again so a bad crop can never change the card
     * shape. EXIF is applied and stripped by re-encoding. Stored per month: sunnah-images/<yyyymm>/.
     *
     * @return array{image_url: string, thumb_url: string}
     */
    public static function saveImage(UploadedFile $file): array
    {
        $relative = self::IMAGE_FOLDER . '/' . date('Ym');
        $dir = Yii::getAlias('@webroot') . '/' . $relative . '/';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $base = date('YmdHis') . '_' . bin2hex(random_bytes(6));
        $ext = function_exists('imagewebp') ? 'webp' : 'jpg';
        $saved = [];
        foreach (['image_url' => [self::IMAGE_WIDTH, self::IMAGE_HEIGHT, 80, ''], 'thumb_url' => [self::THUMB_WIDTH, self::THUMB_HEIGHT, 70, '_thumb']] as $key => [$width, $height, $quality, $suffix]) {
            $image = Image::make($file->tempName);
            try {
                $image->orientate();
            } catch (\Throwable $e) {
                // No EXIF support or no orientation tag.
            }
            $image->fit($width, $height);
            $name = $base . $suffix . '.' . $ext;
            $image->encode($ext, $quality)->save($dir . $name);
            $saved[$key] = rtrim(Yii::$app->request->hostInfo . Yii::$app->request->baseUrl, '/') . '/' . $relative . '/' . $name;
        }
        return $saved;
    }

    /** File on disk for one of our photo URLs, or null for any other URL (no path climbing). */
    public static function imagePath(?string $url): ?string
    {
        $urlPath = (string)parse_url((string)$url, PHP_URL_PATH);
        $pos = strpos($urlPath, '/' . self::IMAGE_FOLDER . '/');
        if ($pos === false) {
            return null;
        }
        $relative = substr($urlPath, $pos + 1);
        if (!preg_match('#^' . self::IMAGE_FOLDER . '/\d{6}/[A-Za-z0-9_.-]+$#', $relative)) {
            return null;
        }
        $path = Yii::getAlias('@webroot') . '/' . $relative;
        return is_file($path) ? $path : null;
    }

    public static function deleteImage(?string $url): void
    {
        $path = $url ? self::imagePath($url) : null;
        if ($path) {
            @unlink($path);
        }
    }
}
