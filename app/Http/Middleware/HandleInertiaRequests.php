<?php

namespace App\Http\Middleware;

use App\Services\Academy\PrivateLessonPricingService;
use App\Support\AcademyContact;
use App\Support\AcademySocialLinks;
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
                        'telefono' => $request->user()->telefono,
                        'role' => $request->user()->role ?? 'user',
                        'is_vip' => (bool) ($request->user()->is_vip ?? false),
                        'numeroTaquilla' => $request->user()->numeroTaquilla,
                        'has_physical_locker' => $request->user()->hasPhysicalLocker(),
                        'has_virtual_locker' => $request->user()->hasSharedLocker(),
                        'has_active_locker' => $request->user()->hasPhysicalLocker(),
                        'has_locker' => $request->user()->hasPhysicalLocker(),
                        'has_store_discount_access' => $request->user()->canAccessStoreWithMemberDiscount(),
                        'can_access_auctions' => $request->user()->role === 'admin'
                            || $request->user()->canAccessAuctions(),
                    ]
                    : null,
            ],

            'academyClassReservationDepositEur' => (float) config('services.academy.class_reservation_deposit_eur', 30),

            // Tarifa de particulares: el frontend calcula total/señal en vivo
            // con las mismas reglas que PrivateLessonPricingService.
            'academyPrivateLesson' => $this->privateLessonPricing(),

            'sponsors' => collect(config('services.sponsors', []))
                ->map(function (array $sponsor, string $id) {
                    return [
                        'id' => $id,
                        'name' => $sponsor['name'] ?? $id,
                        'url' => $sponsor['url'] ?? null,
                        'tagline' => $sponsor['tagline'] ?? null,
                        'logo' => $id,
                        'active' => filter_var($sponsor['active'] ?? true, FILTER_VALIDATE_BOOLEAN),
                    ];
                })
                ->values()
                ->filter(fn (array $sponsor) => $sponsor['active'])
                ->all(),

            /** Texto genérico del WhatsApp de la escuela (plantillas, enlaces, etc.). */
            'academyWhatsappDisplay' => AcademyContact::whatsappDisplay(),
            /** URL base wa.me de la escuela (sin mensaje). */
            'academyWhatsappUrl' => AcademyContact::whatsappBaseUrl(),

            /** Redes públicas (footer): solo entradas con URL configurada. */
            'socialLinks' => AcademySocialLinks::publicLinks(),

            // 🔥 Flash messages (nunca enviar pegados de código / cadenas enormes al cliente)
            'flash' => [
                'success' => self::sanitizeFlashValue($request->session()->get('success')),
                'error' => self::sanitizeFlashValue($request->session()->get('error')),
                // Bloqueos de acceso (cuota/taquilla): modal rojo que el usuario debe cerrar
                'access_alert' => self::sanitizeFlashValue($request->session()->get('access_alert')),
                'payment_lesson_id' => $request->session()->get('payment_lesson_id'),
            ],
        ];
    }

    /**
     * @return array{tariff_cents: array<int, int>, base_minutes: int, deposit_percentage: float}
     */
    private function privateLessonPricing(): array
    {
        $pricing = app(PrivateLessonPricingService::class);

        return [
            'tariff_cents' => $pricing->tariffTable(),
            'base_minutes' => $pricing->baseMinutes(),
            'deposit_percentage' => $pricing->depositPercentage(),
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