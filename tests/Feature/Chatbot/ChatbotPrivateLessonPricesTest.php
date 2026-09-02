<?php

declare(strict_types=1);

use App\Models\PrivateLessonTariff;
use App\Services\Academy\PrivateLessonPricingService;
use App\Services\Chatbot\ChatbotService;
use Database\Seeders\PrivateLessonTariffSeeder;

beforeEach(function () {
    PrivateLessonTariffSeeder::ensure();
    app(PrivateLessonPricingService::class)->forgetTariffCache();
});

test('el FAQ de clase particular y el de precio comparten la tarifa viva de BD', function () {
    $service = app(ChatbotService::class);

    $particular = $service->reply('quiero una clase particular');
    $precio = $service->reply('precio de una clase particular');

    expect($particular->context)->toBe('classes.private')
        ->and($precio->context)->toBe('classes.pricing');

    foreach (app(PrivateLessonPricingService::class)->tariffTable() as $people => $cents) {
        $euros = (int) ($cents / 100);
        expect($particular->response)->toContain((string) $euros.'€')
            ->and($precio->response)->toContain((string) $euros.'€');
    }
});

test('al editar la tarifa en BD el FAQ de particulares refleja el nuevo precio', function () {
    PrivateLessonTariff::query()->where('people', 1)->update(['price_cents' => 9900]);
    app(PrivateLessonPricingService::class)->forgetTariffCache();

    $reply = app(ChatbotService::class)->reply('clase particular');

    expect($reply->response)->toContain('99€')
        ->and($reply->response)->not->toContain('**80€**');
});
