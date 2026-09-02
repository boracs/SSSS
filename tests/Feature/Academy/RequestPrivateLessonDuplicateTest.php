<?php

declare(strict_types=1);

use App\Actions\Academy\RequestPrivateLessonAction;
use App\Events\PrivateLessonRequestedEvent;
use App\Http\Requests\Academy\RequestPrivateLessonRequest;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use App\Services\Academy\PrivateLessonPricingService;
use App\Support\BusinessDateTime;
use Database\Seeders\PrivateLessonTariffSeeder;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    PrivateLessonTariffSeeder::ensure();
    app(PrivateLessonPricingService::class)->forgetTariffCache();
    Event::fake([PrivateLessonRequestedEvent::class]);
});

/**
 * @param  array<string, mixed>  $overrides
 */
function l3PrivateRequest(array $overrides = [], ?User $user = null): RequestPrivateLessonRequest
{
    $start = BusinessDateTime::now()->addDay()->setTime(10, 0);
    $payload = array_merge([
        'date' => $start->toDateString(),
        'start' => '10:00',
        'duration_minutes' => 90,
        'participants' => [
            ['first_name' => 'Ane', 'last_name' => 'Zubiri', 'age' => 28],
        ],
        'guest_first_name' => 'Ane',
        'guest_last_name' => 'Zubiri',
        'guest_email' => 'ane@example.com',
        'guest_phone' => '600111222',
    ], $overrides);

    if ($user !== null) {
        unset($payload['guest_first_name'], $payload['guest_last_name'], $payload['guest_email'], $payload['guest_phone']);
    }

    $request = RequestPrivateLessonRequest::create('/academia/particular/request', 'POST', $payload);
    $request->setUserResolver(fn () => $user);
    $request->setContainer(app())->setRedirector(app('redirect'));
    $request->validateResolved();

    return $request;
}

test('el doble clic del socio deja una sola particular en la misma franja', function () {
    $user = User::factory()->create(['role' => 'user']);
    $action = app(RequestPrivateLessonAction::class);

    $primera = $action->execute($user, l3PrivateRequest([], $user));
    $segunda = $action->execute($user->fresh(), l3PrivateRequest([], $user));

    expect($primera['ok'])->toBeTrue()
        ->and($segunda['ok'])->toBeFalse()
        ->and($segunda['message'])->toContain('Ya tienes una solicitud');

    expect(Lesson::query()->where('modality', Lesson::MODALITY_PARTICULAR)->count())->toBe(1)
        ->and(LessonUser::query()->where('user_id', $user->id)->count())->toBe(1);
});

test('el doble clic del invitado con el mismo email deja una sola particular', function () {
    $action = app(RequestPrivateLessonAction::class);

    $primera = $action->execute(null, l3PrivateRequest());
    $segunda = $action->execute(null, l3PrivateRequest(['guest_email' => 'Ane@Example.com']));

    expect($primera['ok'])->toBeTrue()
        ->and($segunda['ok'])->toBeFalse()
        ->and($segunda['message'])->toContain('Ya hay una solicitud activa');

    expect(Lesson::query()->where('modality', Lesson::MODALITY_PARTICULAR)->count())->toBe(1);
});

test('dos socios distintos pueden pedir particulares solapadas (pool de 2 monitores)', function () {
    $uno = User::factory()->create(['role' => 'user']);
    $dos = User::factory()->create(['role' => 'user']);
    $action = app(RequestPrivateLessonAction::class);

    $a = $action->execute($uno, l3PrivateRequest([], $uno));
    $b = $action->execute($dos, l3PrivateRequest([], $dos));

    expect($a['ok'])->toBeTrue()
        ->and($b['ok'])->toBeTrue();

    expect(Lesson::query()->where('modality', Lesson::MODALITY_PARTICULAR)->count())->toBe(2);
});
