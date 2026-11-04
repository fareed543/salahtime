<?php

namespace app\components;

use Yii;

/**
 * "OCR Settings" section of the back-office settings: which AI provider reads masjid timing-board
 * photos (TimingBoardReader), with its API key and model. Each provider keeps its own key and model,
 * so switching back and forth loses nothing. Until an admin saves the section, Claude with the .env
 * key (ANTHROPIC_API_KEY) is used, exactly as before the section existed.
 */
class OcrSettings
{
    public const PROVIDERS = [
        'claude' => 'Claude (Anthropic)',
        'openai' => 'ChatGPT (OpenAI)',
    ];

    public static function defaults(): array
    {
        return [
            'provider' => 'claude',
            'claude' => [
                'apiKey' => (string)(Yii::$app->params['anthropicApiKey'] ?? ''),
                'model' => (string)(Yii::$app->params['timingBoardModel'] ?? 'claude-opus-5-5'),
            ],
            'openai' => [
                'apiKey' => (string)(Yii::$app->params['openaiApiKey'] ?? ''),
                'model' => (string)(Yii::$app->params['timingBoardOpenAiModel'] ?? 'gpt-5'),
            ],
        ];
    }

    public static function get(): array
    {
        $stored = AppSettings::section('ocr');
        return $stored === null ? self::defaults() : self::normalize($stored);
    }

    /**
     * A blank apiKey keeps the key already in use and a blank model falls back to the default,
     * so the secret never has to round-trip through the browser.
     */
    public static function normalize(array $values, ?array $current = null): array
    {
        $defaults = self::defaults();
        $current = $current === null ? $defaults : self::normalize($current);
        $provider = (string)($values['provider'] ?? 'claude');

        $normalized = ['provider' => isset(self::PROVIDERS[$provider]) ? $provider : 'claude'];
        foreach (array_keys(self::PROVIDERS) as $key) {
            $entered = is_array($values[$key] ?? null) ? $values[$key] : [];
            $apiKey = trim((string)($entered['apiKey'] ?? ''));
            $model = trim((string)($entered['model'] ?? ''));
            $normalized[$key] = [
                'apiKey' => $apiKey !== '' ? $apiKey : (string)($current[$key]['apiKey'] ?? ''),
                'model' => $model !== '' ? $model : $defaults[$key]['model'],
            ];
        }
        return $normalized;
    }

    public static function validate(array $values): ?string
    {
        foreach (self::PROVIDERS as $key => $label) {
            $apiKey = $values[$key]['apiKey'];
            if ($apiKey !== '' && !preg_match('/^[A-Za-z0-9_-]{20,300}$/', $apiKey)) {
                return "The {$label} API key may only contain letters, numbers, hyphens and underscores.";
            }
            if (!preg_match('/^[A-Za-z0-9._:-]{2,100}$/', $values[$key]['model'])) {
                return "The {$label} model may only contain letters, numbers, dots, colons, hyphens and underscores.";
            }
        }
        if ($values[$values['provider']]['apiKey'] === '') {
            return 'Enter the ' . self::PROVIDERS[$values['provider']] . ' API key.';
        }
        return null;
    }

    /**
     * Back-office payload: API keys are never returned, only whether one is set and its last 4 characters.
     */
    public static function describe(array $values): array
    {
        $described = ['provider' => $values['provider']];
        $keys = [];
        $defaultModels = [];
        foreach (array_keys(self::PROVIDERS) as $key) {
            $apiKey = $values[$key]['apiKey'];
            $described[$key] = ['apiKey' => '', 'model' => $values[$key]['model']];
            $keys[$key] = ['set' => $apiKey !== '', 'hint' => $apiKey !== '' ? substr($apiKey, -4) : ''];
            $defaultModels[$key] = self::defaults()[$key]['model'];
        }

        return [
            'values' => $described,
            'meta' => [
                'providers' => self::PROVIDERS,
                'keys' => $keys,
                'defaultModels' => $defaultModels,
            ],
        ];
    }
}
