<?php

declare(strict_types=1);

namespace Tests\Unit\Chatbot;

use App\Exceptions\Chatbot\GeminiUnavailableException;
use App\Services\Chatbot\GoogleAIService;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class GoogleAIServiceKeyHeaderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['services.gemini.key' => 'test-gemini-key-l4']);
    }

    #[Test]
    public function api_key_goes_in_header_not_query_string(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => 'ok']]]],
                ],
            ], 200),
        ]);

        $text = app(GoogleAIService::class)->generateReply('sys', [], 'hola');

        $this->assertSame('ok', $text);

        Http::assertSent(function ($request): bool {
            $url = $request->url();

            return $request->hasHeader('x-goog-api-key', 'test-gemini-key-l4')
                && ! str_contains($url, 'key=')
                && ! str_contains($url, 'test-gemini-key-l4');
        });
    }

    #[Test]
    public function error_logs_do_not_contain_the_api_key(): void
    {
        $logged = [];
        Event::listen(MessageLogged::class, function (MessageLogged $event) use (&$logged): void {
            $logged[] = $event->message.' '.json_encode($event->context);
        });

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response(['error' => 'boom'], 500),
        ]);

        try {
            app(GoogleAIService::class)->generateReply('sys', [], 'hola');
            $this->fail('Se esperaba GeminiUnavailableException');
        } catch (GeminiUnavailableException $e) {
            $this->assertStringNotContainsString('test-gemini-key-l4', $e->getMessage());
        }

        $this->assertNotSame([], $logged);
        foreach ($logged as $line) {
            $this->assertStringNotContainsString('test-gemini-key-l4', $line);
        }
    }
}
