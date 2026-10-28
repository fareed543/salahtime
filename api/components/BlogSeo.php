<?php

namespace app\components;

use app\models\BlogArticleVersion;
use yii\helpers\HtmlPurifier;

/**
 * Blog article text helpers (NF-003): HTML cleaning, word count, slugs and the SEO score.
 *
 * The score rules are mirrored in frontend/src/app/components/blog/blog-seo-score.ts so authors
 * see it live while they type; the stored score is always this one.
 */
class BlogSeo
{
    public const MIN_WORDS_TO_SUBMIT = 150;

    /**
     * Keeps only the formatting the editor offers. External links open in a new tab with
     * rel="nofollow noopener"; scripts, styles, iframes, images and attributes are dropped.
     */
    public static function cleanHtml(string $html): string
    {
        $clean = HtmlPurifier::process($html, function ($config) {
            $config->set('HTML.Allowed', 'p,br,h2,h3,strong,b,em,i,u,ul,ol,li,blockquote,a[href|title]');
            $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true]);
            $config->set('HTML.Nofollow', true);
            $config->set('HTML.TargetBlank', true);
            $config->set('AutoFormat.RemoveEmpty', true);
            $config->set('URI.Host', 'salah-times.in');
            $config->set('Cache.SerializerPath', \Yii::getAlias('@runtime'));
        });
        return trim($clean);
    }

    public static function plainText(string $html): string
    {
        $text = html_entity_decode(strip_tags(preg_replace('#<(br|/p|/h2|/h3|/li|/blockquote)[^>]*>#i', ' $0', $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    public static function wordCount(string $html): int
    {
        $text = self::plainText($html);
        return $text === '' ? 0 : count(preg_split('/\s+/u', $text));
    }

    /** "Five Pillars of Salah!" → "five-pillars-of-salah"; non-Latin titles fall back to "article". */
    public static function slugify(string $text): string
    {
        $ascii = function_exists('iconv') ? (string)@iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) : $text;
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $ascii), '-'));
        $slug = substr($slug, 0, 80);
        return rtrim($slug, '-') ?: 'article';
    }

    /**
     * @return array{score: int, checks: array<int, array{key: string, passed: bool, points: int, max: int}>}
     */
    public static function score(BlogArticleVersion $version): array
    {
        $html = (string)$version->content_html;
        $title = (string)$version->title;
        $metaTitle = (string)($version->meta_title ?: $title);
        $metaDescription = (string)$version->meta_description;
        $keyword = mb_strtolower(trim((string)$version->focus_keyword));
        $words = self::wordCount($html);
        $firstParagraph = preg_match('#<p[^>]*>(.*?)</p>#is', $html, $match) ? self::plainText($match[1]) : '';
        $contains = static function (string $haystack) use ($keyword): bool {
            return $keyword !== '' && mb_stripos($haystack, $keyword) !== false;
        };
        $titleLength = mb_strlen($metaTitle);
        $descriptionLength = mb_strlen($metaDescription);
        $hasInternalLink = (bool)preg_match('#<a[^>]+href="(/|https?://(www\.)?salah-times\.in)#i', $html);

        $checks = [
            ['meta_title_length', $titleLength >= 30 && $titleLength <= 60, 10],
            ['meta_description_length', $descriptionLength >= 120 && $descriptionLength <= 160, 10],
            ['keyword_set', $keyword !== '', 5],
            ['keyword_in_title', $contains($metaTitle) || $contains($title), 10],
            ['keyword_in_description', $contains($metaDescription), 5],
            ['keyword_in_intro', $contains($firstParagraph), 5],
            ['keyword_in_slug', $keyword !== '' && strpos((string)$version->slug, self::slugify($keyword)) !== false, 5],
            ['length', $words >= 600, 15, $words >= 300 ? 8 : 0],
            ['subheadings', (bool)preg_match('#<h2[\s>]#i', $html), 10],
            ['cover_image', (string)$version->cover_image_url !== '', 5],
            ['cover_alt', trim((string)$version->cover_alt) !== '', 5],
            ['internal_link', $hasInternalLink, 5],
            ['references', trim((string)$version->references_text) !== '', 5],
            ['category_tags', (string)$version->category !== '' && count($version->tagList()) > 0, 5],
        ];

        $result = [];
        $total = 0;
        foreach ($checks as $check) {
            [$key, $passed, $max] = $check;
            $points = $passed ? $max : (int)($check[3] ?? 0);
            $total += $points;
            $result[] = ['key' => $key, 'passed' => $passed, 'points' => $points, 'max' => $max];
        }

        return ['score' => $total, 'checks' => $result];
    }
}
