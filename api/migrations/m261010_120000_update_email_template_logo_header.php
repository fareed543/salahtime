<?php

use yii\db\Migration;

/**
 * Replaces the plain "Salah Time" heading of the branded email layout (bt_email_templates #1)
 * with a logo + name + tagline header. The logo URL comes from params['emailLogoUrl'], so run
 * this per environment (local / dev / prod).
 */
class m261010_120000_update_email_template_logo_header extends Migration
{
    private const TEMPLATE_ID = 1;
    private const MARKER = '<!-- salahtime-email-header -->';
    private const OLD_HEADER = '<td align="center">
                  <a href="index.html" style="color:#000;font-size:40px;font-weight:700;font-family:helvetica,arial,sans-serif;text-decoration:none">Salah Time</a>
                </td>';

    public function safeUp()
    {
        $template = $this->loadTemplate();
        if ($template === null) {
            echo "    > email template #" . self::TEMPLATE_ID . " not found, skipping.\n";
            return true;
        }
        if (strpos($template, self::MARKER) !== false) {
            echo "    > logo header already present, skipping.\n";
            return true;
        }

        // Match the old heading cell loosely (whitespace/attributes may differ between environments).
        $pattern = '#<td align="center">\s*<a [^>]*>\s*Salah\s?Time\s*</a>\s*</td>#i';
        $updated = preg_replace($pattern, $this->newHeader(), $template, 1, $count);
        if ($count !== 1) {
            echo "    > could not find the old \"Salah Time\" heading; template left unchanged.\n";
            return true;
        }

        $this->update('{{%email_templates}}', ['email_template' => $updated], ['id_email_template' => self::TEMPLATE_ID]);
        return true;
    }

    public function safeDown()
    {
        $template = $this->loadTemplate();
        if ($template === null || strpos($template, self::MARKER) === false) {
            return true;
        }

        $pattern = '#' . preg_quote(self::MARKER, '#') . '.*?<!-- /salahtime-email-header -->#s';
        $restored = preg_replace($pattern, self::OLD_HEADER, $template, 1);
        $this->update('{{%email_templates}}', ['email_template' => $restored], ['id_email_template' => self::TEMPLATE_ID]);
        return true;
    }

    private function loadTemplate(): ?string
    {
        $template = $this->db->createCommand(
            'SELECT email_template FROM {{%email_templates}} WHERE id_email_template = :id',
            [':id' => self::TEMPLATE_ID]
        )->queryScalar();

        return $template === false ? null : (string)$template;
    }

    /**
     * Email-safe header: tables + inline styles only, real text (survives blocked images),
     * logo PNG served from the API host.
     */
    private function newHeader(): string
    {
        $logoUrl = htmlspecialchars(Yii::$app->params['emailLogoUrl'], ENT_QUOTES);
        $siteUrl = htmlspecialchars(rtrim(Yii::$app->params['frontendUrl'] ?? 'https://salah-times.in', '/'), ENT_QUOTES);

        return self::MARKER . '
                <td align="center" style="padding:0 16px">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:2px solid #1a5249;border-radius:14px;border-collapse:separate">
                    <tr>
                      <td valign="middle" style="padding:14px 12px 14px 18px">
                        <a href="' . $siteUrl . '" style="text-decoration:none">
                          <img src="' . $logoUrl . '" width="64" height="64" alt="SalahTime" style="display:block;width:64px;height:64px;border:0;outline:none;border-radius:50%">
                        </a>
                      </td>
                      <td valign="middle" align="left" style="padding:14px 24px 14px 6px;font-family:helvetica,arial,sans-serif">
                        <a href="' . $siteUrl . '" style="color:#1a5249;font-size:28px;line-height:32px;font-weight:700;letter-spacing:0.3px;text-decoration:none">SalahTime</a>
                        <div style="height:2px;line-height:2px;font-size:1px;background-color:#8fd3c0;margin:6px 0">&nbsp;</div>
                        <div style="color:#4f6b65;font-size:14px;line-height:18px">Your Salah companion</div>
                      </td>
                    </tr>
                  </table>
                </td>
                <!-- /salahtime-email-header -->';
    }
}
