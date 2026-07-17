<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\Pedido;
use App\Models\User;
use App\Models\UserBono;
use App\Services\Invoicing\FiscalInvoiceAccessService;
use App\Support\MoneyCents;
use Illuminate\Support\Collection;

/**
 * Vista admin "Clientes" (`/admin/pagos/clientes`): historial de pagos de UN cliente
 * a través de los 5 dominios de negocio (Pedido, UserBono, Booking, LessonUser, PagoCuota).
 *
 * Diseño a propósito en dos niveles de coste:
 * - {@see confirmedPaymentCountsForUsers()}: solo COUNT agregados (5 queries GROUP BY,
 *   sin importar cuántos clientes haya en la página) — usado en el listado.
 * - {@see historyForUser()}: detalle completo de UN usuario, cargado a demanda (endpoint
 *   JSON perezoso) cuando el admin despliega su acordeón — nunca precargado para todos.
 */
final class ClientPaymentHistoryService
{
    public function __construct(
        private readonly PaymentReceiptAccessService $receipts,
        private readonly FiscalInvoiceAccessService $invoices,
    ) {}

    /**
     * @param  Collection<int, User>  $users
     * @return array<int, int> user_id => nº de pagos confirmados (suma de los 5 dominios)
     */
    public function confirmedPaymentCountsForUsers(Collection $users): array
    {
        $userIds = $users->pluck('id')->map(fn ($id) => (int) $id)->all();
        if ($userIds === []) {
            return [];
        }

        $counts = [];
        $this->mergeCounts($counts, $this->countByUser(Pedido::query()->whereIn('user_id', $userIds)->where('pagado', true)));
        $this->mergeCounts($counts, $this->countByUser(UserBono::query()->whereIn('user_id', $userIds)->where('status', UserBono::STATUS_CONFIRMED)));
        $this->mergeCounts($counts, $this->countByUser(Booking::query()->whereIn('user_id', $userIds)->where('payment_status', Booking::PAYMENT_CONFIRMED)));
        $this->mergeCounts($counts, $this->countByUser(LessonUser::query()->whereIn('user_id', $userIds)->where('payment_status', LessonUser::PAYMENT_CONFIRMED)));
        $this->mergeCounts($counts, $this->countByUser(PagoCuota::query()->whereIn('user_id', $userIds)->where('status', PagoCuota::STATUS_CONFIRMED)));

        return $counts;
    }

    /** @return list<array<string, mixed>> */
    public function historyForUser(User $user): array
    {
        $pedidos = Pedido::query()->where('user_id', $user->id)->orderByDesc('created_at')->limit(100)->get();
        $bonos = UserBono::query()->with('pack')->where('user_id', $user->id)->orderByDesc('created_at')->limit(100)->get();
        $bookings = Booking::query()->with('surfboard')->where('user_id', $user->id)->orderByDesc('created_at')->limit(100)->get();
        $enrollments = LessonUser::query()->with('lesson')->where('user_id', $user->id)->orderByDesc('created_at')->limit(100)->get();
        $pagosCuota = PagoCuota::query()->with('plan')->where('user_id', $user->id)->orderByDesc('created_at')->limit(100)->get();

        $proofMap = $this->receipts->proofMetaMapForPayables([
            ...$pedidos->map(fn (Pedido $p) => ['type' => Pedido::class, 'id' => (int) $p->id])->all(),
            ...$bonos->map(fn (UserBono $b) => ['type' => UserBono::class, 'id' => (int) $b->id])->all(),
            ...$bookings->map(fn (Booking $b) => ['type' => Booking::class, 'id' => (int) $b->id])->all(),
            ...$enrollments->map(fn (LessonUser $e) => ['type' => LessonUser::class, 'id' => (int) $e->id])->all(),
            ...$pagosCuota->map(fn (PagoCuota $p) => ['type' => PagoCuota::class, 'id' => (int) $p->id])->all(),
        ]);

        $invoiceMap = $this->invoices->mapForPayables([
            ...$pedidos->map(fn (Pedido $p) => ['type' => Pedido::class, 'id' => (int) $p->id])->all(),
            ...$bonos->map(fn (UserBono $b) => ['type' => UserBono::class, 'id' => (int) $b->id])->all(),
            ...$bookings->map(fn (Booking $b) => ['type' => Booking::class, 'id' => (int) $b->id])->all(),
            ...$enrollments->map(fn (LessonUser $e) => ['type' => LessonUser::class, 'id' => (int) $e->id])->all(),
            ...$pagosCuota->map(fn (PagoCuota $p) => ['type' => PagoCuota::class, 'id' => (int) $p->id])->all(),
        ]);

        return collect()
            ->concat($pedidos->map(fn (Pedido $p) => $this->pedidoRow($p, $proofMap, $invoiceMap)))
            ->concat($bonos->map(fn (UserBono $b) => $this->bonoRow($b, $proofMap, $invoiceMap)))
            ->concat($bookings->map(fn (Booking $b) => $this->bookingRow($b, $proofMap, $invoiceMap)))
            ->concat($enrollments->map(fn (LessonUser $e) => $this->lessonRow($e, $proofMap, $invoiceMap)))
            ->concat($pagosCuota->map(fn (PagoCuota $p) => $this->pagoCuotaRow($p, $proofMap, $invoiceMap)))
            ->sortByDesc('created_at_raw')
            ->map(function (array $row): array {
                unset($row['created_at_raw']);

                return $row;
            })
            ->values()
            ->all();
    }

