<?php

declare(strict_types=1);

namespace App\Services\Invoicing;

use App\DTOs\Invoicing\FiscalInvoiceContactDto;
use App\DTOs\Invoicing\FiscalInvoiceDraftDto;
use App\DTOs\Invoicing\FiscalInvoiceLineDto;
use App\Exceptions\Invoicing\MissingFiscalDataException;
use App\Exceptions\Invoicing\UnsupportedFiscalPayableException;
use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\User;
use App\Models\UserBono;
use Illuminate\Support\Carbon;

/**
 * Traduce un payable confirmado (Pedido, UserBono, Booking, LessonUser, PagoCuota)
 * a un FiscalInvoiceDraftDto.
 *
 * Switch extensible: añadir un nuevo dominio requiere (1) habilitarlo en
 * config('invoicing.payable_types') y (2) añadir su rama aquí.
 */
final class FiscalInvoiceBuilderService
{
    public function build(string $payableType, int $payableId, int $amountCents, string $stripeSessionId): FiscalInvoiceDraftDto
    {
        if (! (bool) config("invoicing.payable_types.{$payableType}", false)) {
            throw new UnsupportedFiscalPayableException(
                "Tipo de payable no habilitado para facturación fiscal: {$payableType}"
            );
        }

        return match ($payableType) {
            Pedido::class     => $this->fromPedido($payableId, $amountCents, $stripeSessionId),
            UserBono::class   => $this->fromUserBono($payableId, $amountCents, $stripeSessionId),
            Booking::class    => $this->fromBooking($payableId, $amountCents, $stripeSessionId),
            LessonUser::class => $this->fromLessonUser($payableId, $amountCents, $stripeSessionId),
            PagoCuota::class  => $this->fromPagoCuota($payableId, $amountCents, $stripeSessionId),
            default           => throw new UnsupportedFiscalPayableException(
                "Tipo de payable no soportado por FiscalInvoiceBuilderService: {$payableType}"
            ),
        };
    }

    private function fromPedido(int $pedidoId, int $amountCents, string $stripeSessionId): FiscalInvoiceDraftDto
    {
        $pedido = Pedido::query()->with('usuario')->find($pedidoId);

        if ($pedido === null || $pedido->usuario === null) {
            throw new MissingFiscalDataException("Pedido #{$pedidoId} no encontrado o sin usuario asociado.");
        }

        return new FiscalInvoiceDraftDto(
            payableType: Pedido::class,
            payableId: $pedido->id,
            stripeSessionId: $stripeSessionId,
            invoiceDate: Carbon::now()->toDateString(),
            contact: $this->buildContact($pedido->usuario),
            lines: [$this->line("Pedido S4 #{$pedido->id}", $amountCents)],
        );
    }

    private function fromUserBono(int $userBonoId, int $amountCents, string $stripeSessionId): FiscalInvoiceDraftDto
    {
        $bono = UserBono::query()->with(['user', 'pack'])->find($userBonoId);

        if ($bono === null || $bono->user === null) {
            throw new MissingFiscalDataException("Bono #{$userBonoId} no encontrado o sin usuario asociado.");
        }

        $packName = $bono->pack?->nombre ?? 'Bono de clases';

        return new FiscalInvoiceDraftDto(
            payableType: UserBono::class,
            payableId: $bono->id,
            stripeSessionId: $stripeSessionId,
            invoiceDate: Carbon::now()->toDateString(),
            contact: $this->buildContact($bono->user),
            lines: [$this->line("{$packName} ({$bono->sku})", $amountCents)],
        );
    }

    private function fromBooking(int $bookingId, int $amountCents, string $stripeSessionId): FiscalInvoiceDraftDto
    {
        $booking = Booking::query()->with(['user', 'surfboard'])->find($bookingId);

        if ($booking === null) {
            throw new MissingFiscalDataException("Alquiler #{$bookingId} no encontrado.");
        }

        $contact = $this->buildContactForUser(
            user: $booking->user,
            fallbackName: $booking->client_name,
            fallbackEmail: $booking->client_email,
            context: "Alquiler #{$bookingId}",
        );

        $boardName = $booking->surfboard?->name ?? 'tabla de surf';
        $range = $this->formatDateRange($booking->start_date, $booking->end_date);

        return new FiscalInvoiceDraftDto(
            payableType: Booking::class,
            payableId: $booking->id,
            stripeSessionId: $stripeSessionId,
            invoiceDate: Carbon::now()->toDateString(),
            contact: $contact,
            lines: [$this->line("Alquiler {$boardName}{$range}", $amountCents)],
        );
    }

