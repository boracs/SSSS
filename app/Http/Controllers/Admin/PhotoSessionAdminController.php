<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PhotoSession;
use App\Models\PhotoSessionBooking;
use App\Models\User;
use App\Services\Photos\PhotoBookingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class PhotoSessionAdminController extends Controller
{
    public function __construct(
        private readonly PhotoBookingService $photos,
    ) {}

    public function index(): Response
    {
        $payload = $this->photos->buildAdminPayload();
        $fotografos = User::query()
            ->where('role', 'user')
            ->orderBy('nombre')
            ->limit(200)
            ->get(['id', 'nombre', 'apellido'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'nombre' => trim("{$u->nombre} {$u->apellido}"),
            ])
            ->values()
            ->all();

        return Inertia::render('Admin/Photos/Index', [
            'sessions' => $payload['sessions'],
            'bookings' => $payload['bookings'],
            'fotografos' => $fotografos,
        ]);
    }

    public function storeSession(Request $request): RedirectResponse
    {
        $data = $this->validatedSession($request);
        $this->photos->upsertSession(null, $data);

        return back()->with('success', 'Pack de fotos creado.');
    }

    public function updateSession(Request $request, PhotoSession $photoSession): RedirectResponse
    {
        $data = $this->validatedSession($request);
        $this->photos->upsertSession($photoSession, $data);

        return back()->with('success', 'Pack de fotos actualizado.');
    }

    public function confirmBooking(PhotoSessionBooking $booking): RedirectResponse
    {
        $this->photos->confirmPayment($booking);

        return back()->with('success', 'Reserva de fotos confirmada.');
    }

    public function rejectBooking(Request $request, PhotoSessionBooking $booking): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);
        $this->photos->rejectPayment($booking, $validated['reason'] ?? null);

        return back()->with('success', 'Reserva de fotos rechazada.');
    }

    public function showProof(PhotoSessionBooking $booking): StreamedResponse
    {
        if (empty($booking->payment_proof_path) || ! Storage::disk('local')->exists($booking->payment_proof_path)) {
            abort(404);
        }

        $path = (string) $booking->payment_proof_path;
        $mime = Storage::disk('local')->mimeType($path) ?: 'application/octet-stream';
        $stream = Storage::disk('local')->readStream($path);

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'no-store, private',
        ]);
    }

    /** @return array<string, mixed> */
    private function validatedSession(Request $request): array
    {
        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'max:2000'],
            'precio_cents' => ['required', 'integer', 'min:0'],
            'plus_por_persona_cents' => ['nullable', 'integer', 'min:0'],
            'duracion_minutos' => ['required', 'integer', 'min:15', 'max:1440'],
            'capacidad_maxima' => ['nullable', 'integer', 'min:1', 'max:100'],
            'fotografo_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'activo' => ['nullable', 'boolean'],
        ]);
        $validated['plus_por_persona_cents'] = (int) ($validated['plus_por_persona_cents'] ?? 0);

        $validated['activo'] = $request->boolean('activo', true);

        return $validated;
    }
}