    /** @return array<int, int> */
    private function countByUser(\Illuminate\Database\Eloquent\Builder $query): array
    {
        return $query
            ->selectRaw('user_id, COUNT(*) as aggregate_count')
            ->groupBy('user_id')
            ->pluck('aggregate_count', 'user_id')
            ->map(fn ($v) => (int) $v)
            ->all();
    }

    /** @param array<int,int> $counts */
    private function mergeCounts(array &$counts, array $partial): void
    {
        foreach ($partial as $userId => $count) {
            $counts[(int) $userId] = ($counts[(int) $userId] ?? 0) + $count;
        }
    }

    private function pedidoRow(Pedido $pedido, array $proofMap, array $invoiceMap): array
    {
        return $this->baseRow(
            id: $pedido->id,
            entity: 'tienda',
            entityLabel: 'Tienda',
            description: "Pedido #{$pedido->id}",
            amountCents: MoneyCents::eurosToCents((float) $pedido->precio_total),
            status: $pedido->pagado ? 'confirmed' : 'pending',
            createdAt: $pedido->created_at,
            payableType: Pedido::class,
            payableId: (int) $pedido->id,
            hasManualProof: ! empty($pedido->payment_proof_path),
            manualProofUrl: ! empty($pedido->payment_proof_path) ? route('mostrar.pedido', $pedido->id) : null,
            proofMap: $proofMap,
            invoiceMap: $invoiceMap,
        );
    }

    private function bonoRow(UserBono $bono, array $proofMap, array $invoiceMap): array
    {
        $packName = $bono->pack?->nombre ?? 'Bono de clases';

        return $this->baseRow(
            id: $bono->id,
            entity: 'bono',
            entityLabel: 'Bono de clases',
            description: "{$packName} ({$bono->sku})",
            amountCents: MoneyCents::eurosToCents((float) ($bono->pack?->precio ?? 0)),
            status: $bono->status,
            createdAt: $bono->created_at,
            payableType: UserBono::class,
            payableId: (int) $bono->id,
            hasManualProof: ! empty($bono->payment_proof_path),
            manualProofUrl: $bono->payment_proof_path ? \Illuminate\Support\Facades\Storage::url($bono->payment_proof_path) : null,
            proofMap: $proofMap,
            invoiceMap: $invoiceMap,
        );
    }

    private function bookingRow(Booking $booking, array $proofMap, array $invoiceMap): array
    {
        $boardName = $booking->surfboard?->name ?? 'tabla de surf';
        $range = $this->formatDateRange($booking->start_date, $booking->end_date);

        return $this->baseRow(
            id: $booking->id,
            entity: 'alquiler',
            entityLabel: 'Alquiler',
            description: "Alquiler {$boardName}{$range}",
            amountCents: MoneyCents::eurosToCents((float) ($booking->total_price ?? 0)),
            status: $booking->payment_status ?? Booking::PAYMENT_PENDING,
            createdAt: $booking->created_at,
            payableType: Booking::class,
            payableId: (int) $booking->id,
            hasManualProof: ! empty($booking->payment_proof_path),
            manualProofUrl: ! empty($booking->payment_proof_path) ? route('admin.bookings.proof', $booking->id) : null,
            proofMap: $proofMap,
            invoiceMap: $invoiceMap,
        );
    }

