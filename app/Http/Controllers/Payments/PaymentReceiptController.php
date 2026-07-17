<?php

declare(strict_types=1);

namespace App\Http\Controllers\Payments;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\LessonUser;
use App\Models\PagoCuota;
use App\Models\PaymentReceipt;
use App\Models\Pedido;
use App\Models\User;
use App\Models\UserBono;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class PaymentReceiptController extends Controller
{
    public function show(Request $request, PaymentReceipt $paymentReceipt): RedirectResponse|StreamedResponse
    {
        $user = $request->user();
        if ($user === null || ! $this->userCanView($user, $paymentReceipt)) {
            abort(403);
        }

        if (
            is_string($paymentReceipt->storage_path)
            && $paymentReceipt->storage_path !== ''
            && Storage::disk('local')->exists($paymentReceipt->storage_path)
        ) {
            $mime = Storage::disk('local')->mimeType($paymentReceipt->storage_path) ?: 'application/pdf';

            return Storage::disk('local')->response(
                $paymentReceipt->storage_path,
                'recibo-stripe.pdf',
                ['Content-Type' => $mime],
            );
        }

        if (is_string($paymentReceipt->receipt_url) && $paymentReceipt->receipt_url !== '') {
            return redirect()->away($paymentReceipt->receipt_url);
        }

        abort(404, 'Recibo no disponible.');
    }

    private function userCanView(User $user, PaymentReceipt $paymentReceipt): bool
    {
        if (($user->role ?? '') === 'admin') {
            return true;
        }

        $payable = $paymentReceipt->payable;
        if ($payable === null) {
            return false;
        }

        return match (true) {
            $payable instanceof LessonUser => (int) $payable->user_id === (int) $user->id,
            $payable instanceof Booking => (int) $payable->user_id === (int) $user->id,
            $payable instanceof UserBono => (int) $payable->user_id === (int) $user->id,
            $payable instanceof PagoCuota => (int) $payable->user_id === (int) $user->id,
            $payable instanceof Pedido => (int) $payable->user_id === (int) $user->id,
            default => false,
        };
    }
}
