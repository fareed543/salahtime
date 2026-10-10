<?php

namespace app\components;

use app\models\Masjid;

/**
 * Public, SEO-friendly masjid URLs: /masjid/<city_slug>/<slug>, e.g. /masjid/hyderabad/masjid-e-noor.
 *
 * Both parts are stored on the masjid so the URL stays stable and can be looked up directly.
 * They are (re)generated when a masjid's name or city changes, and filled in on first read for
 * masjids saved before slugs existed. Two masjids with the same name in one city get -2, -3...
 */
class MasjidSlug
{
    public static function slugify(?string $value): string
    {
        $value = trim((string)$value);
        if ($value === '') {
            return '';
        }
        // Transliterate accents (e.g. "Masjid-é" -> "masjid-e"); scripts with no Latin form drop out.
        $ascii = function_exists('iconv') ? @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) : $value;
        $slug = strtolower((string)($ascii !== false ? $ascii : $value));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        return trim(substr((string)$slug, 0, 150), '-');
    }

    /** Fills in slugs when missing, or regenerates them when the name/city changed. Saves if changed. */
    public static function ensure(Masjid $masjid): void
    {
        // City, else the nearest place we know; India (the app's default country) when nothing is set.
        $citySlug = self::slugify($masjid->city) ?: self::slugify($masjid->area)
            ?: self::slugify($masjid->state) ?: self::slugify($masjid->country) ?: 'india';
        // Names in Urdu/Arabic script have no Latin slug; fall back to a stable id-based one.
        $base = self::slugify($masjid->name) ?: 'masjid-' . (int)$masjid->id;

        $current = (string)$masjid->slug;
        $stillMatches = $masjid->city_slug === $citySlug
            && ($current === $base || preg_match('/^' . preg_quote($base, '/') . '-\d+$/', $current));
        if ($current !== '' && $stillMatches) {
            return;
        }

        $slug = $base;
        for ($n = 2; self::taken($citySlug, $slug, (int)$masjid->id); $n++) {
            $slug = $base . '-' . $n;
        }

        $masjid->city_slug = $citySlug;
        $masjid->slug = $slug;
        if (!$masjid->isNewRecord) {
            $masjid->updateAttributes(['city_slug' => $citySlug, 'slug' => $slug]);
        }
    }

    public static function find(string $citySlug, string $slug): ?Masjid
    {
        return Masjid::findOne(['city_slug' => self::slugify($citySlug), 'slug' => self::slugify($slug)]);
    }

    public static function path(Masjid $masjid): string
    {
        return '/masjid/' . $masjid->city_slug . '/' . $masjid->slug;
    }

    private static function taken(string $citySlug, string $slug, int $exceptId): bool
    {
        return Masjid::find()
            ->where(['city_slug' => $citySlug, 'slug' => $slug])
            ->andWhere(['<>', 'id', $exceptId])
            ->exists();
    }
}
