<?php

namespace app\components\timingboard;

/**
 * Claude Messages API with structured outputs (JSON schema), so the reply always decodes.
 * The official anthropic-ai/sdk package needs PHP 8.1+, hence the raw request.
 */
class ClaudeBoardProvider extends TimingBoardProvider
{
    private const ENDPOINT = 'https://api.anthropic.com/v1/messages';
    private const MODELS_ENDPOINT = 'https://api.anthropic.com/v1/models/';
    private const API_VERSION = '2023-06-01';
    // Retries a safety-classifier decline on Anthropic's recommended fallback model.
    private const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

    public function buildRequest(string $imageBase64, string $mime, string $prompt, array $schema): array
    {
        return [
            'url' => self::ENDPOINT,
            'headers' => [
                'content-type: application/json',
                'x-api-key: ' . $this->apiKey,
                'anthropic-version: ' . self::API_VERSION,
                'anthropic-beta: ' . self::FALLBACK_BETA,
            ],
            'body' => [
                'model' => $this->model,
                'max_tokens' => 16000,
                'fallbacks' => 'default',
                'output_config' => [
                    'effort' => 'medium',
                    'format' => [
                        'type' => 'json_schema',
                        'schema' => $schema,
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
                                'data' => $imageBase64,
                            ],
                        ],
                        ['type' => 'text', 'text' => $prompt],
                    ],
                ]],
            ],
        ];
    }

    public function parseResponse(array $response): string
    {
        if (($response['stop_reason'] ?? null) === 'refusal') {
            throw new \RuntimeException('This photo could not be read. Please try another photo.');
        }

        $text = '';
        foreach ($response['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                $text .= $block['text'];
            }
        }
        return $text;
    }

    public function buildTestRequest(): array
    {
        return [
            'url' => self::MODELS_ENDPOINT . rawurlencode($this->model),
            'headers' => [
                'x-api-key: ' . $this->apiKey,
                'anthropic-version: ' . self::API_VERSION,
            ],
        ];
    }
}
