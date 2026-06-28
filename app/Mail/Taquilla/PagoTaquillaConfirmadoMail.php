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

class PagoTaquillaConfirmadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly PagoCuota $pago,
        public readonly User $usuario,
        public readonly ?int $lockerNumber = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu cuota de taquilla esta confirmada · S4',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.taquilla.pago-confirmado',
            with: [
                'pago' => $this->pago,
                'usuario' => $this->usuario,
                'lockerNumber' => $this->lockerNumber ?? $this->usuario->numeroTaquilla,
            ],
        );
    }
}
