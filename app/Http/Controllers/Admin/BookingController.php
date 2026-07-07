<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreBookingRequest;
use App\Models\Booking;
use App\Models\Surfboard;
use App\Services\BookingService;
use App\Support\BusinessDateTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class BookingController extends Controller
{
    public function __construct(
        private BookingService $bookingService
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
                'client_name' => $b->client_name,
                'client_email' => $b->client_email,
                'client_phone' => $b->client_phone,
                'start_date' => $b->start_date?->toIso8601String(),
                'end_date' => $b->end_date?->toIso8601String(),
                'expires_at' => $b->expires_at?->toIso8601String(),
                'total_price' => (float) $b->total_price,
                'deposit_amount' => (float) $b->deposit_amount,
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

    public function store(StoreBookingRequest $request): RedirectResponse|JsonResponse
    {
        $data = $request->validated();
        $surfboard = Surfboard::query()->findOrFail($data['surfboard_id']);
        $start = BusinessDateTime::parseRentalHandoffDate((string) $data['start_date']);
        $end = BusinessDateTime::parseRentalHandoffDate((string) $data['end_date']);

        try {
            $booking = $this->bookingService->createPendingBooking(
                $surfboard,
                $start,
                $end,
                [
                    'client_name' => $data['client_name'],
                    'client_email' => $data['client_email'] ?? null,
                    'client_phone' => $data['client_phone'] ?? null,
                    'payment_method' => $data['payment_method'] ?? null,
                ],
                null,
                $request->user()?->id,
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
     * Rangos de fechas ocupados de una tabla (para calendario).
     */
    public function checkAvailability(Request $request): JsonResponse
    {
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
     * Confirmar recepción de transferencia: pending -> confirmed.
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
            'payment_proof_note' => $booking->payment_proof_note ?? 'Confirmado por admin '.now()->toDateTimeString(),
        ]);

        return redirect()->back()->with('success', 'Reserva confirmada. Pago verificado.');
    }

    /**
     * Aprobar comprobante desde Gestor de Comprobaciones.
     */
    public function approveProof(Booking $booking): RedirectResponse
    {
        if (($booking->payment_status ?? Booking::PAYMENT_PENDING) === Booking::PAYMENT_CONFIRMED) {
            return redirect()->back()->with('error', 'Este pago ya está confirmado.');
        }

        $booking->update([
            'status' => Booking::STATUS_CONFIRMED,
            'payment_status' => Booking::PAYMENT_CONFIRMED,
            'refund_status' => null,
            'reviewed_at' => null,
        ]);

        return redirect()->back()->with('success', 'Pago de alquiler confirmado.');
    }

    /**
     * Rechazar comprobante desde Gestor de Comprobaciones.
     */
    public function rejectProof(Request $request, Booking $booking): RedirectResponse
    {
        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        $note = trim((string) ($validated['admin_notes'] ?? '')) !== ''
            ? trim((string) $validated['admin_notes'])
            : 'Comprobante rechazado.';

        if (($booking->payment_status ?? '') === Booking::PAYMENT_REJECTED) {
            return redirect()->back()->with('error', 'Este pago ya está rechazado.');
        }

        if ($booking->status === Booking::STATUS_PENDING) {
            $booking->update([
                'payment_status' => Booking::PAYMENT_REJECTED,
                'refund_status' => null,
                'admin_notes' => $note,
                'status' => Booking::STATUS_PENDING,
                'reviewed_at' => null,
            ]);

            return redirect()->back()->with('success', 'Comprobante de alquiler rechazado.');
        }

        $bps = $booking->payment_status ?? '';
        if (($bps === Booking::PAYMENT_CONFIRMED) || ($bps === Booking::PAYMENT_PENDING && ! empty($booking->payment_proof_path))) {
            $booking->update([
                'payment_status' => Booking::PAYMENT_REJECTED,
                'refund_status' => $bps === Booking::PAYMENT_CONFIRMED ? Booking::REFUND_PENDING : null,
                'admin_notes' => $note,
                'status' => $bps === Booking::PAYMENT_CONFIRMED ? Booking::STATUS_CANCELLED : $booking->status,
                'reviewed_at' => null,
            ]);

            return redirect()->back()->with('success', 'Pago de alquiler marcado como rechazado.');
        }

        return redirect()->back()->with('error', 'No hay un pago enviado o confirmado que se pueda rechazar en este estado.');
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
