<?php

namespace App\Mail;

use App\Models\Lesson;
use App\Models\LessonUser;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReservationConfirmedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public LessonUser $enrollment,
        public Lesson $lesson
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '¡Reserva confirmada! Prepárate para el baño',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reservation-confirmed',
        );
    }
}
