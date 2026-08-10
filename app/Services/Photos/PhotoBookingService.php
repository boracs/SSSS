<?php

declare(strict_types=1);

namespace App\Services\Photos;

use App\Actions\Photos\ConfirmPhotoBookingPaymentAction;
use App\Actions\Photos\RejectPhotoBookingPaymentAction;
use App\Models\PhotoSession;
use App\Models\PhotoSessionBooking;
use App\Models\User;
use App\Support\BusinessDateTime;
use App\Support\MoneyCents;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class PhotoBookingService
{
    public function __construct(
        private readonly ConfirmPhotoBookingPaymentAction $confirmPaymentAction,
        private readonly RejectPhotoBookingPaymentAction $rejectPaymentAction,
    ) {}

    /** @return Collection<int, PhotoSession> */
    public function listActiveSessions(): Collection
    {
        return PhotoSession::query()
            ->active()
            ->with('fotografo:id,nombre,apellido')
            ->orderBy('precio_cents')
            ->get();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function buildPublicSessionsPayload(): array
    {
        return $this->listActiveSessions()
            ->map(fn (PhotoSession $session): array => $this->sessionPublicRow($session))
            ->values()
            ->all();
    }

    /** Precio de catálogo: base + (personas × plus). */
    public function quotePriceCents(PhotoSession $session, int $partySize): int
    {
        return $session->quotePriceCents($partySize);
    }

    /**
     * @param  array{
     *   photo_session_id: int,
     *   fecha_inicio: string|Carbon,
     *   party_size?: int,
     *   user_id?: int|null,
     *   guest_first_name?: string|null,
     *   guest_last_name?: string|null,
     *   guest_phone?: string|null,
     *   guest_email?: string|null,
     *   is_admin_guest?: bool,
     *   precio_pagado_cents?: int|null,
     *   payment_method?: string|null,
     *   admin_notes?: string|null,
     *   expires_in_minutes?: int|null
     * }  $data
     */
    public function createBooking(array $data): PhotoSessionBooking
    {
        return DB::transaction(function () use ($data) {
            $session = PhotoSession::query()
                ->whereKey((int) $data['photo_session_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (! $session->activo) {
                throw ValidationException::withMessages([
                    'photo_session_id' => ['Este pack de fotos no está disponible.'],
                ]);
            }

            $partySize = max(1, (int) ($data['party_size'] ?? 1));
            if ($session->capacidad_maxima !== null && $partySize > (int) $session->capacidad_maxima) {
                throw ValidationException::withMessages([
                    'party_size' => ["Máximo {$session->capacidad_maxima} personas para este pack."],
                ]);
            }

            $start = $data['fecha_inicio'] instanceof Carbon
                ? $data['fecha_inicio']->copy()
                : BusinessDateTime::parseInAppTimezone((string) $data['fecha_inicio']);
            $end = $start->copy()->addMinutes((int) $session->duracion_minutos);

            $userId = isset($data['user_id']) ? (int) $data['user_id'] : null;
            $isGuest = (bool) ($data['is_admin_guest'] ?? false) || $userId === null || $userId === 0;

            // Catálogo: base + (personas × plus). Override solo con precio_pagado_cents (datáfono/excepciones).
            $precioPagado = array_key_exists('precio_pagado_cents', $data) && $data['precio_pagado_cents'] !== null
                ? (int) $data['precio_pagado_cents']
                : $this->quotePriceCents($session, $partySize);

            $expiresAt = null;
            if (isset($data['expires_in_minutes']) && (int) $data['expires_in_minutes'] > 0) {
                $expiresAt = BusinessDateTime::now()->addMinutes((int) $data['expires_in_minutes']);
            }

            return PhotoSessionBooking::query()->create([
                'photo_session_id' => $session->id,
                'user_id' => $isGuest ? null : $userId,
                'guest_first_name' => $data['guest_first_name'] ?? null,
                'guest_last_name' => $data['guest_last_name'] ?? null,
                'guest_phone' => $data['guest_phone'] ?? null,
                'guest_email' => $data['guest_email'] ?? null,
                'is_admin_guest' => $isGuest,
                'fecha_inicio' => $start,
                'fecha_fin' => $end,
                'party_size' => $partySize,
                'precio_pagado_cents' => $precioPagado,
                'status' => PhotoSessionBooking::STATUS_PENDING,
                'payment_status' => PhotoSessionBooking::PAYMENT_PENDING,
                'payment_method' => $data['payment_method'] ?? null,
                'admin_notes' => $data['admin_notes'] ?? null,
                'expires_at' => $expiresAt,
            ]);
        });
    }

    /**
     * Cancela checkouts públicos abandonados (pending + expires_at pasado).
     *
     * @return Collection<int, PhotoSessionBooking>
     */
    public function cancelExpiredPending(): Collection
    {
        return DB::transaction(function () {
            $now = BusinessDateTime::now();
            $ids = PhotoSessionBooking::query()
                ->where('status', PhotoSessionBooking::STATUS_PENDING)
                ->where('payment_status', PhotoSessionBooking::PAYMENT_PENDING)
                ->whereNotNull('expires_at')
                ->where('expires_at', '<', $now)
                ->pluck('id');

            $cancelled = collect();
            foreach ($ids as $id) {
                $locked = PhotoSessionBooking::query()->whereKey($id)->lockForUpdate()->first();
                if ($locked === null) {
                    continue;
                }
                if ($locked->status !== PhotoSessionBooking::STATUS_PENDING
                    || $locked->payment_status !== PhotoSessionBooking::PAYMENT_PENDING
                    || $locked->expires_at === null
                    || ! $locked->expires_at->isPast()) {
                    continue;
                }

                $locked->update([
                    'status' => PhotoSessionBooking::STATUS_CANCELLED,
                    'admin_notes' => trim((string) (($locked->admin_notes ?? '')."\nCaducada: pago no completado")),
                ]);
                $cancelled->push($locked->fresh());
            }

            return $cancelled;
        });
    }

    public function pendingUnpaidExpirationMinutes(): int
    {
        return max(1, (int) config('photos.pending_unpaid_expiration_minutes', 30));
    }

    public function confirmPayment(PhotoSessionBooking $booking, ?string $paymentMethod = null): PhotoSessionBooking
    {
        return $this->confirmPaymentAction->execute($booking, $paymentMethod)['booking'];
    }

    public function rejectPayment(PhotoSessionBooking $booking, ?string $adminNotes = null): PhotoSessionBooking
    {
        return $this->rejectPaymentAction->execute($booking, $adminNotes)['booking'];
    }

    /** @return Collection<int, PhotoSessionBooking> */
    public function bookingsForUser(User $user, int $limit = 50): Collection
    {
        return PhotoSessionBooking::query()
            ->with('session:id,nombre,duracion_minutos,precio_cents')
            ->where('user_id', $user->id)
            ->orderByDesc('fecha_inicio')
            ->limit($limit)
            ->get();
    }

    /** @return Collection<int, PhotoSessionBooking> */
    public function pendingPaymentBookings(int $limit = 100): Collection
    {
        return PhotoSessionBooking::query()
            ->with(['session:id,nombre', 'user:id,nombre,apellido,email,telefono'])
            ->where('payment_status', PhotoSessionBooking::PAYMENT_PENDING)
            ->whereIn('status', [PhotoSessionBooking::STATUS_PENDING])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * @return array{sessions: list<array<string, mixed>>, bookings: list<array<string, mixed>>}
     */
    public function buildAdminPayload(): array
    {
        $sessions = PhotoSession::query()
            ->with('fotografo:id,nombre,apellido')
            ->orderByDesc('activo')
            ->orderBy('nombre')
            ->get()
            ->map(fn (PhotoSession $s): array => [
                ...$this->sessionPublicRow($s),
                'fotografo_user_id' => $s->fotografo_user_id,
                'fotografo_nombre' => $s->fotografo
                    ? trim("{$s->fotografo->nombre} {$s->fotografo->apellido}")
                    : null,
                'activo' => (bool) $s->activo,
            ])
            ->values()
            ->all();

        $bookings = PhotoSessionBooking::query()
            ->with(['session:id,nombre', 'user:id,nombre,apellido,email,telefono'])
            ->orderByDesc('fecha_inicio')
            ->limit(200)
            ->get()
            ->map(fn (PhotoSessionBooking $b): array => $this->bookingAdminRow($b))
            ->values()
            ->all();

        return ['sessions' => $sessions, 'bookings' => $bookings];
    }

    /**
     * @param  array{
     *   nombre: string,
     *   descripcion?: string|null,
     *   precio_cents: int,
     *   plus_por_persona_cents?: int,
     *   duracion_minutos: int,
     *   capacidad_maxima?: int|null,
     *   fotografo_user_id?: int|null,
     *   activo?: bool
     * }  $data
     */
    public function upsertSession(?PhotoSession $session, array $data): PhotoSession
    {
        $payload = [
            'nombre' => trim((string) $data['nombre']),
            'descripcion' => $data['descripcion'] ?? null,
            'precio_cents' => (int) $data['precio_cents'],
            'plus_por_persona_cents' => max(0, (int) ($data['plus_por_persona_cents'] ?? 0)),
            'duracion_minutos' => (int) $data['duracion_minutos'],
            'capacidad_maxima' => isset($data['capacidad_maxima']) ? (int) $data['capacidad_maxima'] : null,
            'fotografo_user_id' => $data['fotografo_user_id'] ?? null,
            'activo' => (bool) ($data['activo'] ?? true),
        ];

        if ($session === null) {
            return PhotoSession::query()->create($payload);
        }

        $session->update($payload);

        return $session->fresh();
    }

    /** @return array<string, mixed> */
    private function sessionPublicRow(PhotoSession $session): array
    {
        $plus = (int) $session->plus_por_persona_cents;

        return [
            'id' => (int) $session->id,
            'nombre' => (string) $session->nombre,
            'descripcion' => $session->descripcion,
            'precio_cents' => (int) $session->precio_cents,
            'precio' => MoneyCents::centsToEuros((int) $session->precio_cents),
            'plus_por_persona_cents' => $plus,
            'plus_por_persona' => MoneyCents::centsToEuros($plus),
            'duracion_minutos' => (int) $session->duracion_minutos,
            'capacidad_maxima' => $session->capacidad_maxima !== null ? (int) $session->capacidad_maxima : null,
        ];
    }

    /** @return array<string, mixed> */
    public function bookingAdminRow(PhotoSessionBooking $booking): array
    {
        return [
            'id' => (int) $booking->id,
            'photo_session_id' => (int) $booking->photo_session_id,
            'session_nombre' => $booking->session?->nombre ?? 'Sesión',
            'user_id' => $booking->user_id,
            'display_name' => $booking->displayName(),
            'email' => $booking->user?->email ?? $booking->guest_email,
            'telefono' => $booking->user?->telefono ?? $booking->guest_phone,
            'fecha_inicio' => optional($booking->fecha_inicio)?->toIso8601String(),
            'fecha_fin' => optional($booking->fecha_fin)?->toIso8601String(),
            'fecha_pago' => optional($booking->fecha_pago)?->toIso8601String(),
            'party_size' => (int) $booking->party_size,
            'precio_pagado_cents' => (int) $booking->precio_pagado_cents,
            'precio_pagado' => MoneyCents::centsToEuros((int) $booking->precio_pagado_cents),
            'status' => $booking->status,
            'payment_status' => $booking->payment_status,
            'payment_method' => $booking->payment_method,
            'proof_url' => ! empty($booking->payment_proof_path)
                ? route('admin.photos.bookings.proof', $booking->id)
                : null,
            'admin_notes' => $booking->admin_notes,
            'is_admin_guest' => (bool) $booking->is_admin_guest,
            'expires_at' => optional($booking->expires_at)?->toIso8601String(),
            'is_expired' => $booking->isCheckoutExpired(),
            'can_confirm' => $booking->payment_status === PhotoSessionBooking::PAYMENT_PENDING
                && $booking->status === PhotoSessionBooking::STATUS_PENDING
                && ! $booking->isCheckoutExpired(),
            'can_reject' => $booking->payment_status === PhotoSessionBooking::PAYMENT_PENDING
                && $booking->status === PhotoSessionBooking::STATUS_PENDING,
        ];
    }
}