    private function lessonRow(LessonUser $enrollment, array $proofMap, array $invoiceMap): array
    {
        $lessonTitle = $enrollment->lesson?->title ?: 'Clase de surf';
        $lessonDate = $enrollment->lesson?->starts_at?->toDateString();
        $description = $lessonDate !== null ? "{$lessonTitle} ({$lessonDate})" : $lessonTitle;
        $amount = $enrollment->lesson?->price !== null ? (float) $enrollment->lesson->price : 20.0;

        return $this->baseRow(
            id: $enrollment->id,
            entity: 'clase',
            entityLabel: 'Clase',
            description: $description,
            amountCents: MoneyCents::eurosToCents($amount),
            status: $enrollment->payment_status ?? LessonUser::PAYMENT_PENDING,
            createdAt: $enrollment->created_at,
            payableType: LessonUser::class,
            payableId: (int) $enrollment->id,
            hasManualProof: ! empty($enrollment->payment_proof_path),
            manualProofUrl: ! empty($enrollment->payment_proof_path) ? route('admin.academy.enrollments.proof', $enrollment->id) : null,
            proofMap: $proofMap,
            invoiceMap: $invoiceMap,
        );
    }

    private function pagoCuotaRow(PagoCuota $pago, array $proofMap, array $invoiceMap): array
    {
        $planName = $pago->plan?->nombre ?? 'Plan de taquilla';
        $range = $this->formatDateRange($pago->periodo_inicio, $pago->periodo_fin);

        return $this->baseRow(
            id: $pago->id,
            entity: 'taquilla',
            entityLabel: 'Taquilla',
            description: "Taquilla — {$planName}{$range}",
            amountCents: (int) ($pago->monto_pagado_cents ?? 0),
            status: $pago->status ?? PagoCuota::STATUS_PENDING,
            createdAt: $pago->created_at,
            payableType: PagoCuota::class,
            payableId: (int) $pago->id,
            hasManualProof: ! empty($pago->payment_proof_path),
            manualProofUrl: ! empty($pago->payment_proof_path) ? route('taquilla.pagos.proof', $pago->id) : null,
            proofMap: $proofMap,
            invoiceMap: $invoiceMap,
        );
    }

    private function baseRow(
        int $id,
        string $entity,
        string $entityLabel,
        string $description,
        int $amountCents,
        string $status,
        ?\Illuminate\Support\Carbon $createdAt,
        string $payableType,
        int $payableId,
        bool $hasManualProof,
        ?string $manualProofUrl,
        array $proofMap,
        array $invoiceMap,
    ): array {
        $proof = $this->receipts->proofFieldsForPayable($payableType, $payableId, $hasManualProof, $manualProofUrl, $proofMap);
        $invoiceKey = $payableType.'#'.$payableId;
        $invoice = $invoiceMap[$invoiceKey] ?? null;

        return [
            'id' => $id,
            'entity' => $entity,
            'entity_label' => $entityLabel,
            'description' => $description,
            'amount_cents' => $amountCents,
            'status' => $status,
            'status_label' => $this->statusLabel($status),
            'created_at' => $createdAt?->toIso8601String(),
            'created_at_human' => $createdAt?->locale('es')->translatedFormat('d/m/Y H:i'),
            'created_at_raw' => $createdAt?->timestamp ?? 0,
            'proof_url' => $proof['proof_url'],
            'proof_is_stripe_receipt' => $proof['proof_is_stripe_receipt'],
            'fiscal_invoice_url' => $invoice?->detailUrl,
            'fiscal_invoice_ready' => $invoice?->isReady ?? false,
        ];
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'confirmed' => 'Confirmado',
            'rejected' => 'Rechazado',
            'pending' => 'Pendiente',
            default => ucfirst($status),
        };
    }

    private function formatDateRange(?\Illuminate\Support\Carbon $start, ?\Illuminate\Support\Carbon $end): string
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
}
