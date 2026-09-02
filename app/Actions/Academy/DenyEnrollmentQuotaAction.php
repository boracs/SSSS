<?php

declare(strict_types=1);

namespace App\Actions\Academy;

use App\Enums\PaymentStatus;
use App\Models\LessonUser;
use App\Services\CreditEngineService;
use App\Services\Payments\PaymentGatewayService;
use App\Support\BusinessDateTime;
use Illuminate\Support\Facades\Log;

final class DenyEnrollmentQuotaAction
{
    public function __construct(
        private readonly PaymentGatewayService $gateway,
        private readonly CreditEngineService $creditEngine,
    ) {}

    /**
     * @return array{ok: bool, message: string}
     */
    public function execute(LessonUser $enrollment, ?string $adminNotes = null): array
    {
        if ($enrollment->status !== LessonUser::STATUS_PENDING_EXTRA_MONITOR) {
            return ['ok' => false, 'message' => 'Solo se pueden denegar solicitudes pendientes de cupo extra.'];
        }

        $note = trim((string) ($adminNotes ?? ''));
        if ($note === '') {
            $note = 'Solicitud de cupo extra denegada por administración.';
        }

        $wasPaid = in_array((string) ($enrollment->payment_status ?? ''), [
            LessonUser::PAYMENT_CONFIRMED,
            PaymentStatus::Confirmed->value,
        ], true);
        $method = (string) ($enrollment->payment_method ?? '');

        if ($wasPaid && $method === 'bono_vip') {
            $this->creditEngine->refundCredits($enrollment, 'Cupo extra denegado');
            $enrollment->refresh();
            $enrollment->update(['admin_notes' => $note]);

            return ['ok' => true, 'message' => 'Solicitud denegada. Se ha devuelto el crédito del bono.'];
        }

        if ($wasPaid && $method === 'card') {
            $refunded = $this->gateway->refundOriginalCheckout(LessonUser::class, (int) $enrollment->id);
            if (! $refunded) {
                Log::error('DenyEnrollmentQuotaAction: no se pudo reembolsar el PaymentIntent original', [
                    'enrollment_id' => $enrollment->id,
                ]);
            }
        }

        $enrollment->update([
            'status' => LessonUser::STATUS_CANCELLED,
            'cancelled_at' => BusinessDateTime::now(),
            'admin_notes' => $note,
            'refund_status' => $wasPaid && $method === 'card'
                ? LessonUser::REFUND_COMPLETED
                : $enrollment->refund_status,
        ]);

        return ['ok' => true, 'message' => 'Solicitud denegada y eliminada de la lista.'];
    }
}
