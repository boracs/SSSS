<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreBookingRequest;
use App\Models\Booking;
use App\Models\Surfboard;
use App\Services\BookingService;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Support\BusinessDateTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class BookingController extends Controller
{
    public function __construct(
        private BookingService $bookingService,
        private DatafonoPaymentReconciliationService $reconciliation,
    ) {}

    public function index(Request $request): Response
    {
        $surfboards = Surfboard::query()
            ->with('priceSchema')
            ->orderBy('name')
            ->get();

        $status = $request->query('status');
        $surfboardId = $request->query('surfboard_id');

        $bookings = Booking::query()
            ->with(['surfboard'])
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($surfboardId, fn ($q) => $q->where('surfboard_id', $surfboardId))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->through(fn (Booking $b) => [
                'id' => $b->id,
                'surfboard_id' => $b->surfboard_id,
                'surfboard_name' => $b->surfboard?->name,
                'status' => $b->status,
                // El botón de recogida solo se activa con el pago confirmado.
                'payment_status' => $b->payment_status,
                'client_name' => $b->client_name,
                'client_email' => $b->client_email,
                'client_phone' => $b->client_phone,
                // Ventana del alquiler en hora de escuela: recogida y devolución
                // cobrada (el buffer de rotación no se muestra al mostrador).
                'mode' => $b->mode,
                'pickup_at' => $this->windowDate($b->pickup_at ?? $b->start_date),
                'return_at' => $this->windowDate($b->return_at ?? $b->end_date),
                'pack_minutes' => $b->pack_minutes,
                'pack_days' => $b->pack_days,
                'picked_up_at' => $this->windowDate($b->picked_up_at),
                'no_show_at' => $this->windowDate($b->no_show_at),
                'start_date' => $this->windowDate($b->start_date),
                'end_date' => $this->windowDate($b->end_date),
                'expires_at' => $b->expires_at?->toIso8601String(),
                'total_price' => (float) $b->total_price,
                'deposit_amount' => (float) $b->deposit_amount,
                // Resto pendiente de cobrar en mostrador (datáfono/efectivo).
                'balance_status' => $b->balance_status,
                'balance_payment_method' => $b->balance_payment_method,
                'remaining_balance_cents' => $b->remainingBalanceCents(),
                'created_at' => $b->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/Bookings/Index', [
            'surfboards' => $surfboards,
            'filters' => [
                'status' => $status ?? 'all',
                'surfboard_id' => $surfboardId ? (int) $surfboardId : null,
            ],
            'bookings' => $bookings,
        ]);
    }

    /**
     * ISO con el offset de la escuela: el panel nunca debe pintar 12:00 donde el
     * mostrador entrega a las 10:00.
     */
    private function windowDate(?\DateTimeInterface $date): ?string
    {
        return $date !== null ? BusinessDateTime::toApi($date) : null;
    }

    /**
     * Reserva manual sin cobro inmediato (ej. por teléfono), que se cobra luego en
     * mostrador vía confirmPayment(). Distinto del walk-in
     * ({@see \App\Services\Payments\DatafonoPaymentReconciliationService::reconcile()}),
     * que sí cobra el 100 % en el momento. Sin UI dedicada hoy.
     */
    public function store(StoreBookingRequest $request): RedirectResponse|JsonResponse
    {
        $data = $request->validated();
        $surfboard = Surfboard::query()->findOrFail($data['surfboard_id']);

        try {
            $booking = $this->bookingService->createPendingBooking(
                $surfboard,
                $this->bookingService->buildWindow($request->toRentalRequest()),
                [
                    'client_name' => $data['client_name'],
                    'client_email' => $data['client_email'] ?? null,
                    'client_phone' => $data['client_phone'] ?? null,
                    'payment_method' => $data['payment_method'] ?? null,
                ],
                userId: $request->user()?->id,
            );
        } catch (InvalidArgumentException $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'collision' => str_contains($e->getMessage(), 'disponible'),
                ], 422);
            }

            return redirect()->back()->withErrors([
                'start_date' => $e->getMessage(),
            ]);
        }

        $depositAmount = (float) $booking->deposit_amount;

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'booking' => $booking->fresh(),
                'message' => 'Reserva creada en estado pendiente. El cliente dispone de 7 días para realizar el ingreso.',
            ], 201);
        }

        return redirect()->back()->with([
            'success' => 'Reserva creada (pendiente). Depósito: '.number_format($depositAmount, 2, ',', '').' €. Caduca en 7 días.',
            'booking_id' => $booking->id,
        ]);
    }

    /**
     * Rangos de fechas ocupados de una tabla (para calendario admin).
     * Detalle completo (id de reserva incluido): a diferencia del endpoint
     * público, aquí sí hace falta para poder enlazar con la reserva concreta.
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        // El payload lleva id y estado crudo de cada reserva: solo mostrador.
        $this->authorize('viewAny', Booking::class);

        $request->validate([
            'surfboard_id' => ['required', 'integer', 'exists:surfboards,id'],
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);

        $fromRaw = (string) $request->input('from');
        $toRaw = (string) $request->input('to');
        $from = BusinessDateTime::parseRentalDate($fromRaw);
        $to = preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($toRaw))
            ? BusinessDateTime::parseInAppTimezone(trim($toRaw).' 23:59:59')
            : BusinessDateTime::parseRentalDate($toRaw);
        $ranges = $this->bookingService->getBlockedRanges(
            (int) $request->input('surfboard_id'),
            $from,
            $to
        );

        return response()->json([
            'blocked_ranges' => $ranges,
        ]);
    }

    /**
     * Cancela reservas pending expiradas (liberar tablas).
     */
    public function markExpired(): RedirectResponse
    {
        $expired = $this->bookingService->autoExpirePending();
        $count = $expired->count();

        return redirect()->back()->with('success', "Se han cancelado {$count} reserva(s) pendiente(s) expirada(s).");
    }

    /**
     * Cobro registrado en mostrador (efectivo/datáfono): pending -> confirmed.
     */
    public function confirmPayment(Booking $booking): RedirectResponse
    {
        if ($booking->status !== Booking::STATUS_PENDING) {
            return redirect()->back()->with('error', 'Solo se puede confirmar una reserva en estado pendiente.');
        }

        $booking->update([
            'status' => Booking::STATUS_CONFIRMED,
            'payment_status' => Booking::PAYMENT_CONFIRMED,
            'refund_status' => null,
            // El admin cobra el importe íntegro en mano, no una señal:
            // no queda resto pendiente en mostrador.
            'deposit_amount' => $booking->total_price,
            'balance_status' => Booking::BALANCE_NONE,
            'payment_proof_note' => $booking->payment_proof_note ?? 'Confirmado por admin '.now()->toDateTimeString(),
        ]);

        return redirect()->back()->with('success', 'Reserva confirmada. Pago verificado.');
    }

    /**
     * Ver comprobante de alquiler en storage privado.
     */
    public function showProof(Booking $booking)
    {
        if (empty($booking->payment_proof_path)) {
            abort(404);
        }
        if (! Storage::disk('local')->exists($booking->payment_proof_path)) {
            abort(404);
        }
        $path = Storage::disk('local')->path($booking->payment_proof_path);
        $mime = Storage::disk('local')->mimeType($booking->payment_proof_path);

        return response()->file($path, ['Content-Type' => $mime]);
    }

    /**
     * Mostrador: registra la entrega real de la tabla. Sin este dato el barrido de
     * no-shows no puede distinguir un cliente que llega tarde de uno que no aparece,
     * por eso `rentals.no_show_release_enabled` sigue desactivado hasta que se use.
     */
    public function markPickedUp(Booking $booking): RedirectResponse
    {
        if ($booking->picked_up_at !== null) {
            return redirect()->back()->with(
                'error',
                'La recogida ya estaba registrada ('.$booking->picked_up_at->format('d/m/Y H:i').').'
            );
        }

        if (! in_array($booking->status, [Booking::STATUS_PENDING, Booking::STATUS_CONFIRMED], true)) {
            return redirect()->back()->with(
                'error',
                'Solo se registra la recogida de reservas pendientes o confirmadas.'
            );
        }

        if ($booking->payment_status !== Booking::PAYMENT_CONFIRMED) {
            return redirect()->back()->with(
                'error',
                'No se puede entregar la tabla sin el pago confirmado. Confirma el pago primero.'
            );
        }

        if ($booking->hasBalanceDue()) {
            return redirect()->back()->with(
                'error',
                'Queda un resto por cobrar en mostrador. Cóbralo antes de entregar la tabla.'
            );
        }

        $booking = $this->bookingService->markPickedUp($booking);

        return redirect()->back()->with(
            'success',
            'Recogida registrada a las '.$booking->picked_up_at->format('H:i').'.'
        );
    }

    /**
     * Vía rápida de mostrador: cobra en efectivo el resto pendiente de un
     * alquiler con depósito ya confirmado. Deja el mismo rastro auditable
     * (ledger de datáfono) que un cobro por TPV desde el panel de Datáfono.
     */
    public function chargeBalanceCash(Booking $booking): RedirectResponse
    {
        if ($booking->payment_status !== Booking::PAYMENT_CONFIRMED || ! $booking->hasBalanceDue()) {
            return redirect()->back()->with('error', 'Esta reserva no tiene resto pendiente de cobro.');
        }

        $this->reconciliation->chargeBookingBalanceCash($booking, Auth::id());

        return redirect()->back()->with('success', 'Resto cobrado en efectivo y registrado.');
    }

    /**
     * Cancelar reserva (admin).
     */
    public function cancel(Booking $booking): RedirectResponse
    {
        if ($booking->status === Booking::STATUS_CANCELLED) {
            return redirect()->back()->with('success', 'La reserva ya estaba cancelada.');
        }

        $booking->applyCancellationWithRefundQueue();

        return redirect()->back()->with('success', 'Reserva cancelada. Si había pago asociado, queda pendiente de revisión para devolución.');
    }
}
