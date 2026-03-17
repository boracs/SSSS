<?php

namespace App\Mail;

use App\Models\Lesson;
use App\Models\LessonUser;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RequestReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public LessonUser $enrollment,
        public Lesson $lesson,
        public string $iban,
        public string $bizumNumber,
        public string $profileUrl
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu plaza en S4 está bloqueada (3h)',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.request-received',
        );
    }
}
