<?php

namespace app\components\timingboard;

use Yii;

/**
 * One AI provider that can read a timing-board photo for TimingBoardReader. Subclasses only build
 * the provider's request and pull the model's JSON text out of its reply; sending, retrying and
 * error messages are shared so every provider behaves the same for the user.
 *
 * Raw curl, no SDK: the API still runs on PHP 7.4. Request headers (which hold the API key) and
 * request bodies are never logged.
 */
abstract class TimingBoardProvider
{
    /** @var string */
    protected $apiKey;
    /** @var string */
    protected $model;

    public function __construct(string $apiKey, string $model)
    {
        $this->apiKey = $apiKey;
        $this->model = $model;
    }

    /**
     * @return array{url: string, headers: string[], body: array}
     */
    abstract public function buildRequest(string $imageBase64, string $mime, string $prompt, array $schema): array;

    /**
     * @return string the model's JSON text
     * @throws \RuntimeException with a user-facing message when the model declined the photo
     */
    abstract public function parseResponse(array $response): string;

    /**
     * A free request that only succeeds when both the key and the model are valid.
     *
     * @return array{url: string, headers: string[]}
     */
    abstract public function buildTestRequest(): array;

    /**
     * @return string the model's JSON text
     * @throws \RuntimeException with a user-facing message
     */
    public function readBoard(string $imageBase64, string $mime, string $prompt, array $schema): string
    {
        return $this->parseResponse(self::post($this->buildRequest($imageBase64, $mime, $prompt, $schema)));
    }

    /**
     * @return string|null null when the key and model work, otherwise what went wrong
     */
    public function testConnection(): ?string
    {
        $request = $this->buildTestRequest();
        $curl = curl_init($request['url']);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => $request['headers'],
        ]);
        $raw = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);

        if ($raw === false) {
            return 'Could not reach the provider: ' . $error;
        }
        if ($status === 200) {
            return null;
        }
        if ($status === 401 || $status === 403) {
            return 'The API key was rejected.';
        }
        if ($status === 404) {
            return "Model \"{$this->model}\" was not found for this key.";
        }
        $decoded = json_decode((string)$raw, true);
        return "The provider returned HTTP {$status}"
            . (isset($decoded['error']['message']) ? ': ' . $decoded['error']['message'] : '.');
    }

    /**
     * @param array{url: string, headers: string[], body: array} $request
     */
    protected static function post(array $request): array
    {
        $curl = curl_init($request['url']);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_HTTPHEADER => $request['headers'],
            CURLOPT_POSTFIELDS => json_encode($request['body'], JSON_UNESCAPED_UNICODE),
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
