<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactMessageService
{
    public function dispatch(array $payload): void
    {
        $recipient = config('services.contact_form.to', config('mail.from.address'));

        $textBody = implode(PHP_EOL, [
            'Nuevo mensaje desde el formulario de contacto',
            '',
            'Nombre: '.$payload['name'],
            'Email: '.$payload['email'],
            'IP: '.($payload['ip'] ?? 'N/A'),
            'User-Agent: '.($payload['user_agent'] ?? 'N/A'),
            '',
            'Mensaje:',
            $payload['message'],
        ]);

        Mail::raw($textBody, function ($message) use ($payload, $recipient) {
            $message
                ->to($recipient)
                ->replyTo($payload['email'], $payload['name'])
                ->subject('Nuevo mensaje de contacto');
        });

        Log::info('Formulario de contacto enviado correctamente.', [
            'email_hash' => hash('sha256', $payload['email']),
            'ip' => $payload['ip'] ?? null,
        ]);
    }
}
