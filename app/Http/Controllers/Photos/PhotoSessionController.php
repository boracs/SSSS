<?php

declare(strict_types=1);

namespace App\Http\Controllers\Photos;

use App\Actions\Payments\InitiatePaymentAction;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\Http\Controllers\Controller;
use App\Models\PhotoSession;
use App\Models\PhotoSessionBooking;
use App\Services\Photos\PhotoBookingService;
use App\Services\Seo\PublicPageSeoService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

final class PhotoSessionController extends Controller
{
    public function __construct(
        private readonly PhotoBookingService $photos,
        private readonly InitiatePaymentAction $initiatePayment,
        private readonly PublicPageSeoService $pageSeo,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Servicios_Fotos', [
            'seo' => $this->pageSeo->serviciosFotos()->toArray(),
            'sessions' => $this->photos->buildPublicSessionsPayload(),
        ]);
    }

    public function book(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $guestRules = $user === null
            ? [
                'guest_first_name' => ['required', 'string', 'max:100'],
                'guest_email' => ['required', 'email', 'max:191'],
            ]
            : [
                'guest_first_name' => ['nullable', 'string', 'max:100'],
                'guest_email' => ['nullable', 'email', 'max:191'],
            ];

        $validated = $request->validate(array_merge([
            'photo_session_id' => ['required', 'integer', 'exists:photo_sessions,id'],
            'fecha_inicio' => ['required', 'date', 'after:now'],
            'party_size' => ['nullable', 'integer', 'min:1', 'max:20'],
            'guest_last_name' => ['nullable', 'string', 'max:100'],
            'guest_phone' => ['nullable', 'string', 'max:40'],
        ], $guestRules));

        $partySize = max(1, (int) ($validated['party_size'] ?? 1));

        try {
            $booking = $this->photos->createBooking([
                'photo_session_id' => (int) $validated['photo_session_id'],
                'fecha_inicio' => $validated['fecha_inicio'],
                'party_size' => $partySize,
                'user_id' => $user?->id,
                'guest_first_name' => $validated['guest_first_name'] ?? ($user?->nombre),
                'guest_last_name' => $validated['guest_last_name'] ?? ($user?->apellido),
                'guest_phone' => $validated['guest_phone'] ?? ($user?->telefono),
                'guest_email' => $validated['guest_email'] ?? ($user?->email),
                'is_admin_guest' => $user === null,
                'payment_method' => 'card',
                'expires_in_minutes' => $this->photos->pendingUnpaidExpirationMinutes(),
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('PhotoSessionController::book create failed', ['error' => $e->getMessage()]);

            return back()->with('error', 'No se pudo crear la reserva de fotos.');
        }

        $session = PhotoSession::query()->find($booking->photo_session_id);
        $dto = new InitiatePaymentDto(
            payableType: PhotoSessionBooking::class,
            payableId: (int) $booking->id,
            lineItems: [
                new PaymentLineItemDto(
                    name: 'Fotos — '.($session?->nombre ?? 'Sesión'),
                    description: "Reserva #{$booking->id} · {$partySize} persona(s)",
                    unitAmountCents: (int) $booking->precio_pagado_cents,
                    quantity: 1,
                ),
            ],
            successPath: '/pago/exito',
            cancelPath: '/servicios/fotos',
            customerEmail: $booking->guest_email ?? $user?->email,
            metadata: ['photo_session_booking_id' => (string) $booking->id],
        );

        try {
            $checkoutUrl = $this->initiatePayment->execute($dto);
        } catch (\RuntimeException $e) {
            Log::error('PhotoSessionController::book Stripe failed', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
            ]);
            $booking->update([
                'status' => PhotoSessionBooking::STATUS_CANCELLED,
                'admin_notes' => 'Cancelada: fallo al abrir pasarela Stripe.',
            ]);

            return back()->with('error', 'No se pudo iniciar el pago. Inténtalo de nuevo.');
        }

        return redirect()->away($checkoutUrl);
    }
}
