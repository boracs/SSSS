<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Verificación de email encolada.
 * Extiende la notificación nativa de Laravel y añade cola (database)
 * para que el envío nunca bloquee el request (p.ej. guardar perfil con email nuevo).
 */
class VerifyEmail extends BaseVerifyEmail implements ShouldQueue
{
    use Queueable;
}
