<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\BonoConsumption;
use App\Models\PackBono;
use App\Models\UserBono;
use App\Services\BonoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class BonoController extends Controller
{
    public function __construct(protected BonoService $bonoService)
    {
    }

    public function index()
    {
        $user = auth()->user();
        if (! $user || ! (bool) ($user->is_vip ?? false)) {
            abort(403, 'Acceso restringido a usuarios VIP.');
        }

        $packs = PackBono::query()
            ->where('activo', true)
            ->orderBy('precio')
            ->get();

        $myBonos = UserBono::query()
            ->with('pack:id,nombre,num_clases,precio')
            ->where('user_id', $user?->id)
            ->orderByDesc('id')
            ->limit(30)
            ->get()
            ->map(function (UserBono $b) {
                return [
                    'id' => $b->id,
                    'pack' => $b->pack?->nombre,
                    'num_clases' => (int) ($b->pack?->num_clases ?? 0),
                    'precio' => (float) ($b->pack?->precio ?? 0),
                    'clases_restantes' => (int) $b->clases_restantes,
                    'status' => $b->status,
                    'proof_url' => $b->payment_proof_path ? Storage::url($b->payment_proof_path) : null,
                    'created_at' => $b->created_at?->toIso8601String(),
                    'admin_notes' => $b->admin_notes,
                ];
            })
            ->values();

        $consumptionHistory = collect();
        if (Schema::hasTable('bono_consumptions')) {
            $consumptionHistory = BonoConsumption::query()
                ->with(['lesson:id,title,starts_at,level'])
                ->where('user_id', $user->id)
                ->orderByDesc('consumed_at')
                ->limit(50)
                ->get()
                ->map(function (BonoConsumption $c) {
                    $lessonTitle = $c->lesson?->title ?: 'Clase de surf';
                    return [
                        'id' => $c->id,
                        'date' => $c->consumed_at?->toIso8601String(),
                        'date_human' => $c->consumed_at?->locale('es')->translatedFormat('d/m/Y H:i'),
                        'lesson_name' => $lessonTitle,
                        'remaining_after' => (int) $c->remaining_after,
                    ];
                })
                ->values();
        }

        return Inertia::render('Client/Bonos/Index', [
            'packs' => $packs,
            'myBonos' => $myBonos,
            'consumptionHistory' => $consumptionHistory,
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
        ]);
    }

    public function requestPurchase(Request $request)
    {
        $user = auth()->user();
        if (! $user) {
            return back()->with('error', 'Debes iniciar sesión.');
        }
        if (! (bool) ($user->is_vip ?? false)) {
            return back()->with('error', 'Solo los usuarios VIP pueden comprar bonos.');
        }

        $validated = $request->validate([
            'pack_id' => 'required|integer|exists:pack_bonos,id',
            'proof' => 'required|file|mimes:jpeg,jpg,png,webp,pdf|max:10240',
        ]);

        $pack = PackBono::query()->where('activo', true)->findOrFail((int) $validated['pack_id']);
        $this->bonoService->requestBono($user, $pack, $request->file('proof'));

        return back()->with('success', 'Solicitud de compra enviada. La validaremos en breve.');
    }
}

