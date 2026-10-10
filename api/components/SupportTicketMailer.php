<?php

namespace app\components;

use app\models\SupportTicket;
use Yii;
use yii\helpers\Html;

/**
 * Emails the admin when a user reports an issue (Support Desk).
 *
 * Recipient: params['supportEmail'], falling back to params['adminEmail'].
 * Sends the same way as AuthController::actionSendEmail (PHP mail() in production,
 * the Yii mailer otherwise) and uses the branded template bt_email_templates #1 when present.
 */
class SupportTicketMailer
{
    public static function notifyAdmin(SupportTicket $ticket): bool
    {
        $params = Yii::$app->params;
        $to = $params['supportEmail'] ?? $params['adminEmail'] ?? null;
        $from = $params['senderEmail'] ?? $to;
        $fromName = $params['senderName'] ?? 'Salah Time';
        if (!$to || !$from) {
            Yii::warning('Support ticket email skipped: no adminEmail/senderEmail configured.', __METHOD__);
            return false;
        }

        $subject = sprintf('[Salah Time] New issue %s: %s', $ticket->reference, $ticket->getCategoryLabel());
        $html = self::wrapInTemplate($subject, self::body($ticket));

        try {
            if (!empty($params['productionMode'])) {
                $headers = "MIME-Version: 1.0\r\n";
                $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
                $headers .= "From: {$fromName} <{$from}>\r\n";
                // Reply goes straight to the person who reported it, when they left an email.
                $replyTo = $ticket->email ?: $from;
                $headers .= "Reply-To: {$replyTo}\r\n";
                return mail($to, $subject, $html, $headers);
            }

            $message = Yii::$app->mailer->compose()
                ->setFrom([$from => $fromName])
                ->setTo($to)
                ->setSubject($subject)
                ->setHtmlBody($html);
            if ($ticket->email) {
                $message->setReplyTo($ticket->email);
            }
            return $message->send();
        } catch (\Throwable $error) {
            Yii::error('Support ticket email failed: ' . $error->getMessage(), __METHOD__);
            return false;
        }
    }

    private static function body(SupportTicket $ticket): string
    {
        $context = $ticket->getContextData();
        $rows = [
            'Reference' => $ticket->reference,
            'Category' => $ticket->getCategoryLabel(),
            'Name' => $ticket->name ?: '—',
            'Email' => $ticket->email ?: '—',
            'Logged-in user ID' => $ticket->customer_id ?: '—',
            'Platform' => trim(($ticket->platform ?: '—') . ' ' . ($ticket->app_version ? 'v' . $ticket->app_version : '')),
            'Page' => $ticket->page_url ?: '—',
            'Location' => $ticket->location ?: '—',
            'Language' => $ticket->language ?: '—',
        ];
        foreach ($context as $key => $value) {
            $rows[ucfirst(str_replace('_', ' ', (string)$key))] = is_scalar($value) ? (string)$value : json_encode($value);
        }
        $rows['Reported at'] = $ticket->created_at;

        $table = '';
        foreach ($rows as $label => $value) {
            $table .= '<tr><td style="padding:4px 12px 4px 0;color:#6b7f9e;white-space:nowrap;vertical-align:top">'
                . Html::encode($label) . '</td><td style="padding:4px 0;color:#344767">' . Html::encode((string)$value) . '</td></tr>';
        }

        $backofficeUrl = rtrim(Yii::$app->params['backofficeUrl'] ?? 'https://backoffice.salah-times.in', '/');
        $link = $backofficeUrl . '/support-desk/' . $ticket->id;

        return '<div style="font-family:helvetica,arial,sans-serif;font-size:14px;line-height:1.5;color:#344767;text-align:left">'
            . '<p style="margin:0 0 8px;font-weight:bold">Message</p>'
            . '<p style="margin:0 0 16px">' . nl2br(Html::encode($ticket->message)) . '</p>'
            . '<table cellpadding="0" cellspacing="0" style="font-size:13px">' . $table . '</table>'
            . '<p style="margin:20px 0 0"><a href="' . Html::encode($link) . '" style="color:#0f5f4d;font-weight:bold">Open in Support Desk</a></p>'
            . '</div>';
    }

    private static function wrapInTemplate(string $subject, string $body): string
    {
        try {
            $template = Yii::$app->db->createCommand('SELECT email_template FROM {{%email_templates}} WHERE id_email_template = 1')->queryScalar();
        } catch (\Throwable $error) {
            $template = false;
        }

        if (!$template) {
            return '<!doctype html><html><body>' . '<h2 style="font-family:helvetica,arial,sans-serif;color:#0f5f4d">'
                . Html::encode($subject) . '</h2>' . $body . '</body></html>';
        }

        $subjectRow = '<tr> <td align="center" style="font-size:18px;color:#f90;font-family:helvetica,arial,sans-serif">' . Html::encode($subject) . '</td></tr>';
        return str_replace(
            ['template_email_content', 'template_subject_content', 'template_button_content'],
            [$body, $subjectRow, ''],
            $template
        );
    }
}
