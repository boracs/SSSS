<?php

namespace App\Http\Middleware;

use App\Models\Booking;
use App\Models\LessonUser;
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
                        'numeroTaquilla' => $request->user()->numeroTaquilla,
                    ]
                    : null,
            ],

            // 🔥 Flash messages
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
                'payment_lesson_id' => $request->session()->get('payment_lesson_id'),
            ],

            'adminStats' => function () use ($request) {
                $user = $request->user();
                if (! $user || ($user->role ?? null) !== 'admin') {
                    return null;
                }

                $lessonSubmitted = LessonUser::query()
                    ->where('payment_status', LessonUser::PAYMENT_SUBMITTED)
                    ->count();
                $rentalSubmitted = Booking::query()
                    ->where('payment_status', Booking::PAYMENT_SUBMITTED)
                    ->count();

                return [
                    'submittedPaymentsCount' => $lessonSubmitted + $rentalSubmitted,
                ];
            },
        ];
    }
}