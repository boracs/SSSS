<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreContactMessageRequest;
use App\Jobs\SendContactMessageJob;
use Illuminate\Http\RedirectResponse;

class ContactMessageController extends Controller
{
    /**
     * Recibe el formulario validado y sanitizado, encola el Job de envío
     * en segundo plano y devuelve una redirección flash limpia.
     * Zero business logic in controller — delega todo al Job + Service.
     */
    public function store(StoreContactMessageRequest $request): RedirectResponse
    {
        $payload = array_merge(
            $request->safe()->only(['name', 'email', 'message']),
            [
                'ip'         => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]
        );

        SendContactMessageJob::dispatch($payload);

        return back()->with('success', 'Mensaje enviado correctamente. Te responderemos pronto.');
    }
}
