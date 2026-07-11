<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Actions\Academy\CancelEnrollmentAction;
use App\Actions\Payments\InitiatePaymentAction;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\CancelLessonEnrollmentRequest;
use App\Models\Booking;
use App\Models\LessonUser;
use App\Services\VipStudentPerformanceService;
use App\Support\AcademyContact;
use App\Support\BusinessDateTime;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MyReservationsController extends Controller
{
    public function __construct(
        private readonly CancelEnrollmentAction $cancelEnrollmentAction,
        private readonly InitiatePaymentAction $initiatePayment,
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();

        $rows = VipStudentPerformanceService::buildReservationRows($user);

        return Inertia::render('User/Dashboard/MyReservations', [
            'classRows'           => $rows['classRows'],
            'rentalRows'          => $rows['rentalRows'],
            'bonoRows'            => [],
            'performanceData'     => null,
            'isAdminView'         => false,
            'targetUser'          => null,
            'analysisNav'         => null,
            'paymentIban'         => config('services.academy.iban', '[IBAN]'),
            'paymentBizumNumber'  => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'whatsappHelpUrl'     => AcademyContact::whatsappBaseUrl(),
        ]);
    }

    public function payClassEnrollment(Request $request, LessonUser $enrollment)
    {
        $user = $request->user();
        if ((int) $enrollment->user_id !== (int) $user->id) {
            abort(403);
        }

        if (($enrollment->payment_status ?? '') === PaymentStatus::Confirmed->value) {
            return back()->with('info', 'Esta clase ya está pagada.');
        }

        $lesson = $enrollment->lesson;
        if ($lesson === null) {
            return back()->with('error', 'No se encontró la clase asociada.');
        }

        $partySize   = max(1, (int) ($enrollment->party_size ?? $enrollment->quantity ?? 1));
        $priceEur    = $lesson->price !== null
            ? (float) $lesson->price
            : (float) config('services.academy.class_reservation_deposit_eur', 30);
        $priceCents  = (int) round($priceEur * 100 * $partySize);
        $partyLabel  = $partySize > 1 ? " × {$partySize} personas" : '';
        $lessonTitle = $lesson->title ?: 'Clase de surf';
        $dateLabel   = $lesson->starts_at?->locale('es')->translatedFormat('d/m/Y H:i') ?? '';

        $dto = new InitiatePaymentDto(
            payableType:   LessonUser::class,
            payableId:     $enrollment->id,
            lineItems:     [
                new PaymentLineItemDto(
                    name:            "{$lessonTitle}{$partyLabel}",
                    description:     $dateLabel,
                    unitAmountCents: $priceCents,
                    quantity:        1,
                ),
            ],
            successPath:   '/pago/exito',
            cancelPath:    '/mis-reservas',
            customerEmail: $user->email,
            metadata:      ['enrollment_id' => (string) $enrollment->id],
        );

        try {
            return $this->redirectToStripeCheckout($this->initiatePayment->execute($dto));
        } catch (\RuntimeException $e) {
            Log::error('MyReservationsController::payClassEnrollment Stripe error', [
                'enrollment_id' => $enrollment->id,
                'error'         => $e->getMessage(),
            ]);

            return back()->with('error', 'No se pudo abrir la pasarela de pago.');
        }
    }

    public function payRentalBooking(Request $request, Booking $booking)
    {
        $user = $request->user();
        if ((int) $booking->user_id !== (int) $user->id) {
            abort(403);
        }

        if (($booking->payment_status ?? '') === PaymentStatus::Confirmed->value) {
            return back()->with('info', 'Este alquiler ya está pagado.');
        }

        $depositCents = (int) round((float) $booking->deposit_amount * 100);
        $surfboard    = $booking->surfboard;
        $boardName    = $surfboard?->name ?? 'Alquiler de tabla';

        $dto = new InitiatePaymentDto(
            payableType:   Booking::class,
            payableId:     $booking->id,
            lineItems:     [
                new PaymentLineItemDto(
                    name:            "Reserva: {$boardName}",
                    description:     'Depósito de alquiler',
                    unitAmountCents: $depositCents,
                    quantity:        1,
                ),
            ],
            successPath:   '/pago/exito',
            cancelPath:    '/mis-reservas',
            customerEmail: $user->email,
            metadata:      ['booking_id' => (string) $booking->id],
        );

        try {
            return $this->redirectToStripeCheckout($this->initiatePayment->execute($dto));
        } catch (\RuntimeException $e) {
            Log::error('MyReservationsController::payRentalBooking Stripe error', [
                'booking_id' => $booking->id,
                'error'      => $e->getMessage(),
            ]);

            return back()->with('error', 'No se pudo abrir la pasarela de pago.');
        }
    }

    public function uploadClassProof(Request $request, LessonUser $enrollment)
    {
        return back()->with('info', 'El pago se realiza ahora con tarjeta. Usa el botón «Pagar con tarjeta».');
    }

    public function uploadRentalProof(Request $request, Booking $booking)
    {
        return back()->with('info', 'El pago se realiza ahora con tarjeta. Usa el botón «Pagar con tarjeta».');
    }

    public function cancelClass(CancelLessonEnrollmentRequest $request, LessonUser $enrollment)
    {
        try {
            $this->authorize('cancel', $enrollment);
        } catch (AuthorizationException) {
            return back()->with('error', 'No tienes permiso para cancelar esta reserva.');
        }

        $result = $this->cancelEnrollmentAction->execute($enrollment, $request->latePolicy());

        return $result['ok']
            ? back()->with('success', $result['message'])
            : back()->with('error', $result['message']);
    }

    public function cancelRental(Request $request, Booking $booking)
    {
        if ((int) $booking->user_id !== (int) $request->user()->id) {
            abort(403);
        }

        if ($booking->status === Booking::STATUS_CANCELLED) {
            return back()->with('error', 'Esta reserva ya estaba cancelada.');
        }

        if (($booking->payment_status ?? '') === Booking::PAYMENT_PENDING
            && $booking->created_at
            && $booking->created_at->copy()->addMinutes(30)->isPast()) {
            return back()->with('error', 'La sesión de pago ha expirado; esta reserva ya no se puede cancelar desde aquí.');
        }

        if (! $booking->start_date || BusinessDateTime::now()->diffInHours($booking->start_date, false) <= 24) {
            return back()->with('error', 'Fuera de plazo de cancelación (requiere 24h de antelación).');
        }

        $hadRefundQueue = $booking->needsRefundReviewAfterCancellation();
        $booking->applyCancellationWithRefundQueue();

        $msg = $hadRefundQueue
            ? 'Reserva cancelada. Si ya habías abonado un importe, el club tramitará la devolución; el equipo administrativo ha sido notificado.'
            : 'Reserva de alquiler cancelada.';

        return back()->with('success', $msg);
    }
}
