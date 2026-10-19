<?php

namespace app\components;

use app\models\Customer;
use app\models\Masjid;
use Yii;
use yii\helpers\Html;

/**
 * Emails the admin when a user submits a new masjid, so it is approved without delay (ST-00013).
 *
 * Recipient: params['masjidApprovalEmail'], falling back to params['adminEmail']. Sends the same way as
 * SupportTicketMailer (PHP mail() in production, the Yii mailer otherwise) with the branded template.
 */
class MasjidMailer
{
    public static function notifyAdminOfNewMasjid(Masjid $masjid, ?Customer $submittedBy): bool
    {
        $params = Yii::$app->params;
        $to = $params['masjidApprovalEmail'] ?? $params['adminEmail'] ?? null;
        $from = $params['senderEmail'] ?? $to;
        $fromName = $params['senderName'] ?? 'Salah Time';
        if (!$to || !$from) {
            Yii::warning('New masjid email skipped: no adminEmail/senderEmail configured.', __METHOD__);
            return false;
        }

        $subject = sprintf('[Salah Time] New masjid waiting for approval: %s', (string)$masjid->name);
        $html = SupportTicketMailer::wrapInTemplate($subject, self::body($masjid, $submittedBy));
        $replyTo = $submittedBy && $submittedBy->email ? (string)$submittedBy->email : null;

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
            Yii::error('New masjid email failed: ' . $error->getMessage(), __METHOD__);
            return false;
        }
    }

    /** Email body; public for tests. */
    public static function body(Masjid $masjid, ?Customer $submittedBy): string
    {
        $submitter = $submittedBy
            ? trim(((string)$submittedBy->firstname) . ' ' . ((string)$submittedBy->lastname)) ?: (string)$submittedBy->username
            : '';
        $rows = [
            'Masjid' => (string)$masjid->name,
            'Address' => (string)$masjid->address,
            'Area' => (string)$masjid->area,
            'City' => trim(implode(', ', array_filter([(string)$masjid->city, (string)$masjid->state, (string)$masjid->pincode]))),
            'Country' => (string)$masjid->country,
            'Map pin' => $masjid->latitude !== null ? $masjid->latitude . ', ' . $masjid->longitude : 'Not pinned',
            'Submitted by' => $submitter ?: '—',
            'Email' => $submittedBy ? (string)$submittedBy->email : '—',
            'Phone' => $submittedBy ? (string)$submittedBy->phone : '—',
            'Submitted at' => (string)$masjid->created_at,
        ];

        $table = '';
        foreach ($rows as $label => $value) {
            $table .= '<tr><td style="padding:4px 12px 4px 0;color:#6b7f9e;white-space:nowrap;vertical-align:top">'
                . Html::encode($label) . '</td><td style="padding:4px 0;color:#344767">' . Html::encode($value !== '' ? $value : '—') . '</td></tr>';
        }

        $backofficeUrl = rtrim(Yii::$app->params['backofficeUrl'] ?? 'https://backoffice.salah-times.in', '/');
        $link = $backofficeUrl . '/community/masjids/' . (int)$masjid->id;

        return '<div style="font-family:helvetica,arial,sans-serif;font-size:14px;line-height:1.5;color:#344767;text-align:left">'
            . '<p style="margin:0 0 12px">A new masjid was added in the app and is waiting for approval. It is not visible to other users until it is approved.</p>'
            . '<table cellpadding="0" cellspacing="0" style="font-size:13px">' . $table . '</table>'
            . '<p style="margin:20px 0 0"><a href="' . Html::encode($link) . '" style="color:#0f5f4d;font-weight:bold">Review and approve in the back office</a></p>'
            . '</div>';
    }
}
