<?php

namespace app\components;

use app\models\BlogArticle;
use app\models\BlogArticleVersion;
use app\models\Customer;
use Yii;
use yii\helpers\Html;

/**
 * Blog emails (NF-003): the admin hears about submissions and the author's answer to a proposal;
 * the author hears about publish, reject, proposed changes and view milestones (email + push).
 *
 * Admin recipient: params['blogApprovalEmail'], falling back to params['adminEmail']. Sends the same
 * way as SupportTicketMailer (PHP mail() in production, the Yii mailer otherwise) with the branded template.
 */
class BlogMailer
{
    public static function notifyAdminSubmitted(BlogArticle $article, BlogArticleVersion $version, ?Customer $author): bool
    {
        $subject = sprintf('[Salah Time] New article waiting for review: %s', $version->title);
        $body = self::paragraph(sprintf('%s submitted an article for review. It is not public until you approve it.', BlogArticle::authorName($author)))
            . self::details([
                'Title' => $version->title,
                'Category' => (string)$version->getCategoryLabel(),
                'Words' => (string)$version->word_count,
                'SEO score' => $version->seo_score . ' / 100',
                'Version' => 'v' . $version->version_no,
                'Author email' => $author ? (string)$author->email : '',
            ])
            . self::button(self::backofficeLink($article), 'Review in the back office');
        return self::send(self::adminEmail(), $subject, $body, $author ? (string)$author->email : null);
    }

    public static function notifyAdminProposalAnswer(BlogArticle $article, BlogArticleVersion $version, ?Customer $author, bool $accepted, ?string $note): bool
    {
        $subject = $accepted
            ? sprintf('[Salah Time] Author accepted your changes: %s', $version->title)
            : sprintf('[Salah Time] Author declined your changes: %s', $version->title);
        $body = self::paragraph($accepted
                ? sprintf('%s accepted your proposed changes. The article is now published.', BlogArticle::authorName($author))
                : sprintf('%s declined your proposed changes. The article is back in review with their version.', BlogArticle::authorName($author)))
            . ($note ? self::paragraph('Their note: ' . $note) : '')
            . self::button(self::backofficeLink($article), 'Open in the back office');
        return self::send(self::adminEmail(), $subject, $body, $author ? (string)$author->email : null);
    }

    public static function notifyAuthorPublished(BlogArticle $article, BlogArticleVersion $version, ?Customer $author): void
    {
        $url = self::publicLink($article);
        $share = 'https://wa.me/?text=' . rawurlencode($version->title . ' ' . $url);
        $body = self::paragraph(sprintf('Assalamu alaikum %s,', BlogArticle::authorName($author)))
            . self::paragraph(sprintf('JazakAllahu khairan for writing "%s". It has been reviewed and is now published on SalahTime for everyone to read.', $version->title))
            . self::paragraph('Share it with your family and friends. Every view is counted on your author page.')
            . self::button($url, 'Read your article')
            . self::button($share, 'Share on WhatsApp');
        self::toAuthor($author, 'Your article is published', $body,
            'Your article is published', sprintf('"%s" is now live on SalahTime.', $version->title), $article, $url);
    }

    public static function notifyAuthorRejected(BlogArticle $article, BlogArticleVersion $version, ?Customer $author, string $reason): void
    {
        $link = self::myArticleLink($article);
        $body = self::paragraph(sprintf('Assalamu alaikum %s,', BlogArticle::authorName($author)))
            . self::paragraph(sprintf('Thank you for writing "%s". We could not publish it in its current form.', $version->title))
            . self::paragraph('Reason: ' . $reason)
            . self::paragraph('You can edit the article and submit it again.')
            . self::button($link, 'Edit your article');
        self::toAuthor($author, 'Your article needs changes', $body,
            'Your article needs changes', $reason, $article, $link);
    }

    public static function notifyAuthorProposal(BlogArticle $article, BlogArticleVersion $proposal, ?Customer $author): void
    {
        $link = self::myArticleLink($article);
        $body = self::paragraph(sprintf('Assalamu alaikum %s,', BlogArticle::authorName($author)))
            . self::paragraph(sprintf('Our editor improved "%s" (for example its search title and description) before publishing it. Nothing is published until you agree.', $proposal->title))
            . ($proposal->note ? self::paragraph('Editor\'s note: ' . $proposal->note) : '')
            . self::paragraph(sprintf('SEO score with the changes: %d / 100.', $proposal->seo_score))
            . self::button($link, 'Review the changes');
        self::toAuthor($author, 'Please review the changes to your article', $body,
            'Changes proposed to your article', 'Review and accept them to publish your article.', $article, $link);
    }