    private function fromLessonUser(int $enrollmentId, int $amountCents, string $stripeSessionId): FiscalInvoiceDraftDto
    {
        $enrollment = LessonUser::query()->with(['user', 'lesson'])->find($enrollmentId);

        if ($enrollment === null) {
            throw new MissingFiscalDataException("Reserva de clase #{$enrollmentId} no encontrada.");
        }

        $guestName = trim((string) (($enrollment->guest_first_name ?? '').' '.($enrollment->guest_last_name ?? '')));
        $contact = $this->buildContactForUser(
            user: $enrollment->user,
            fallbackName: $guestName !== '' ? $guestName : null,
            fallbackEmail: $enrollment->guest_email,
            context: "Reserva de clase #{$enrollmentId}",
        );

        $lessonTitle = $enrollment->lesson?->title ?: 'Clase de surf';
        $lessonDate = $enrollment->lesson?->starts_at?->toDateString();
        $description = $lessonDate !== null ? "{$lessonTitle} ({$lessonDate})" : $lessonTitle;

        return new FiscalInvoiceDraftDto(
            payableType: LessonUser::class,
            payableId: $enrollment->id,
            stripeSessionId: $stripeSessionId,
            invoiceDate: Carbon::now()->toDateString(),
            contact: $contact,
            lines: [$this->line($description, $amountCents)],
        );
    }

    private function fromPagoCuota(int $pagoId, int $amountCents, string $stripeSessionId): FiscalInvoiceDraftDto
    {
        $pago = PagoCuota::query()->with(['user', 'plan'])->find($pagoId);

        if ($pago === null || $pago->user === null) {
            throw new MissingFiscalDataException("Pago de taquilla #{$pagoId} no encontrado o sin usuario asociado.");
        }

        $planName = $pago->plan?->nombre ?? 'Plan de taquilla';
        $range = $this->formatDateRange($pago->periodo_inicio, $pago->periodo_fin);

        return new FiscalInvoiceDraftDto(
            payableType: PagoCuota::class,
            payableId: $pago->id,
            stripeSessionId: $stripeSessionId,
            invoiceDate: Carbon::now()->toDateString(),
            contact: $this->buildContact($pago->user),
            lines: [$this->line("Taquilla — {$planName}{$range}", $amountCents)],
        );
    }

    private function line(string $description, int $amountCents): FiscalInvoiceLineDto
    {
        return new FiscalInvoiceLineDto(
            description: $description,
            quantity: 1.0,
            unitPriceCents: $amountCents,
            vatPercent: (float) config('invoicing.default_vat_percent', 21.0),
            vatCategory: (string) config('invoicing.default_vat_category', 'S'),
        );
    }

    private function formatDateRange(?Carbon $start, ?Carbon $end): string
    {
        if ($start === null) {
            return '';
        }

        $formatted = $start->toDateString();
        if ($end !== null && ! $end->isSameDay($start)) {
            $formatted .= ' – '.$end->toDateString();
        }

        return " ({$formatted})";
    }

    /**
     * Factura simplificada: el modelo User no guarda NIF/dirección fiscal hoy
     * (ver TODO iteración 2 en docs/invoicing/B2BROUTER-TICKETBAI.md).
     */
    private function buildContact(User $user): FiscalInvoiceContactDto
    {
        return $this->buildContactForUser($user, null, null, "Usuario #{$user->id}");
    }

    /**
     * Igual que buildContact() pero admite payables sin usuario registrado
     * (reservas/alquileres "de invitado"), usando nombre/email introducidos
     * a mano en el propio payable como fallback.
     */
    private function buildContactForUser(?User $user, ?string $fallbackName, ?string $fallbackEmail, string $context): FiscalInvoiceContactDto
    {
        $email = trim((string) ($user?->email ?? $fallbackEmail ?? ''));
        if ($email === '') {
            throw new MissingFiscalDataException("{$context} sin email de contacto; no se puede emitir factura.");
        }

        $name = $user !== null
            ? trim(trim((string) $user->nombre).' '.trim((string) $user->apellido))
            : trim((string) $fallbackName);

        return new FiscalInvoiceContactDto(
            name: $name !== '' ? $name : $email,
            email: $email,
        );
    }
}
