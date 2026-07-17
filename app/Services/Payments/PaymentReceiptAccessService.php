<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\PaymentReceipt;

/**
 * Resuelve URLs de comprobante: recibo Stripe (prioritario) o justificante manual.
 */
final class PaymentReceiptAccessService
{
    /**
     * @param  list<array{type: string, id: int}>  $payables
     * @return array<string, array{url: string, is_stripe_receipt: bool}>
     */
    public function proofMetaMapForPayables(array $payables): array
    {
        if ($payables === []) {
            return [];
        }

        $byType = collect($payables)->groupBy('type');
        $receipts = collect();

        foreach ($byType as $type => $items) {
            $ids = $items->pluck('id')->map(fn ($id) => (int) $id)->unique()->values()->all();
            if ($ids === []) {
                continue;
            }

            $chunk = PaymentReceipt::query()
                ->where('payable_type', (string) $type)
                ->whereIn('payable_id', $ids)
                ->get();

            $receipts = $receipts->concat($chunk);
        }

        return $receipts
            ->mapWithKeys(fn (PaymentReceipt $receipt) => [
                PaymentReceipt::cacheKey($receipt->payable_type, (int) $receipt->payable_id) => [
                    'url' => route('payments.receipts.show', $receipt),
                    'is_stripe_receipt' => true,
                ],
            ])
            ->all();
    }

    public function stripeReceiptMeta(string $payableType, int $payableId): ?array
    {
        $receipt = PaymentReceipt::query()->forPayable($payableType, $payableId)->first();
        if ($receipt === null) {
            return null;
        }

        return [
            'url' => route('payments.receipts.show', $receipt),
            'is_stripe_receipt' => true,
        ];
    }

    /**
     * @return array{url: string, is_stripe_receipt: bool}|null
     */
    public function resolveProofMeta(
        string $payableType,
        int $payableId,
        bool $hasManualProof,
        ?string $manualProofUrl,
        ?array $preloadedMap = null,
    ): ?array {
        $key = PaymentReceipt::cacheKey($payableType, $payableId);
        if ($preloadedMap !== null && isset($preloadedMap[$key])) {
            return $preloadedMap[$key];
        }

        $stripe = $this->stripeReceiptMeta($payableType, $payableId);
        if ($stripe !== null) {
            return $stripe;
        }

        if ($hasManualProof && is_string($manualProofUrl) && $manualProofUrl !== '') {
            return [
                'url' => $manualProofUrl,
                'is_stripe_receipt' => false,
            ];
        }

        return null;
    }

    /**
     * @return array{proof_url: string|null, proof_is_stripe_receipt: bool}
     */
    public function proofFieldsForPayable(
        string $payableType,
        int $payableId,
        bool $hasManualProof,
        ?string $manualProofUrl,
        ?array $preloadedMap = null,
    ): array {
        $meta = $this->resolveProofMeta($payableType, $payableId, $hasManualProof, $manualProofUrl, $preloadedMap);

        return [
            'proof_url' => $meta['url'] ?? null,
            'proof_is_stripe_receipt' => (bool) ($meta['is_stripe_receipt'] ?? false),
        ];
    }
}
