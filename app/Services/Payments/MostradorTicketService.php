<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\DTOs\Payments\MostradorTicketLineDto;
use App\Models\DatafonoPayment;
use App\Models\MostradorTicket;
use App\Models\MostradorTicketLine;
use App\Models\PaymentTerminal;
use App\Models\User;
use App\Support\BusinessDateTime;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Ticket de mostrador: un cobro (efectivo o TPV) con N líneas de dominio,
 * materializadas todas de golpe al cerrar.
 */
final class MostradorTicketService
{
    /** @var list<string> */
    public const GUEST_ALLOWED = ['producto', 'fotos', 'alquiler', 'clase'];

    public function __construct(
        private readonly DatafonoPaymentReconciliationService $reconciliation,
    ) {}

    /**
     * @param  list<MostradorTicketLineDto>  $lines
     * @param  array{
     *   payment_terminal_id: int,
     *   paid_at: string|\DateTimeInterface,
     *   notes?: string|null,
     *   created_by?: int|null,
     *   reviewed_by?: int|null
     * }  $meta
     */
    public function closeCashTicket(
        ?User $user,
        ?string $guestName,
        ?string $guestEmail,
        array $lines,
        array $meta,
    ): DatafonoPayment {
        if ($lines === []) {
            throw ValidationException::withMessages([
                'lines' => ['Añade al menos una línea al ticket.'],
            ]);
        }

        $this->assertClientAndLines($user, $guestName, $lines);
        $this->assertGuestEmailForCashInvoicing($user, $guestEmail);

        $totalCents = array_sum(array_map(fn (MostradorTicketLineDto $l) => $l->amountCents, $lines));
        $notes = trim((string) ($meta['notes'] ?? ''));

        $assigned = DB::transaction(function () use ($user, $guestName, $guestEmail, $lines, $meta, $totalCents, $notes) {
            $payment = $this->reconciliation->registerRawPayment([
                'payment_terminal_id' => (int) $meta['payment_terminal_id'],
                'amount_cents' => $totalCents,
                'paid_at' => $meta['paid_at'],
                'external_reference' => $user === null ? (trim((string) $guestName) ?: null) : null,
                'notes' => $notes !== '' ? $notes : ($meta['notes'] ?? null),
                'created_by' => $meta['created_by'] ?? null,
                'source' => DatafonoPayment::SOURCE_MANUAL_CASH,
            ]);

            $locked = DatafonoPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            return $this->closeTicketOnPayment(
                $locked,
                $user,
                $guestName,
                $guestEmail,
                $lines,
                $notes,
                $meta['reviewed_by'] ?? $meta['created_by'] ?? null,
            );
        });

        $this->reconciliation->dispatchFiscalForPayment($assigned);

        return $assigned;
    }

    /**
     * @param  list<MostradorTicketLineDto>  $lines
     */
    public function assignTpvTicket(
        DatafonoPayment $payment,
        ?User $user,
        ?string $guestName,
        ?string $guestEmail,
        array $lines,
        ?string $notes = null,
        ?int $reviewedBy = null,
    ): DatafonoPayment {
        if ($lines === []) {
            throw ValidationException::withMessages([
                'lines' => ['Añade al menos una línea al ticket.'],
            ]);
        }

        $this->assertClientAndLines($user, $guestName, $lines);

        $totalCents = array_sum(array_map(fn (MostradorTicketLineDto $l) => $l->amountCents, $lines));
        $notes = trim((string) ($notes ?? ''));

        $assigned = DB::transaction(function () use (
            $payment,
            $user,
            $guestName,
            $guestEmail,
            $lines,
            $totalCents,
            $notes,
            $reviewedBy,
        ) {
            $locked = DatafonoPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== DatafonoPayment::STATUS_PENDING_REVIEW) {
                throw ValidationException::withMessages([
                    'payment' => ['Este cobro ya fue conciliado o ignorado.'],
                ]);
            }

            if ($totalCents !== (int) $locked->amount_cents) {
                throw ValidationException::withMessages([
                    'amount_cents' => [
                        'La suma de las líneas ('.number_format($totalCents / 100, 2, ',', '.').' €) no coincide con el cobro ('.number_format(((int) $locked->amount_cents) / 100, 2, ',', '.').' €).',
                    ],
                ]);
            }

            return $this->closeTicketOnPayment(
                $locked,
                $user,
                $guestName,
                $guestEmail,
                $lines,
                $notes,
                $reviewedBy,
            );
        });

        $this->reconciliation->dispatchFiscalForPayment($assigned);

