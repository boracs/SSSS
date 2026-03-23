<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserBono;
use App\Services\BonoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PaymentValidationController extends Controller
{
    public function __construct(protected BonoService $bonoService)
    {
    }

    public function index()
    {
        $pendingBonos = UserBono::query()
            ->with(['user:id,nombre,apellido,email', 'pack:id,nombre,num_clases,precio'])
            ->where('status', UserBono::STATUS_PENDING)
            ->orderByDesc('created_at')
            ->get()
            ->map(function (UserBono $row) {
                return [
                    'id' => $row->id,
                    'user' => $row->user ? trim(($row->user->nombre ?? '').' '.($row->user->apellido ?? '')) : '—',
                    'email' => $row->user?->email,
                    'pack' => $row->pack?->nombre,
                    'num_clases' => (int) ($row->pack?->num_clases ?? 0),
                    'precio' => (float) ($row->pack?->precio ?? 0),
                    'status' => $row->status,
                    'admin_notes' => $row->admin_notes,
                    'proof_url' => $row->payment_proof_path ? Storage::url($row->payment_proof_path) : null,
                    'created_at' => $row->created_at?->toIso8601String(),
                ];
            })
            ->values();

        return Inertia::render('Admin/Payments/Dashboard', [
            'pendingBonos' => $pendingBonos,
        ]);
    }

    public function confirm(int $userBonoId)
    {
        $this->bonoService->confirmBono($userBonoId);
        return back()->with('success', 'Bono confirmado correctamente.');
    }

    public function reject(Request $request, int $userBonoId)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:2000',
        ]);

        $this->bonoService->rejectBono($userBonoId, $validated['reason']);
        return back()->with('success', 'Bono rechazado.');
    }
}

