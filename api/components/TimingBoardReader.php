<?php

namespace app\components;

use app\components\timingboard\ClaudeBoardProvider;
use app\components\timingboard\OpenAiBoardProvider;
use app\components\timingboard\TimingBoardProvider;
use Yii;

/**
 * Reads Azan/Jamat times from a photo of a masjid's timing board with an AI vision model: Claude
 * or ChatGPT, whichever is selected in the back office (OcrSettings). Both are asked for JSON that
 * matches the same schema, so the reply always decodes into the shape below.
 *
 * The result is only a draft: the app shows it in the timing editor for the user to check
 * before anything is saved.
 */
class TimingBoardReader
{
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
        $provider = self::provider(OcrSettings::get());
        if ($provider === null) {
            throw new \RuntimeException('Reading timing boards is not configured on the server.');
        }

        $text = $provider->readBoard(
            base64_encode((string)file_get_contents($imagePath)),
            $mime,
            self::PROMPT,
            self::schema()
        );

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

    /**
     * The selected provider from normalized OcrSettings values, or null when it has no API key.
     */
    public static function provider(array $settings): ?TimingBoardProvider
    {
        $selected = $settings[$settings['provider']] ?? [];
        if (($selected['apiKey'] ?? '') === '') {
            return null;
        }
        return $settings['provider'] === 'openai'
            ? new OpenAiBoardProvider($selected['apiKey'], $selected['model'])
            : new ClaudeBoardProvider($selected['apiKey'], $selected['model']);
    }

    public static function schema(): array
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
}