        return $assigned;
    }

    /**
     * @param  list<MostradorTicketLineDto>  $lines
     */
    private function closeTicketOnPayment(
        DatafonoPayment $locked,
        ?User $user,
        ?string $guestName,
        ?string $guestEmail,
        array $lines,
        string $notes,
        ?int $reviewedBy,
    ): DatafonoPayment {
        if ($locked->ticket()->exists()) {
            throw ValidationException::withMessages([
                'payment' => ['Este cobro ya tiene un ticket asignado.'],
            ]);
        }

        $guestName = trim((string) ($guestName ?? ''));
        $guestEmail = trim((string) ($guestEmail ?? ''));
        $materialized = [];
        $seenPayables = [];

        foreach ($lines as $index => $line) {
            $payload = array_merge($line->payload, [
                'category' => $line->category,
                'guest_name' => $guestName !== '' ? $guestName : null,
                'guest_email' => $guestEmail !== '' ? $guestEmail : null,
            ]);

            $payable = $this->reconciliation->materializePayable(
                $user,
                $locked,
                $payload,
                $line->amountCents,
            );

            $key = $payable::class.'#'.$payable->getKey();
            if (isset($seenPayables[$key])) {
                throw ValidationException::withMessages([
                    'lines' => ['No puedes asignar el mismo pendiente dos veces en el mismo ticket.'],
                ]);
            }
            $seenPayables[$key] = true;

            $materialized[] = [
                'line' => $line,
                'payable' => $payable,
                'sort' => $index,
            ];
        }

        /** @var Model $firstPayable */
        $firstPayable = $materialized[0]['payable'];
        $resolvedUserId = $user?->id
            ?? (isset($firstPayable->user_id) ? (int) $firstPayable->user_id : null);

        $totalCents = array_sum(array_map(fn (MostradorTicketLineDto $l) => $l->amountCents, $lines));

        $ticket = MostradorTicket::query()->create([
            'datafono_payment_id' => $locked->id,
            'user_id' => $resolvedUserId,
            'guest_name' => $user === null ? ($guestName !== '' ? $guestName : null) : null,
            'guest_email' => $user === null ? ($guestEmail !== '' ? $guestEmail : null) : null,
            'total_cents' => $totalCents,
            'status' => MostradorTicket::STATUS_CLOSED,
        ]);

        foreach ($materialized as $row) {
            /** @var MostradorTicketLineDto $line */
            $line = $row['line'];
            /** @var Model $payable */
            $payable = $row['payable'];

            MostradorTicketLine::query()->create([
                'ticket_id' => $ticket->id,
                'category' => $line->category,
                'amount_cents' => $line->amountCents,
                'payable_type' => $payable::class,
                'payable_id' => $payable->getKey(),
                'payload' => $line->payload,
                'sort' => $row['sort'],
            ]);
        }

        $locked->update([
            'status' => DatafonoPayment::STATUS_ASSIGNED,
            'assigned_user_id' => $resolvedUserId,
            'payable_type' => $firstPayable::class,
            'payable_id' => $firstPayable->getKey(),
            'notes' => $notes !== '' ? $notes : $locked->notes,
            'reviewed_by' => $reviewedBy,
            'reviewed_at' => BusinessDateTime::now(),
        ]);

        return $locked->fresh(['terminal', 'assignedUser', 'payable', 'ticket.lines']);
    }

    /**
     * @param  list<MostradorTicketLineDto>  $lines
     */
    private function assertClientAndLines(?User $user, ?string $guestName, array $lines): void
    {
        $guestName = trim((string) ($guestName ?? ''));
        if ($user === null && $guestName === '') {
            throw ValidationException::withMessages([
                'guest_name' => ['Indica el nombre del cliente no registrado o asigna un socio.'],
            ]);
        }

        foreach ($lines as $i => $line) {
            $prefix = "lines.{$i}";
            if ($user === null && ! in_array($line->category, self::GUEST_ALLOWED, true)) {
                throw ValidationException::withMessages([
                    $prefix.'.category' => ['Con cliente no registrado solo puedes cobrar producto, fotos, alquiler o clase.'],
                ]);
            }

            if ($line->category === 'bono') {
                if ($user === null || ! $user->canAccessAuctions()) {
                    throw ValidationException::withMessages([
                        $prefix.'.category' => ['El bono solo está disponible para socios VIP (o con taquilla).'],
                    ]);
                }
            }

            if ($line->category === 'taquilla') {
                if ($user === null || ! $user->hasActiveLocker()) {
                    throw ValidationException::withMessages([
                        $prefix.'.category' => ['La cuota de taquilla solo se puede asignar a un socio que ya tiene taquilla.'],
                    ]);
                }
            }
        }
    }

    /**
     * TicketBAI exige email de contacto. Con INVOICING_ENABLED el cobro cash
     * a walk-in no se cierra sin él (decisión del dueño 2026-08-27).
     */
    private function assertGuestEmailForCashInvoicing(?User $user, ?string $guestEmail): void
    {
        if ($user !== null || ! (bool) config('invoicing.enabled', false)) {
            return;
        }

        if (trim((string) $guestEmail) === '') {
            throw ValidationException::withMessages([
                'guest_email' => ['Con la facturación TicketBAI activa, el cobro en efectivo necesita el email del cliente.'],
            ]);
        }
    }

    public function defaultTerminalId(): int
    {
        $terminal = PaymentTerminal::query()->active()->orderBy('codigo')->first();
        if ($terminal === null) {
            throw ValidationException::withMessages([
                'payment_terminal_id' => ['No hay ningún datáfono activo configurado.'],
            ]);
        }

        return (int) $terminal->id;
    }
}
