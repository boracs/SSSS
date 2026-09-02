<?php

declare(strict_types=1);

use App\Exceptions\TransactionRequiredException;
use App\Services\AvailabilityService;
use App\Support\BusinessDateTime;

uses(Tests\TestCase::class);

/**
 * Pest solo aplica RefreshDatabase en Feature: ahí siempre hay transacción abierta
 * y evaluate() no puede lanzar. Este test arranca Laravel sin RefreshDatabase.
 */
test('evaluate fuera de transacción lanza TransactionRequiredException', function () {
    $start = BusinessDateTime::now()->addDays(10)->setTime(16, 0);

    app(AvailabilityService::class)->evaluate($start, $start->copy()->addMinutes(90), 1);
})->throws(TransactionRequiredException::class);
