<?php

namespace app\components;

use Intervention\Image\ImageManagerStatic as Image;
use Yii;
use yii\web\UploadedFile;

/**
 * Normalises masjid photos on upload so storage stays small and dimensions stay consistent.
 *
 * - Gallery photos are centre-cropped to one 16:9 frame (1280x720) plus a 480x270 thumbnail,
 *   so the slideshow never changes height between slides.
 * - Timing-board photos keep their aspect ratio (the whole board must stay readable) and are
 *   only scaled down to 1600px on the long edge.
 *
 * Phone photos are auto-rotated from EXIF and re-encoded, which also strips EXIF/GPS metadata.
 * WebP is used when the server's GD supports it (roughly 30% smaller than JPEG), else JPEG.
 */
class MasjidMedia
{
    public const GALLERY_WIDTH = 1280;
    public const GALLERY_HEIGHT = 720;
    public const THUMB_WIDTH = 480;
    public const THUMB_HEIGHT = 270;
    public const BOARD_MAX_EDGE = 1600;
    public const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
    public const MAX_GALLERY_IMAGES = 10;

    private const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

    /**
     * Validates an upload; returns an error message, or null when it is usable.
     */
    public static function validate(?UploadedFile $file): ?string
    {
        if (!$file || $file->hasError) {
            return 'Please choose an image to upload.';
        }
        if ($file->size > self::MAX_UPLOAD_BYTES) {
            return 'Image is too large (max 12 MB).';
        }
        $mime = function_exists('mime_content_type') ? mime_content_type($file->tempName) : $file->type;
        if (!in_array($mime, self::ALLOWED_MIME, true)) {
            return 'Only JPG, PNG or WebP images are supported.';
        }
        return null;
    }

    /**
     * @return array{image_url: string, thumb_url: string, width: int, height: int, size_bytes: int}
     */
    public static function saveGalleryImage(UploadedFile $file, int $masjidId): array
    {
        $dir = self::directory('masjid-images/' . $masjidId);
        $base = self::uniqueName();
        $ext = self::extension();

        $image = self::load($file->tempName);
        $image->fit(self::GALLERY_WIDTH, self::GALLERY_HEIGHT);
        $mainPath = $dir . $base . '.' . $ext;
        $image->encode($ext, 78)->save($mainPath);

        $thumb = self::load($file->tempName);
        $thumb->fit(self::THUMB_WIDTH, self::THUMB_HEIGHT);
        $thumbPath = $dir . $base . '_thumb.' . $ext;
        $thumb->encode($ext, 70)->save($thumbPath);

        return [
            'image_url' => self::publicUrl('masjid-images/' . $masjidId . '/' . basename($mainPath)),
            'thumb_url' => self::publicUrl('masjid-images/' . $masjidId . '/' . basename($thumbPath)),
            'width' => $image->width(),
            'height' => $image->height(),
            'size_bytes' => (int)filesize($mainPath) + (int)filesize($thumbPath),
        ];
    }

    /**
     * @return array{url: string, path: string, mime: string}
     */
    public static function saveTimingBoardImage(UploadedFile $file, int $masjidId): array
    {
        $dir = self::directory('masjid-timing-boards/' . $masjidId);
        // Kept as JPEG: it is also sent to the vision model, which accepts JPEG everywhere.
        $path = $dir . self::uniqueName() . '.jpg';

        $image = self::load($file->tempName);
        $image->resize(self::BOARD_MAX_EDGE, self::BOARD_MAX_EDGE, function ($constraint) {
            $constraint->aspectRatio();
            $constraint->upsize();
        });
        $image->encode('jpg', 82)->save($path);

        return [
            'url' => self::publicUrl('masjid-timing-boards/' . $masjidId . '/' . basename($path)),
            'path' => $path,
            'mime' => 'image/jpeg',
        ];
    }

    /** Removes a file this class stored, given its public URL. Ignores foreign URLs. */
    public static function deleteByUrl(?string $url): void
    {
        if (!$url) {
            return;
        }
        $path = self::pathFromUrl($url);
        if ($path && is_file($path)) {
            @unlink($path);
        }
    }

    /**
     * Returns $url only when it is a timing-board photo stored for this masjid, so a client
     * cannot attach some other file to a timing version.
     */
    public static function ownTimingBoardUrl(int $masjidId, $url): ?string
    {
        if (!is_string($url) || $url === '') {
            return null;
        }
        $path = self::pathFromUrl($url);
        $folder = '/masjid-timing-boards/' . $masjidId . '/';
        return $path && strpos(str_replace('\\', '/', $path), $folder) !== false && is_file($path) ? $url : null;
    }

    /** Removes every stored photo of a masjid (its rows are removed by the FK cascade). */
    public static function deleteMasjidFolders(int $masjidId): void
    {
        foreach (['masjid-images', 'masjid-timing-boards'] as $folder) {
            $dir = Yii::getAlias('@webroot') . '/' . $folder . '/' . $masjidId;
            if (!is_dir($dir)) {
                continue;
            }
            foreach (glob($dir . '/*') ?: [] as $file) {
                if (is_file($file)) {
                    @unlink($file);
                }
            }
            @rmdir($dir);
        }
    }

    /** Timing-board photo files of a masjid, as [path => public URL]. */
    public static function timingBoardFiles(int $masjidId): array
    {
        $dir = Yii::getAlias('@webroot') . '/masjid-timing-boards/' . $masjidId;
        $files = [];
        foreach (glob($dir . '/*.jpg') ?: [] as $path) {
            $files[$path] = self::publicUrl('masjid-timing-boards/' . $masjidId . '/' . basename($path));
        }
        return $files;
    }

    /** Maps one of our public URLs back to its file on disk, or null for foreign URLs. */
    public static function pathFromUrl(string $url): ?string
    {
        $urlPath = (string)parse_url($url, PHP_URL_PATH);
        foreach (['/masjid-images/', '/masjid-timing-boards/'] as $folder) {
            $pos = strpos($urlPath, $folder);
            if ($pos === false) {
                continue;
            }
            $relative = substr($urlPath, $pos + 1);
            // Only "<folder>/<masjidId>/<file>" is ours; reject anything that tries to climb out.
            if (!preg_match('#^masjid-(images|timing-boards)/\d+/[A-Za-z0-9_.-]+$#', $relative)) {
                return null;
            }
            return Yii::getAlias('@webroot') . '/' . $relative;
        }
        return null;
    }

    private static function load(string $tempPath)
    {
        $image = Image::make($tempPath);
        try {
            $image->orientate();
        } catch (\Throwable $e) {
            // No EXIF support or no orientation tag: keep the pixels as they are.
        }
        return $image;
    }

    private static function directory(string $relative): string
    {
        $dir = Yii::getAlias('@webroot') . '/' . $relative . '/';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        return $dir;
    }

    private static function uniqueName(): string
    {
        return date('YmdHis') . '_' . bin2hex(random_bytes(6));
    }

    private static function extension(): string
    {
        return function_exists('imagewebp') ? 'webp' : 'jpg';
    }

    private static function publicUrl(string $relative): string
    {
        return rtrim(Yii::$app->request->hostInfo . Yii::$app->request->baseUrl, '/') . '/' . $relative;
    }
}
