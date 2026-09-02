<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\DTOs\Payments\MostradorTicketLineDto;
use App\Http\Controllers\Controller;
use App\Models\DatafonoPayment;
use App\Models\PhotoSession;
use App\Models\Producto;
use App\Models\Surfboard;
use App\Models\User;
use App\Services\Payments\DatafonoPaymentReconciliationService;
use App\Services\Payments\MostradorTicketService;
use App\Services\Store\StoreProductPricing;
use App\Support\MoneyCents;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Inertia\Inertia;
use Inertia\Response;

final class DatafonoPaymentController extends Controller
{
    public function __construct(
        private readonly DatafonoPaymentReconciliationService $reconciliation,
        private readonly MostradorTicketService $tickets,
    ) {}

    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString() ?: null;
        $terminalId = $request->integer('terminal_id') ?: null;

        $users = User::query()
            ->where('role', 'user')
            ->orderBy('nombre')
            ->limit(500)
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'nombre' => trim("{$u->nombre} {$u->apellido}"),
                'email' => $u->email,
                'telefono' => $u->telefono,
                'is_vip' => (bool) $u->is_vip,
                'has_active_locker' => $u->hasActiveLocker(),
                'can_buy_bono' => $u->canAccessAuctions(),
            ])
            ->values()
            ->all();

        $productos = Producto::query()
            ->where('eliminado', false)
            ->orderBy('nombre')
            ->limit(300)
            ->get(['id', 'nombre', 'precio', 'descuento'])
            ->map(function (Producto $p): array {
                $descuento = max(0, min(100, (int) round((float) ($p->descuento ?? 0))));

                return [
                    'id' => $p->id,
                    'nombre' => $p->nombre,
                    // Mismo criterio de precio que la validación del ticket
                    // (StoreProductPricing): si aquí saliera el PVP sin rebajar,
                    // cualquier producto con descuento daría 422 en mostrador.
                    'precio_cents' => StoreProductPricing::unitPriceCents($p->precio, $descuento),
                    'precio_base_cents' => MoneyCents::eurosToCents((float) $p->precio),
                    'descuento' => $descuento,
                ];
            })
            ->values()
            ->all();

        $photoSessions = PhotoSession::query()
            ->active()
            ->orderBy('nombre')
            ->get(['id', 'nombre', 'precio_cents', 'plus_por_persona_cents', 'duracion_minutos', 'capacidad_maxima'])
            ->map(fn (PhotoSession $s) => [
                'id' => $s->id,
                'nombre' => $s->nombre,
                'precio_cents' => (int) $s->precio_cents,
                'plus_por_persona_cents' => (int) $s->plus_por_persona_cents,
                'duracion_minutos' => (int) $s->duracion_minutos,
                'capacidad_maxima' => $s->capacidad_maxima !== null ? (int) $s->capacidad_maxima : null,
            ])
            ->values()
            ->all();

        $surfboards = Surfboard::query()
            ->where('is_active', true)
            ->with('priceSchema')
            ->orderBy('name')
            ->get(['id', 'name', 'category', 'price_schema_id'])
            ->map(function (Surfboard $s) {
                $schema = $s->priceSchema;

                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'category' => $s->category,
                    'prices' => $schema ? [
                        'price_60m' => (float) ($schema->price_60m ?? 0),
                        'price_90m' => (float) ($schema->price_90m ?? 0),
                        'price_120m' => (float) ($schema->price_120m ?? 0),
                        'price_180m' => (float) ($schema->price_180m ?? 0),
                        'price_240m' => (float) ($schema->price_240m ?? 0),
                        'price_360m' => (float) ($schema->price_360m ?? 0),
                        'price_1d' => (float) ($schema->price_1d ?? 0),
                        'price_2d' => (float) ($schema->price_2d ?? 0),
                        'price_3d' => (float) ($schema->price_3d ?? 0),
                        'price_4d' => (float) ($schema->price_4d ?? 0),
                        'price_5d' => (float) ($schema->price_5d ?? 0),
                        'price_week' => (float) ($schema->price_week ?? 0),
                    ] : null,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Admin/Payments/Datafono/Index', [
            'payments' => $this->reconciliation->listPayments($status, $terminalId),
            'terminals' => $this->reconciliation->activeTerminals()->map(fn ($t) => [
                'id' => $t->id,
                'codigo' => $t->codigo,
                'nombre' => $t->nombre,
                'emite_ticketbai_propio' => (bool) $t->emite_ticketbai_propio,
            ])->values()->all(),
            'filters' => [
                'status' => $status,
                'terminal_id' => $terminalId,
            ],
            'users' => $users,
            'productos' => $productos,
            'photoSessions' => $photoSessions,
            'planesTaquilla' => $this->reconciliation->catalogPlanesTaquilla(),
            'packsBono' => $this->reconciliation->catalogPacksBono(),
            'lessons' => $this->reconciliation->catalogUpcomingLessons(),
            'surfboards' => $surfboards,
            'categories' => DatafonoPaymentReconciliationService::CATEGORIES,
            'guestAllowedCategories' => MostradorTicketService::GUEST_ALLOWED,
            'invoicingEnabled' => (bool) config('invoicing.enabled', false),
        ]);
    }

    /**
     * Cobro en efectivo = ticket cerrado de una vez (cliente + N líneas).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'payment_terminal_id' => ['nullable', 'integer', 'exists:payment_terminals,id'],
            'paid_at' => ['required', 'date'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'guest_name' => ['nullable', 'string', 'max:120'],
            'guest_email' => [
                Rule::requiredIf(fn () => (bool) config('invoicing.enabled', false)
                    && empty($request->input('user_id'))),
                'nullable',
                'email',
                'max:190',
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.category' => ['required', 'string', 'in:taquilla,bono,alquiler,clase,fotos,producto'],
            'lines.*.amount_cents' => ['required', 'integer', 'min:1'],
            'lines.*.payable_id' => ['nullable', 'integer'],
            'lines.*.product_ids' => ['nullable', 'array'],
            'lines.*.product_ids.*' => ['integer', 'exists:productos,id'],
            'lines.*.photo_session_id' => ['nullable', 'integer', 'exists:photo_sessions,id'],
            'lines.*.fecha_inicio' => ['nullable', 'date'],
            'lines.*.party_size' => ['nullable', 'integer', 'min:1', 'max:20'],
            'lines.*.plan_taquilla_id' => ['nullable', 'integer', 'exists:planes_taquilla,id'],
            'lines.*.pack_bono_id' => ['nullable', 'integer', 'exists:pack_bonos,id'],
            'lines.*.surfboard_id' => ['nullable', 'integer', 'exists:surfboards,id'],
            'lines.*.rental_mode' => ['nullable', 'string', 'in:hour,day'],
            'lines.*.rental_pickup_at' => ['nullable', 'string'],
            'lines.*.rental_pack_minutes' => ['nullable', 'integer'],
            'lines.*.rental_pack_days' => ['nullable', 'integer'],
            'lines.*.lesson_id' => ['nullable', 'integer', 'exists:lessons,id'],
        ]);

        try {
            $lineDtos = array_map(
                fn (array $row) => MostradorTicketLineDto::fromArray($row),
                $validated['lines'],
            );
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['lines' => $e->getMessage()]);
        }

        $hasUser = ! empty($validated['user_id']);
        $user = $hasUser ? User::query()->find($validated['user_id']) : null;
        $terminalId = (int) ($validated['payment_terminal_id'] ?? 0);
        if ($terminalId <= 0) {
            $terminalId = $this->tickets->defaultTerminalId();
        }

        $this->tickets->closeCashTicket(
            $user,
            $validated['guest_name'] ?? null,
            $validated['guest_email'] ?? null,
            $lineDtos,
            [
                'payment_terminal_id' => $terminalId,
                'paid_at' => $validated['paid_at'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => Auth::id(),
                'reviewed_by' => Auth::id(),
            ],
        );

        return back()->with('success', 'Ticket de mostrador cobrado y asignado.');
    }

    public function pendingForUser(Request $request, User $user): JsonResponse
    {
        $category = $request->string('category')->toString();
        if (! in_array($category, DatafonoPaymentReconciliationService::CATEGORIES, true)) {
            return response()->json(['candidates' => []], 422);
        }

        return response()->json([
            'candidates' => $this->reconciliation->pendingCandidatesForUser($user, $category),
        ]);
    }

    /**
     * Crear clase programada desde el ticket (walk-in) y devolverla en formato catálogo.
     */
    public function storeLesson(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'starts_at' => ['required', 'string'],
            'duration_minutes' => ['nullable', 'integer', 'in:60,90'],
            'type' => ['nullable', 'string', 'in:surf,skate'],
            'modality' => ['nullable', 'string', 'in:particular,grupal'],
            'level' => ['nullable', 'string', 'in:iniciacion,intermedio,avanzado'],
            'price' => ['nullable', 'numeric', 'min:0.01'],
            'max_slots' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        try {
            $lesson = $this->reconciliation->createWalkInLesson($validated);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => collect($e->errors())->flatten()->first() ?: 'No se pudo crear la clase.',
                'errors' => $e->errors(),
            ], 422);
        }

        return response()->json(['lesson' => $lesson], 201);
    }

    /**
     * Asignar cobro TPV (o legacy pending) con N líneas de una vez.
     * Soporta también el payload legacy de 1 categoría (se envuelve en una línea).
     */
    public function assign(Request $request, DatafonoPayment $datafonoPayment): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'guest_name' => ['nullable', 'string', 'max:120'],
            'guest_email' => ['nullable', 'email', 'max:190'],
            'notes' => ['nullable', 'string', 'max:2000'],
            // Multi-línea
            'lines' => ['nullable', 'array', 'min:1'],
            'lines.*.category' => ['required_with:lines', 'string', 'in:taquilla,bono,alquiler,clase,fotos,producto'],
            'lines.*.amount_cents' => ['required_with:lines', 'integer', 'min:1'],
            'lines.*.payable_id' => ['nullable', 'integer'],
            'lines.*.product_ids' => ['nullable', 'array'],
            'lines.*.product_ids.*' => ['integer', 'exists:productos,id'],
            'lines.*.photo_session_id' => ['nullable', 'integer', 'exists:photo_sessions,id'],
            'lines.*.fecha_inicio' => ['nullable', 'date'],
            'lines.*.party_size' => ['nullable', 'integer', 'min:1', 'max:20'],
            'lines.*.plan_taquilla_id' => ['nullable', 'integer', 'exists:planes_taquilla,id'],
            'lines.*.pack_bono_id' => ['nullable', 'integer', 'exists:pack_bonos,id'],
            'lines.*.surfboard_id' => ['nullable', 'integer', 'exists:surfboards,id'],
            'lines.*.rental_mode' => ['nullable', 'string', 'in:hour,day'],
            'lines.*.rental_pickup_at' => ['nullable', 'string'],
            'lines.*.rental_pack_minutes' => ['nullable', 'integer'],
            'lines.*.rental_pack_days' => ['nullable', 'integer'],
            'lines.*.lesson_id' => ['nullable', 'integer', 'exists:lessons,id'],
            // Legacy 1 categoría
            'category' => ['nullable', 'string', 'in:taquilla,bono,alquiler,clase,fotos,producto'],
            'payable_id' => ['nullable', 'integer'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', 'exists:productos,id'],
            'photo_session_id' => ['nullable', 'integer', 'exists:photo_sessions,id'],
            'fecha_inicio' => ['nullable', 'date'],
            'party_size' => ['nullable', 'integer', 'min:1', 'max:20'],
            'plan_taquilla_id' => ['nullable', 'integer', 'exists:planes_taquilla,id'],
            'pack_bono_id' => ['nullable', 'integer', 'exists:pack_bonos,id'],
            'surfboard_id' => ['nullable', 'integer', 'exists:surfboards,id'],
            'rental_mode' => ['nullable', 'string', 'in:hour,day'],
            'rental_pickup_at' => ['nullable', 'string'],
            'rental_pack_minutes' => ['nullable', 'integer'],
            'rental_pack_days' => ['nullable', 'integer'],
            'lesson_id' => ['nullable', 'integer', 'exists:lessons,id'],
        ]);

        $rawLines = $validated['lines'] ?? null;
        if (! is_array($rawLines) || $rawLines === []) {
            if (empty($validated['category'])) {
                return back()->withErrors(['lines' => 'Añade al menos una línea al ticket.']);
            }
            $rawLines = [[
                'category' => $validated['category'],
                'amount_cents' => (int) $datafonoPayment->amount_cents,
                'payable_id' => $validated['payable_id'] ?? null,
                'product_ids' => $validated['product_ids'] ?? [],
                'photo_session_id' => $validated['photo_session_id'] ?? null,
                'fecha_inicio' => $validated['fecha_inicio'] ?? null,
                'party_size' => $validated['party_size'] ?? 1,
                'plan_taquilla_id' => $validated['plan_taquilla_id'] ?? null,
                'pack_bono_id' => $validated['pack_bono_id'] ?? null,
                'surfboard_id' => $validated['surfboard_id'] ?? null,
                'rental_mode' => $validated['rental_mode'] ?? null,
                'rental_pickup_at' => $validated['rental_pickup_at'] ?? null,
                'rental_pack_minutes' => $validated['rental_pack_minutes'] ?? null,
                'rental_pack_days' => $validated['rental_pack_days'] ?? null,
            ]];
        }

        try {
            $lineDtos = array_map(
                fn (array $row) => MostradorTicketLineDto::fromArray($row),
                $rawLines,
            );
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['lines' => $e->getMessage()]);
        }

        $hasUser = ! empty($validated['user_id']);
        $user = $hasUser ? User::query()->find($validated['user_id']) : null;

        $this->tickets->assignTpvTicket(
            $datafonoPayment,
            $user,
            $validated['guest_name'] ?? null,
            $validated['guest_email'] ?? null,
            $lineDtos,
            $validated['notes'] ?? null,
            Auth::id(),
        );

        return back()->with('success', 'Cobro asignado al ticket correctamente.');
    }

    public function ignore(Request $request, DatafonoPayment $datafonoPayment): RedirectResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $this->reconciliation->ignore(
            $datafonoPayment,
            Auth::user(),
            $validated['notes'] ?? null,
        );

        return back()->with('success', 'Cobro marcado como ignorado.');
    }

    public function communicateHacienda(DatafonoPayment $datafonoPayment): RedirectResponse
    {
        try {
            $this->reconciliation->communicateToHacienda($datafonoPayment);
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        return back()->with('success', 'Comunicación a Hacienda encolada (TicketBAI vía B2B).');
    }
}
