<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Payments\InitiatePaymentAction;
use App\DTOs\Payments\InitiatePaymentDto;
use App\DTOs\Payments\PaymentLineItemDto;
use App\Http\Requests\Taquilla\ConfirmarPagoTaquillaRequest;
use App\Http\Requests\Taquilla\ReassignLockerRequest;
use App\Http\Requests\Taquilla\RechazarPagoTaquillaRequest;
use App\Http\Requests\Taquilla\RegistrarPagoTaquillaRequest;
use App\Http\Requests\Taquilla\StorePlanTaquillaRequest;
use App\Http\Requests\Taquilla\SubirJustificanteTaquillaRequest;
use App\Http\Requests\Taquilla\UpdatePagoTaquillaCheckedStateRequest;
use App\Http\Requests\Taquilla\UpdatePagoTaquillaPaymentStateRequest;
use App\Http\Requests\Taquilla\UpdatePlanTaquillaRequest;
use App\Models\PagoCuota;
use App\Models\PlanTaquilla;
use App\Models\User;
use App\Support\AcademyContact;
use App\Services\Taquilla\TaquillaMembershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpFoundationResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class PlanesTaquillasController extends Controller
{
    public function __construct(
        private readonly TaquillaMembershipService $taquillaService,
        private readonly InitiatePaymentAction $initiatePayment,
    ) {}

    public function AdminIndex(): Response|RedirectResponse
    {
        if (! Auth::check()) {
            return redirect()->route('login')
                ->with('error', 'Debes iniciar sesion para acceder al panel de administracion.');
        }

        $user = Auth::user();
        if (($user->role ?? null) !== 'admin') {
            return redirect()->route('taquillas.index.client')
                ->with('error', 'No tienes permisos para acceder al panel de administracion.');
        }

        $dashboard = $this->taquillaService->buildAdminDashboard();

        return Inertia::render('PlanesTaquillasAdmin', [
            'planes' => $dashboard['planes'],
            'usuarios' => $dashboard['usuarios'],
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    public function userPaymentHistory(User $user): JsonResponse
    {
        $admin = Auth::user();
        if (! $admin || ($admin->role ?? null) !== 'admin') {
            abort(403);
        }

        return response()->json([
            'rows' => $this->taquillaService->userPaymentHistory($user),
        ]);
    }

    public function obtenerContactoUsuario(int $id): JsonResponse
    {
        $admin = Auth::user();
        if (! $admin || $admin->role !== 'admin') {
            abort(403, 'No autorizado');
        }

        $usuario = User::query()->findOrFail($id);

        return response()->json($this->taquillaService->userContact($usuario));
    }

    public function publicPlans(): Response
    {
        return Inertia::render('PlanesTaquillasPublic', [
            'planes' => $this->taquillaService->buildPublicPlans(),
        ]);
    }

    public function ClientIndex(): Response|RedirectResponse
    {
        if (! Auth::check()) {
            return redirect()->route('login')->with('error', 'Debes iniciar sesion para ver tu taquilla.');
        }

        $user = Auth::user();
        $payload = $this->taquillaService->buildClientIndex($user);

        return Inertia::render('PlanesTaquillasClient', [
            'userData' => $payload['userData'],
            'planes' => $payload['planes'],
            'paymentIban' => config('services.academy.iban', '[IBAN]'),
            'paymentBizumNumber' => config('services.academy.bizum_number', '[BIZUM_NUMBER]'),
            'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
        ]);
    }

    public function registrarPago(RegistrarPagoTaquillaRequest $request): RedirectResponse|HttpFoundationResponse
    {
        $user = Auth::user();
        $validated = $request->validated();

        try {
            $pago = $this->taquillaService->createPendingPaymentForCheckout(
                user: $user,
                planId: (int) $validated['plan_id'],
                referenciaExterna: $validated['referencia_pago_externa'] ?? null,
            );

            $checkoutUrl = $this->initiatePayment->execute(
                $this->buildStripeDtoForPago($pago, $user),
            );
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::error('PlanesTaquillasController::registrarPago Stripe error', [
                'user_id' => $user?->id,
                'error'   => $e->getMessage(),
            ]);

            return redirect()->back()->with(
                'error',
                'Error al iniciar el pago. Inténtalo de nuevo o contacta con el club.',
            );
        }

        return $this->redirectToStripeCheckout($checkoutUrl);
    }

    public function payPendingPago(PagoCuota $pago): RedirectResponse|HttpFoundationResponse
    {
        $user = Auth::user();
        if ((int) $pago->user_id !== (int) $user->id) {
            abort(403);
        }

        if (($pago->status ?? '') !== PagoCuota::STATUS_PENDING) {
            return back()->with('error', 'Este pago ya no está pendiente.');
        }

        try {
            $checkoutUrl = $this->initiatePayment->execute(
                $this->buildStripeDtoForPago($pago->load('plan'), $user),
            );
        } catch (Throwable $e) {
            Log::error('PlanesTaquillasController::payPendingPago Stripe error', [
                'pago_id' => $pago->id,
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);

            return back()->with('error', 'No se pudo abrir la pasarela de pago.');
        }

        return $this->redirectToStripeCheckout($checkoutUrl);
    }

    private function buildStripeDtoForPago(PagoCuota $pago, User $user): InitiatePaymentDto
    {
        $planName = (string) ($pago->plan?->nombre ?? 'Plan taquilla');
        $amountCents = (int) $pago->monto_pagado_cents;

        return new InitiatePaymentDto(
            payableType:   PagoCuota::class,
            payableId:     (int) $pago->id,
            lineItems:     [
                new PaymentLineItemDto(
                    name:            $planName,
                    description:     'Renovación taquilla',
                    unitAmountCents: $amountCents,
                    quantity:        1,
                ),
            ],
            successPath:   '/pago/exito',
            cancelPath:    '/taquilla/planes',
            customerEmail: $user->email,
            metadata:      ['pago_cuota_id' => (string) $pago->id],
        );
    }

    public function obtenerDatosUsuario(): JsonResponse
    {
        $user = Auth::user();

        try {
            return response()->json($this->taquillaService->userDatosPayload($user));
        } catch (Throwable $e) {
            Log::error('taquilla.membership.user_data_failed', [
                'action' => 'obtener_datos_usuario',
                'user_id' => $user->id,
                'payload' => [],
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'mensaje' => 'Error al cargar los datos del usuario.',
            ], 500);
        }
    }

    public function subirJustificante(SubirJustificanteTaquillaRequest $request, PagoCuota $pago): RedirectResponse
    {
        try {
            $this->taquillaService->uploadProof(user: Auth::user(), pago: $pago, request: $request);
        } catch (Throwable $e) {
            return back()->with('error', 'No se pudo subir el justificante. Intentalo de nuevo.');
        }

        return back()->with('success', 'Justificante subido. Pendiente de validacion.');
    }

    public function colaPagos(Request $request): Response|JsonResponse
    {
        $status = (string) $request->query('status', 'all');
        $search = trim((string) $request->query('search', ''));
        $pendingOnly = $request->boolean('pending_review', false);

        $payload = $this->taquillaService->buildPaymentQueuePayload(
            status: $status,
            search: $search,
            pendingOnly: $pendingOnly,
        );

        if ($request->wantsJson()) {
            return response()->json($payload);
        }

        return Inertia::render('Admin/Taquillas/Queue', [
            'pagos' => $payload,
        ]);
    }

    public function markPagoTaquillaReviewed(PagoCuota $pago): RedirectResponse
    {
        try {
            $this->taquillaService->markReviewed($pago);
        } catch (Throwable $e) {
            return back()->with('error', 'No se pudo actualizar la marca de revision.');
        }

        return back()->with('success', 'Marca de pendiente retirada correctamente.');
    }

    public function updatePagoTaquillaPaymentState(
        UpdatePagoTaquillaPaymentStateRequest $request,
        PagoCuota $pago,
    ): RedirectResponse {
        try {
            $this->taquillaService->updatePaymentState(pago: $pago, request: $request);
        } catch (ValidationException $e) {
            throw $e;
        } catch (Throwable $e) {
            return back()->with('error', 'No se pudo actualizar el estado del pago.');
        }

        return back()->with('success', 'Pago actualizado correctamente.');
    }

    public function updatePagoTaquillaCheckedState(
        UpdatePagoTaquillaCheckedStateRequest $request,
        PagoCuota $pago,
    ): RedirectResponse {
        try {
            $this->taquillaService->updateCheckedState(pago: $pago, request: $request);
        } catch (Throwable $e) {
            return back()->with('error', 'No se pudo actualizar el estado de comprobacion.');
        }

        return back()->with('success', 'Estado de comprobacion actualizado.');
    }

    public function confirmarPagoTaquilla(ConfirmarPagoTaquillaRequest $request, PagoCuota $pago): RedirectResponse
    {
        try {
            $this->taquillaService->confirmPayment(
                pago: $pago,
                admin: Auth::user(),
                request: $request,
            );
        } catch (ValidationException $e) {
            return back()->with('error', $e->getMessage());
        } catch (Throwable $e) {
            return back()->with('error', 'No se pudo confirmar el pago.');
        }

        return back()->with('success', 'Pago de taquilla confirmado.');
    }

    public function rechazarPagoTaquilla(RechazarPagoTaquillaRequest $request, PagoCuota $pago): RedirectResponse
    {
        try {
            $this->taquillaService->rejectPayment(pago: $pago, request: $request);
        } catch (ValidationException $e) {
            return back()->with('error', $e->getMessage());
        } catch (Throwable $e) {
            return back()->with('error', 'No se pudo rechazar el pago.');
        }

        return back()->with('success', 'Comprobante de taquilla rechazado.');
    }

    public function showProof(PagoCuota $pago): StreamedResponse
    {
        $viewer = Auth::user();
        if (! $viewer) {
            abort(403);
        }

        $isAdmin = (string) ($viewer->role ?? '') === 'admin';
        $isOwner = (int) $pago->user_id === (int) $viewer->id;

        if (! $isAdmin && ! $isOwner) {
            abort(403);
        }

        if (empty($pago->payment_proof_path) || ! Storage::disk('local')->exists($pago->payment_proof_path)) {
            abort(404);
        }

        $mime = Storage::disk('local')->mimeType($pago->payment_proof_path);
        $stream = Storage::disk('local')->readStream($pago->payment_proof_path);

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, [
            'Content-Type' => $mime ?: 'application/octet-stream',
            'Cache-Control' => 'no-store, private',
        ]);
    }

    public function reassignLocker(ReassignLockerRequest $request, User $user): RedirectResponse
    {
        try {
            $this->taquillaService->reassignLocker(
                target: $user,
                admin: Auth::user(),
                request: $request,
            );
        } catch (Throwable $e) {
            return back()->with('error', 'No se pudo reasignar la taquilla.');
        }

        return back()->with('success', 'Taquilla reasignada correctamente.');
    }

    public function storePlan(StorePlanTaquillaRequest $request): RedirectResponse
    {
        $plan = $this->taquillaService->storePlan($request);

        return back()->with('success', "Plan {$plan->nombre} creado correctamente.");
    }

    public function updatePlan(UpdatePlanTaquillaRequest $request, PlanTaquilla $plan): RedirectResponse
    {
        $this->taquillaService->updatePlan(plan: $plan, request: $request);

        return back()->with('success', "Plan {$plan->nombre} actualizado.");
    }

    public function togglePlanActive(PlanTaquilla $plan): RedirectResponse
    {
        $active = $this->taquillaService->togglePlanActive($plan);
        $state = $active ? 'activado' : 'desactivado';

        return back()->with('success', "Plan {$plan->nombre} {$state} correctamente.");
    }
}
