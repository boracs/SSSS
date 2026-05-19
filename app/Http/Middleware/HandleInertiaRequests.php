<?php

namespace App\Http\Middleware;

use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\User;
use App\Models\UserBono;
use App\Support\AcademyContact;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),

            // Útil para handshakes/depuración desde el frontend (también para invitados)
            'csrf' => csrf_token(),

            'auth' => [
                'user' => $request->user()
                    ? [
                        'id' => $request->user()->id,
                        'name' => $request->user()->name ?? $request->user()->nombre,
                        'nombre' => $request->user()->nombre,
                        'apellido' => $request->user()->apellido,
                        'email' => $request->user()->email,
                        'role' => $request->user()->role ?? 'user',
                        'is_vip' => (bool) ($request->user()->is_vip ?? false),
                        'numeroTaquilla' => $request->user()->numeroTaquilla,
                        'has_active_locker' => (bool) $request->user()->hasActiveLocker(),
                        'has_locker' => (bool) $request->user()->hasActiveLocker(),
                    ]
                    : null,
            ],

            'academyClassReservationDepositEur' => (float) config('services.academy.class_reservation_deposit_eur', 30),

            /** Texto genérico del WhatsApp de la escuela (plantillas, enlaces, etc.). */
            'academyWhatsappDisplay' => AcademyContact::whatsappDisplay(),

            // 🔥 Flash messages (nunca enviar pegados de código / cadenas enormes al cliente)
            'flash' => [
                'success' => self::sanitizeFlashValue($request->session()->get('success')),
                'error' => self::sanitizeFlashValue($request->session()->get('error')),
                'payment_lesson_id' => $request->session()->get('payment_lesson_id'),
            ],

            'adminStats' => function () use ($request) {
                $user = $request->user();
                if (! $user || ($user->role ?? null) !== 'admin') {
                    return null;
                }

                $unreviewedLessons = LessonUser::query()
                    ->whereNull('reviewed_at')
                    ->count();
                $unreviewedRentals = Booking::query()
                    ->whereNull('reviewed_at')
                    ->count();
                $unreviewedBonos = UserBono::query()
                    ->whereNull('reviewed_at')
                    ->count();
                $unreviewedPaymentsTotal = $unreviewedLessons + $unreviewedRentals + $unreviewedBonos;
                $unreviewedLockersTotal = PagoCuota::query()
                    ->whereNull('reviewed_at')
                    ->count();
                $pendingCuotas = User::query()
                    ->whereNotNull('numeroTaquilla')
                    ->whereNotNull('fecha_vencimiento_cuota')
                    ->whereDate('fecha_vencimiento_cuota', '<', now()->toDateString())
                    ->count();
                $vipRenewalAlertCount = User::query()->needsRenewal()->count();

                return [
                    'unreviewed_payments_total' => $unreviewedPaymentsTotal,
                    'unreviewed_rentals_count' => $unreviewedRentals,
                    'unreviewed_lockers_total' => $unreviewedLockersTotal,
                    'pendingCuotasCount' => $pendingCuotas,
                    'vipRenewalAlertCount' => $vipRenewalAlertCount,
                ];
            },
        ];
    }

    private static function sanitizeFlashValue(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        if (strlen($value) > 8000) {
            return null;
        }

        if (str_contains($value, '<?php')) {
            return null;
        }

        if (str_contains($value, 'namespace App\\Listeners') || str_contains($value, 'namespace App\\Http')) {
            return null;
        }

        if (str_contains($value, 'declare(strict_types')) {
            return null;
        }

        return $value;
    }
}