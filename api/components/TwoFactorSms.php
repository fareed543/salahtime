<?php

namespace app\components;

/**
 * Sends an OTP through 2Factor.in.
 *
 * With a template name, 2Factor sends an SMS using that DLT-approved template. Without one, 2Factor
 * delivers the OTP as a voice call. Template names are listed in the 2Factor dashboard under
 * OTP Services > Manage OTP Templates; 2Factor has no API to list them.
 */
class TwoFactorSms
{
    /**
     * @return array{ok: bool, httpStatus: int, error: string, providerStatus: ?string, details: ?string}
     */
    public static function sendOtp(string $apiKey, string $mobile, string $otp, string $template = ''): array
    {
        $url = 'https://2factor.in/API/V1/'
            . rawurlencode($apiKey) . '/SMS/'
            . rawurlencode($mobile) . '/'
            . rawurlencode($otp);
        if ($template !== '') {
            $url .= '/' . rawurlencode($template);
        }

        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
        ]);
        $body = curl_exec($curl);
        $httpStatus = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = (string)curl_error($curl);
        curl_close($curl);

        $response = json_decode((string)$body, true);
        $providerStatus = isset($response['Status']) ? (string)$response['Status'] : null;

        return [
            'ok' => $error === ''
                && $httpStatus >= 200
                && $httpStatus < 300
                && strcasecmp((string)$providerStatus, 'Success') === 0,
            'httpStatus' => $httpStatus,
            'error' => $error,
            'providerStatus' => $providerStatus,
            'details' => isset($response['Details']) ? (string)$response['Details'] : null,
        ];
    }
}
