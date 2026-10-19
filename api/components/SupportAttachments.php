<?php

namespace app\components;

use app\models\SupportTicketAttachment;
use Intervention\Image\ImageManagerStatic as Image;
use Yii;
use yii\web\UploadedFile;

/**
 * Files attached to "Report an Issue": screenshots/photos and PDFs.
 *
 * Reports often show personal details, so files are kept outside the web root
 * (@runtime/support-attachments/<ticket id>/, also skipped by the API deploy) and are only
 * served through the back office's authenticated admin-support/attachment endpoint.
 *
 * Images are auto-rotated, scaled to MAX_IMAGE_EDGE and re-encoded as JPEG, which also strips
 * EXIF/GPS metadata. PDFs are stored as uploaded after checking they really are PDFs.
 */
class SupportAttachments
{
    public const MAX_FILES = 3;
    public const MAX_BYTES = 10 * 1024 * 1024;
    public const MAX_IMAGE_EDGE = 2000;

    private const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const PDF_MIME = 'application/pdf';

    /** The request's "attachments[]" files (none when the report was sent as JSON). */
    public static function fromRequest(): array
    {
        return UploadedFile::getInstancesByName('attachments');
    }

    /**
     * Checks every file before anything is saved; returns an error message, or null when all are usable.
     *
     * @param UploadedFile[] $files
     */
    public static function validate(array $files): ?string
    {
        if (count($files) > self::MAX_FILES) {
            return sprintf('You can attach up to %d files.', self::MAX_FILES);
        }
        foreach ($files as $file) {
            if ($file->hasError) {
                return 'One of the files could not be uploaded. Please try again.';
            }
            if ($file->size > self::MAX_BYTES) {
                return sprintf('"%s" is too large (max %d MB).', $file->name, self::MAX_BYTES / 1024 / 1024);
            }
            $mime = self::detectMime($file);
            if (!in_array($mime, self::IMAGE_MIME, true) && $mime !== self::PDF_MIME) {
                return sprintf('"%s" is not supported. Attach a screenshot, photo or PDF.', $file->name);
            }
        }
        return null;
    }

    /**
     * Stores validated files for a ticket. A file that fails to store is logged and skipped, so the
     * report itself is never lost.
     *
     * @param UploadedFile[] $files
     * @return SupportTicketAttachment[]
     */
    public static function saveAll(int $ticketId, array $files): array
    {
        $saved = [];
        foreach ($files as $file) {
            try {
                $saved[] = self::save($ticketId, $file);
            } catch (\Throwable $error) {
                Yii::error(sprintf('Support attachment "%s" for ticket %d not saved: %s', $file->name, $ticketId, $error->getMessage()), __METHOD__);
            }
        }
        return $saved;
    }

    /** Absolute path of an attachment's file, or null when it is missing on disk. */
    public static function path(SupportTicketAttachment $attachment): ?string
    {
        $path = self::directory((int)$attachment->ticket_id, false) . basename($attachment->stored_name);
        return is_file($path) ? $path : null;
    }

    private static function save(int $ticketId, UploadedFile $file): SupportTicketAttachment
    {
        $dir = self::directory($ticketId, true);
        $base = date('YmdHis') . '_' . bin2hex(random_bytes(6));
        $attachment = new SupportTicketAttachment([
            'ticket_id' => $ticketId,
            'original_name' => self::cleanName($file->name),
        ]);

        if (self::detectMime($file) === self::PDF_MIME) {
            $attachment->stored_name = $base . '.pdf';
            $attachment->mime_type = self::PDF_MIME;
            if (!copy($file->tempName, $dir . $attachment->stored_name)) {
                throw new \RuntimeException('Could not copy the PDF.');
            }
        } else {
            $image = Image::make($file->tempName);
            try {
                $image->orientate();
            } catch (\Throwable $e) {
                // No EXIF support or no orientation tag: keep the pixels as they are.
            }
            $image->resize(self::MAX_IMAGE_EDGE, self::MAX_IMAGE_EDGE, function ($constraint) {
                $constraint->aspectRatio();
                $constraint->upsize();
            });
            $attachment->stored_name = $base . '.jpg';
            $attachment->mime_type = 'image/jpeg';
            // Re-encoded as JPEG, so the download name says so too ("screen.png" -> "screen.jpg").
            $attachment->original_name = mb_substr(pathinfo($attachment->original_name, PATHINFO_FILENAME) ?: 'image', 0, 180) . '.jpg';
            $attachment->width = $image->width();
            $attachment->height = $image->height();
            $image->encode('jpg', 85)->save($dir . $attachment->stored_name);
        }

        $attachment->size_bytes = (int)filesize($dir . $attachment->stored_name);
        if (!$attachment->save()) {
            @unlink($dir . $attachment->stored_name);
            throw new \RuntimeException(implode(' ', $attachment->getFirstErrors()));
        }
        return $attachment;
    }

    /** MIME type from the file's content, not the name or the browser's claim. */
    private static function detectMime(UploadedFile $file): string
    {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mime = $finfo ? finfo_file($finfo, $file->tempName) : false;
            if ($finfo) {
                finfo_close($finfo);
            }
            if ($mime) {
                return (string)$mime;
            }
        }
        return function_exists('mime_content_type') ? (string)mime_content_type($file->tempName) : '';
    }

    private static function directory(int $ticketId, bool $create): string
    {
        $dir = Yii::getAlias('@runtime') . '/support-attachments/' . $ticketId . '/';
        if ($create && !is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        return $dir;
    }

    /** Keeps the user's file name readable but safe to show and to use in a download header. */
    private static function cleanName(string $name): string
    {
        $name = preg_replace('/[\x00-\x1F\x7F"\\\\\/]+/u', '', $name);
        $name = trim((string)$name);
        return mb_substr($name !== '' ? $name : 'attachment', 0, 190);
    }
}
