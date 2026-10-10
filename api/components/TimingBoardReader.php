<?php

namespace app\components;

use Yii;

/**
 * Reads Azan/Jamat times from a photo of a masjid's timing board using Claude's vision model.
 *
 * Calls the Messages API over HTTPS directly: the official anthropic-ai/sdk package needs
 * PHP 8.1+, and this API still runs on PHP 7.4. The response is constrained to a JSON schema
 * (structured outputs), so it always decodes into the shape below.
 *
 * The result is only a draft: the app shows it in the timing editor for the user to check
 * before anything is saved.
 */
class TimingBoardReader
{
    private const ENDPOINT = 'https://api.anthropic.com/v1/messages';
    private const API_VERSION = '2023-06-01';
    // Retries a safety-classifier decline on Anthropic's recommended fallback model.
    private const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

    private const PROMPT = <<<'TXT'
This is a photo of the salah (prayer) timing board of a masjid. Read the Azan and Jamat
(iqamah) time for each prayer shown on the board.

Rules:
- Return only these prayers, using exactly these names: Fajr, Dhuhr, Asr, Maghrib, Isha, Juma.
  Boards may write them differently (Zuhr/Zohar = Dhuhr, Jumu'ah/Jumma = Juma, Esha = Isha,
  or in Urdu, Arabic or Hindi script); map them to these names. Leave out any other rows
  (sunrise, Ishraq, Taraweeh, Eid and so on), and leave out a prayer the board does not show.
- Write every time as 12-hour "hh:mm AM" or "hh:mm PM", for example "05:30 AM" or "01:15 PM".
  Boards often omit AM/PM: decide it from the prayer (Fajr is AM; Dhuhr, Asr, Maghrib, Isha
  and Juma are PM, except a Dhuhr or Juma time of 11:xx or 12:xx).
- If the board shows only one time for a prayer, put it in jamat and leave azan empty.
- Use an empty string for anything you cannot read. Never guess a time that is not visible.
- If the photo is not a timing board, return an empty timings list and say so in notes.
TXT;

    /**
     * @return array{timings: array<int, array{salah: string, azan: string, jamat: string}>, notes: string}
     * @throws \RuntimeException with a user-facing message when the board cannot be read
     */
    public static function read(string $imagePath, string $mime = 'image/jpeg'): array
    {
        $apiKey = (string)(Yii::$app->params['anthropicApiKey'] ?? '');
        if ($apiKey === '') {
            throw new \RuntimeException('Reading timing boards is not configured on the server.');
        }

        $body = [
            'model' => Yii::$app->params['timingBoardModel'] ?? 'claude-opus-5-5',
            'max_tokens' => 16000,
            'fallbacks' => 'default',
            'output_config' => [
                'effort' => 'medium',
                'format' => [
                    'type' => 'json_schema',
                    'schema' => self::schema(),
                ],
            ],
            'messages' => [[
                'role' => 'user',
                'content' => [
                    [
                        'type' => 'image',
                        'source' => [
                            'type' => 'base64',
                            'media_type' => $mime,
                            'data' => base64_encode((string)file_get_contents($imagePath)),
                        ],
                    ],
                    ['type' => 'text', 'text' => self::PROMPT],
                ],
            ]],
        ];

        $response = self::post($apiKey, $body);

        if (($response['stop_reason'] ?? null) === 'refusal') {
            throw new \RuntimeException('This photo could not be read. Please try another photo.');
        }

        $text = '';
        foreach ($response['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                $text .= $block['text'];
            }
        }

        $data = json_decode($text, true);
        if (!is_array($data) || !isset($data['timings']) || !is_array($data['timings'])) {
            Yii::error('Timing board: unexpected model output: ' . substr($text, 0, 500), __METHOD__);
            throw new \RuntimeException('Could not read timings from this photo. Please try again.');
        }

        return [
            'timings' => MasjidTimings::normalize($data['timings']),
            'notes' => (string)($data['notes'] ?? ''),
        ];
    }

    private static function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'timings' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'salah' => ['type' => 'string'],
                            'azan' => ['type' => 'string'],
                            'jamat' => ['type' => 'string'],
                        ],
                        'required' => ['salah', 'azan', 'jamat'],
                        'additionalProperties' => false,
                    ],
                ],
                'notes' => ['type' => 'string'],
            ],
            'required' => ['timings', 'notes'],
            'additionalProperties' => false,
        ];
    }

    private static function post(string $apiKey, array $body): array
    {
        $curl = curl_init(self::ENDPOINT);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_HTTPHEADER => [
                'content-type: application/json',
                'x-api-key: ' . $apiKey,
                'anthropic-version: ' . self::API_VERSION,
                'anthropic-beta: ' . self::FALLBACK_BETA,
            ],
            CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        ]);

        // One retry for rate limits, overload and server errors, which are usually transient.
        for ($attempt = 1; ; $attempt++) {
            $raw = curl_exec($curl);
            $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $retryable = $raw === false || $status === 429 || $status >= 500;
            if (!$retryable || $attempt >= 2) {
                break;
            }
            sleep(2);
        }

        if ($raw === false) {
            $error = curl_error($curl);
            curl_close($curl);
            Yii::error('Timing board: request failed: ' . $error, __METHOD__);
            throw new \RuntimeException('Could not reach the timing reader. Please try again.');
        }
        curl_close($curl);

        $decoded = json_decode((string)$raw, true);
        if ($status !== 200 || !is_array($decoded)) {
            $type = $decoded['error']['type'] ?? 'unknown';
            Yii::error("Timing board: HTTP {$status} ({$type}): " . substr((string)$raw, 0, 500), __METHOD__);
            throw new \RuntimeException($status === 429 || $status === 529
                ? 'The timing reader is busy. Please try again in a minute.'
                : 'Could not read timings from this photo. Please try again.');
        }
        return $decoded;
    }
}
