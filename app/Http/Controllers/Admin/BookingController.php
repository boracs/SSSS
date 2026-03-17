<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreBookingRequest;
use App\Models\Booking;
use App\Models\Surfboard;
use App\Services\BookingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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
        $start = Carbon::parse($data['start_date']);
        $end = Carbon::parse($data['end_date']);

        if (! $this->bookingService->isAvailable((int) $surfboard->id, $start, $end)) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'La tabla no está disponible en ese rango. Ya existe una reserva (pendiente o confirmada) que la bloquea.',
                    'collision' => true,
                ], 422);
            }
            return redirect()->back()->withErrors([
                'start_date' => 'La tabla no está disponible en ese rango. Comprueba el calendario o elija otras fechas.',
            ]);
        }

        $schema = $surfboard->priceSchema;
        $totalPrice = $this->bookingService->calculateBestPrice($schema, $start, $end);
        $depositAmount = $this->bookingService->calculateDeposit($totalPrice, 30.0);
        $expiresAt = Carbon::now()->addDays(7);

        $booking = Booking::create([
            'surfboard_id' => $surfboard->id,
            'user_id' => $request->user()?->id,
            'client_name' => $data['client_name'],
            'client_email' => $data['client_email'] ?? null,
            'client_phone' => $data['client_phone'] ?? null,
            'start_date' => $start,
            'end_date' => $end,
            'expires_at' => $expiresAt,
            'status' => Booking::STATUS_PENDING,
            'total_price' => $totalPrice,
            'deposit_amount' => $depositAmount,
            'payment_proof_note' => null,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'booking' => $booking->fresh(),
                'message' => 'Reserva creada en estado pendiente. El cliente dispone de 7 días para realizar el ingreso.',
            ], 201);
        }

        return redirect()->back()->with([
            'success' => 'Reserva creada (pendiente). Depósito: ' . number_format((float) $depositAmount, 2, ',', '') . ' €. Caduca en 7 días.',
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

        $from = Carbon::parse($request->input('from'));
        $to = Carbon::parse($request->input('to'));
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
            'payment_proof_note' => $booking->payment_proof_note ?? 'Confirmado por admin ' . now()->toDateTimeString(),
        ]);

        return redirect()->back()->with('success', 'Reserva confirmada. Pago verificado.');
    }

    /**
     * Cancelar reserva (admin).
     */
    public function cancel(Booking $booking): RedirectResponse
    {
        if ($booking->status === Booking::STATUS_CANCELLED) {
            return redirect()->back()->with('success', 'La reserva ya estaba cancelada.');
        }

        $booking->update([
            'status' => Booking::STATUS_CANCELLED,
        ]);

        return redirect()->back()->with('success', 'Reserva cancelada.');
    }
}
