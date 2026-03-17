<?php

namespace App\Notifications;

use App\Models\Lesson;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SoloStudentLessonNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Lesson $lesson
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('¡Enhorabuena! Sesión particular confirmada')
            ->greeting('¡Hola ' . ($notifiable->nombre ?? $notifiable->name ?? '') . '!')
            ->line('Eres el único alumno en la clase del ' . $this->lesson->starts_at->format('d/m/Y \a \l\a\s H:i') . '.')
            ->line('Disfrutarás de una sesión particular. Coste: 2 créditos.')
            ->salutation('San Sebastian Surf School · S4');
    }

}
