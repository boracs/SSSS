<?php

declare(strict_types=1);

namespace App\Http\Requests\Academy;

use App\Support\BusinessDateTime;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RequestPrivateLessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'date'             => ['required', 'date'],
            'start'            => ['required', 'date_format:H:i'],
            'duration_minutes' => ['nullable', 'integer', 'min:30', 'max:300'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            $data = $v->getData();
            $day = BusinessDateTime::parseInAppTimezone((string) $data['date'])->startOfDay();
            if ($day->lt(BusinessDateTime::today())) {
                $v->errors()->add('date', 'No puedes solicitar una fecha pasada.');

                return;
            }

            $durationMinutes = (int) ($data['duration_minutes'] ?? 90);
            if ($durationMinutes < 60 || $durationMinutes % 15 !== 0) {
                $v->errors()->add('duration_minutes', 'La duración debe ser de al menos 1 hora y en múltiplos de 15.');

                return;
            }

            $startsAt = BusinessDateTime::parseInAppTimezone($data['date'].' '.$data['start']);
            if (((int) $startsAt->minute % 15) !== 0) {
                $v->errors()->add('start', 'La hora de inicio debe estar en intervalos de 15 minutos.');

                return;
            }

            $endsAt = $startsAt->copy()->addMinutes($durationMinutes);
            if (((int) $endsAt->minute % 15) !== 0) {
                $v->errors()->add('duration_minutes', 'La hora de fin debe estar en intervalos de 15 minutos.');
            }
        });
    }

    public function slotStartsAt(): Carbon
    {
        $data = $this->validated();

        return BusinessDateTime::parseInAppTimezone($data['date'].' '.$data['start']);
    }

    public function slotEndsAt(): Carbon
    {
        $durationMinutes = (int) ($this->validated('duration_minutes') ?? 90);

        return $this->slotStartsAt()->copy()->addMinutes($durationMinutes);
    }
}
