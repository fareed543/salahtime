<?php

namespace app\components\timingboard;

/**
 * OpenAI (ChatGPT) Chat Completions with image input and a strict JSON schema response format,
 * so the reply decodes into the same shape as Claude's. The photo goes inline as a base64 data URL.
 */
class OpenAiBoardProvider extends TimingBoardProvider
{
    private const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
    private const MODELS_ENDPOINT = 'https://api.openai.com/v1/models/';

    public function buildRequest(string $imageBase64, string $mime, string $prompt, array $schema): array
    {
        return [
            'url' => self::ENDPOINT,
            'headers' => [
                'content-type: application/json',
                'authorization: Bearer ' . $this->apiKey,
            ],
            'body' => [
                'model' => $this->model,
                'max_completion_tokens' => 16000,
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => [
                        'name' => 'timing_board',
                        'strict' => true,
                        'schema' => $schema,
                    ],
                ],
                'messages' => [[
                    'role' => 'user',
                    'content' => [
                        [
                            'type' => 'image_url',
                            'image_url' => ['url' => 'data:' . $mime . ';base64,' . $imageBase64],
                        ],
                        ['type' => 'text', 'text' => $prompt],
                    ],
                ]],
            ],
        ];
    }

    public function parseResponse(array $response): string
    {
        $choice = $response['choices'][0] ?? [];
        if (!empty($choice['message']['refusal']) || ($choice['finish_reason'] ?? null) === 'content_filter') {
            throw new \RuntimeException('This photo could not be read. Please try another photo.');
        }
        return (string)($choice['message']['content'] ?? '');
    }

    public function buildTestRequest(): array
    {
        return [
            'url' => self::MODELS_ENDPOINT . rawurlencode($this->model),
            'headers' => ['authorization: Bearer ' . $this->apiKey],
        ];
    }
}
