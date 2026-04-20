<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreContactMessageRequest;
use App\Services\ContactMessageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;

class ContactMessageController extends Controller
{
    public function store(StoreContactMessageRequest $request, ContactMessageService $contactMessageService): RedirectResponse
    {
        $payload = $request->safe()->only(['name', 'email', 'message']);
        $payload['ip'] = $request->ip();
        $payload['user_agent'] = (string) $request->userAgent();

        try {
            $contactMessageService->dispatch($payload);

            return back()->with('success', 'Mensaje enviado correctamente. Te responderemos pronto.');
        } catch (\Throwable $exception) {
            Log::error('Error enviando mensaje de contacto.', [
                'error' => $exception->getMessage(),
                'ip' => $request->ip(),
            ]);

            return back()
                ->withErrors(['contact' => 'No se pudo enviar tu mensaje. Inténtalo de nuevo en unos minutos.'])
                ->withInput($request->except('website'));
        }
    }
}
