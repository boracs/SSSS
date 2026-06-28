<?php

declare(strict_types=1);

namespace App\Mail\Taquilla;

use App\Models\PagoCuota;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PagoTaquillaRechazadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly PagoCuota $pago,
        public readonly User $usuario,
        public readonly string $motivo,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu justificante de taquilla no fue aprobado · S4',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.taquilla.pago-rechazado',
            with: [
                'pago' => $this->pago,
                'usuario' => $this->usuario,
                'motivo' => $this->motivo,
            ],
        );
    }
}
