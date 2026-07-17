<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Events\Payments\PaymentConfirmed;
use App\Models\PaymentWebhookIdempotency;
use App\Services\Payments\PaymentGatewayService;
use Illuminate\Console\Command;
use Throwable;

/**
 * Recupera pagos Stripe atascados en pending (webhook no recibido).
 */
final class SyncStripeCheckoutSessionCommand extends Command
{
    protected $signature = 'payments:sync-stripe-session
                            {session_id? : ID de sesión Stripe (cs_…). Si se omite, procesa todos los pending}
                            {--dry-run : Solo listar, sin confirmar}';

    protected $description = 'Sincroniza pagos Stripe confirmados en Checkout pero pendientes en la app';

    public function handle(PaymentGatewayService $gateway): int
    {
        $sessionId = trim((string) $this->argument('session_id'));
        $dryRun = (bool) $this->option('dry-run');

        $sessions = $sessionId !== ''
            ? collect([$sessionId])
            : PaymentWebhookIdempotency::query()
                ->where('status', 'pending')
                ->orderByDesc('id')
                ->limit(50)
                ->pluck('transaction_id');

        if ($sessions->isEmpty()) {
            $this->info('No hay sesiones pendientes de sincronizar.');

            return self::SUCCESS;
        }

        $synced = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($sessions as $transactionId) {
            $transactionId = trim((string) $transactionId);
            if ($transactionId === '') {
                continue;
            }

            if ($dryRun) {
                $this->line("DRY-RUN · {$transactionId}");
                continue;
            }

            try {
                $result = $gateway->syncCheckoutSessionIfPaid($transactionId);
            } catch (Throwable $e) {
                $this->error("{$transactionId} · error: {$e->getMessage()}");
                $failed++;
                continue;
            }

            if (! $result['ok']) {
                $this->warn("{$transactionId} · {$result['message']}");
                $skipped++;
                continue;
            }

            if (! $result['duplicate']) {
                try {
                    PaymentConfirmed::dispatch(
                        payableType: $result['payable_type'],
                        payableId: $result['payable_id'],
                        amountCents: (int) ($result['amount_cents'] ?? 0),
                        stripeSessionId: $transactionId,
                    );
                } catch (Throwable $e) {
                    $this->warn("{$transactionId} · confirmado en BD; evento no disparado: {$e->getMessage()}");
                }
            }

            $this->info("{$transactionId} · {$result['payable_type']} #{$result['payable_id']} · OK");
            $synced++;
        }

        $this->newLine();
        $this->info("Sincronizados: {$synced} · Omitidos: {$skipped} · Errores: {$failed}");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