    public static function notifyAuthorMilestone(BlogArticle $article, BlogArticleVersion $version, ?Customer $author, int $views): void
    {
        $url = self::publicLink($article);
        $body = self::paragraph(sprintf('Assalamu alaikum %s,', BlogArticle::authorName($author)))
            . self::paragraph(sprintf('MashaAllah! "%s" has been read %s times. May Allah reward you for every reader who benefits from it.', $version->title, number_format($views)))
            . self::button($url, 'See your article');
        self::toAuthor($author, sprintf('Your article reached %s views', number_format($views)), $body,
            sprintf('%s views!', number_format($views)), sprintf('"%s" reached %s views.', $version->title, number_format($views)), $article, $url);
    }

    public static function publicLink(BlogArticle $article): string
    {
        return self::frontendUrl() . '/blog/' . rawurlencode((string)$article->slug);
    }

    private static function myArticleLink(BlogArticle $article): string
    {
        return self::frontendUrl() . '/blog/my-articles/' . (int)$article->id;
    }

    private static function backofficeLink(BlogArticle $article): string
    {
        $backofficeUrl = rtrim(Yii::$app->params['backofficeUrl'] ?? 'https://backoffice.salah-times.in', '/');
        return $backofficeUrl . '/blog/' . (int)$article->id;
    }

    private static function frontendUrl(): string
    {
        return rtrim(Yii::$app->params['frontendUrl'] ?? 'https://salah-times.in', '/');
    }

    private static function adminEmail(): ?string
    {
        $params = Yii::$app->params;
        return $params['blogApprovalEmail'] ?? $params['adminEmail'] ?? null;
    }

    /** Email and push to the author; either may be skipped (no email, no device), the other still goes. */
    private static function toAuthor(?Customer $author, string $subject, string $body, string $pushTitle, string $pushBody, BlogArticle $article, string $url): void
    {
        if (!$author) {
            return;
        }
        if ($author->email) {
            self::send((string)$author->email, '[Salah Time] ' . $subject, $body, null);
        }
        PushSender::toCustomer((int)$author->id, $pushTitle, $pushBody, [
            'type' => 'blog',
            'articleId' => (string)$article->id,
            'url' => $url,
        ]);
    }

    private static function send(?string $to, string $subject, string $body, ?string $replyTo): bool
    {
        $params = Yii::$app->params;
        $from = $params['senderEmail'] ?? $params['adminEmail'] ?? null;
        $fromName = $params['senderName'] ?? 'Salah Time';
        if (!$to || !$from) {
            Yii::warning('Blog email skipped: no recipient or senderEmail configured.', __METHOD__);
            return false;
        }

        $html = SupportTicketMailer::wrapInTemplate($subject, '<div style="font-family:helvetica,arial,sans-serif;font-size:14px;line-height:1.5;color:#344767;text-align:left">' . $body . '</div>');
        try {
            if (!empty($params['productionMode'])) {
                $headers = "MIME-Version: 1.0\r\n";
                $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
                $headers .= "From: {$fromName} <{$from}>\r\n";
                $headers .= 'Reply-To: ' . ($replyTo ?: $from) . "\r\n";
                return mail($to, $subject, $html, $headers);
            }

            $message = Yii::$app->mailer->compose()
                ->setFrom([$from => $fromName])
                ->setTo($to)
                ->setSubject($subject)
                ->setHtmlBody($html);
            if ($replyTo) {
                $message->setReplyTo($replyTo);
            }
            return $message->send();
        } catch (\Throwable $error) {
            Yii::error('Blog email failed: ' . $error->getMessage(), __METHOD__);
            return false;
        }
    }

    private static function paragraph(string $text): string
    {
        return '<p style="margin:0 0 12px">' . nl2br(Html::encode($text)) . '</p>';
    }

    private static function details(array $rows): string
    {
        $table = '';
        foreach ($rows as $label => $value) {
            $table .= '<tr><td style="padding:4px 12px 4px 0;color:#6b7f9e;white-space:nowrap;vertical-align:top">'
                . Html::encode($label) . '</td><td style="padding:4px 0;color:#344767">' . Html::encode($value !== '' ? $value : '—') . '</td></tr>';
        }
        return '<table cellpadding="0" cellspacing="0" style="font-size:13px;margin:0 0 12px">' . $table . '</table>';
    }

    private static function button(string $url, string $label): string
    {
        return '<p style="margin:16px 0 0"><a href="' . Html::encode($url) . '" style="color:#0f5f4d;font-weight:bold">' . Html::encode($label) . '</a></p>';
    }
}
