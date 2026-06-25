<?php

use yii\db\Migration;

class m260625_160000_update_email_branding_to_salah_time extends Migration
{
    public function safeUp()
    {
        $this->update('{{%email_templates}}', [
            'title' => 'Salah Time Email Template',
            'email_template' => $this->salahTimeTemplate(),
        ], ['id_email_template' => 1]);

        foreach ($this->emailRows() as $id => $row) {
            $this->update('{{%email}}', $row, ['id_email' => $id]);
        }
    }

    public function safeDown()
    {
        return true;
    }

    private function emailRows(): array
    {
        return [
            1 => [
                'email_content' => 'We are excited to welcome you to Salah Time. With Salah Time, you can stay connected with masjids, programs, and prayer-time services in one place.<br/> Thank you for choosing Salah Time.',
                'from_name' => 'Salah Time',
                'from_email' => 'contact@salah-times.in',
                'subject' => 'Welcome to Salah Time',
                'cc_email' => 'contact@salah-times.in',
            ],
            3 => [
                'email_content' => 'You registered an account on Salah Time. Enter the verification OTP to activate your account.',
                'from_name' => 'Salah Time',
                'from_email' => 'contact@salah-times.in',
                'subject' => 'Salah Time Email Verification',
                'cc_email' => 'contact@salah-times.in',
            ],
            4 => [
                'email_content' => 'We noticed a new sign-in to your Salah Time account. If this was you, you do not need to do anything. If not, please secure your account.',
                'from_name' => 'Salah Time',
                'from_email' => 'contact@salah-times.in',
                'subject' => 'Salah Time Login Alert',
                'cc_email' => 'contact@salah-times.in',
            ],
            5 => [
                'email_content' => 'Resetting your password is easy.<br /> Enter the OTP below and choose your new password.',
                'from_name' => 'Salah Time',
                'from_email' => 'contact@salah-times.in',
                'subject' => 'Salah Time Password Reset OTP',
                'cc_email' => 'contact@salah-times.in',
            ],
            6 => [
                'email_content' => 'We are writing to inform you that your Salah Time password has been successfully updated. Your account security is our top priority, and we encourage you to keep your password safe.',
                'from_name' => 'Salah Time',
                'from_email' => 'contact@salah-times.in',
                'subject' => 'Salah Time Password Updated',
                'cc_email' => 'contact@salah-times.in',
            ],
            8 => [
                'email_content' => 'Your email address has been successfully verified on Salah Time. Thank you for helping us keep your account secure.',
                'from_name' => 'Salah Time',
                'from_email' => 'contact@salah-times.in',
                'subject' => 'Salah Time Email Verified',
                'cc_email' => 'contact@salah-times.in',
            ],
        ];
    }

    private function salahTimeTemplate(): string
    {
        return '<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
          </head>
          <body style="margin:0;padding:0">
            <table align="center" border="0" cellpadding="0" cellspacing="0" style="background-color:#eaeced" width="100%">
              <tr><td height="40" style="font-size:1px">&nbsp;</td></tr>
              <tr>
                <td align="center">
                  <a href="index.html" style="color:#000;font-size:40px;font-weight:700;font-family:helvetica,arial,sans-serif;text-decoration:none">Salah Time</a>
                </td>
              </tr>
              <tr><td height="25" style="font-size:1px">&nbsp;</td></tr>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" style="background-color:#eaeced" width="100%">
              <tr>
                <td>
                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:10px;overflow:hidden" width="70%">
                    <tr><td height="50" style="background-color:#fff;font-size:1px">&nbsp;</td></tr>
                    <tr>
                      <td align="center" style="background-color:#fff">
                        <table align="center" border="0" cellpadding="0" cellspacing="0" width="65%">
                          template_subject_content
                          <tr><td height="20" style="font-size:1px">&nbsp;</td></tr>
                          <tr>
                            <td align="center" style="font-size:16px;line-height:24px;color:#233252;font-family:helvetica,arial,sans-serif">template_email_content</td>
                          </tr>
                          <tr><td height="60" style="font-size:1px">&nbsp;</td></tr>
                          template_button_content
                          <tr>
                            <td align="center" height="50" style="font-size:13px;font-family:helvetica,arial,sans-serif;color:#666;line-height:24px">&copy; 2026 Salah Time.</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <table align="center" border="0" cellpadding="0" cellspacing="0" style="background-color:#eaeced" width="100%">
              <tr><td height="70" style="font-size:1px">&nbsp;</td></tr>
            </table>
          </body>
        </html>';
    }
}
