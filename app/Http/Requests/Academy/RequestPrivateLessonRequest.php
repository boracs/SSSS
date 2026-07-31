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
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        $guestRules = $this->user()
            ? []
            : [
                'guest_first_name' => ['required', 'string', 'max:80'],
                'guest_last_name' => ['required', 'string', 'max:80'],
                'guest_email' => ['required', 'email', 'max:120'],
                'guest_phone' => ['required', 'string', 'max:40'],
            ];

        return array_merge([
            'date' => ['required', 'date'],
            'start' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['nullable', 'integer', 'min:30', 'max:300'],
            'participants' => ['required', 'array', 'min:1', 'max:6'],
            'participants.*.first_name' => ['required', 'string', 'max:80'],
            'participants.*.last_name' => ['required', 'string', 'max:80'],
            'participants.*.age' => ['required', 'integer', 'min:5', 'max:99'],
        ], $guestRules);
    }

    /**
     * @return list<array{first_name: string, last_name: string, age: int}>
     */
    public function participants(): array
    {
        $rows = $this->validated('participants') ?? [];
        if (! is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $first = trim((string) ($row['first_name'] ?? ''));
            $last = trim((string) ($row['last_name'] ?? ''));
            $age = (int) ($row['age'] ?? 0);
            if ($first === '' || $last === '' || $age < 5) {
                continue;
            }
            $out[] = [
                'first_name' => $first,
                'last_name' => $last,
                'age' => $age,
            ];
        }

        return $out;
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

    public function guestFirstName(): ?string
    {
        $value = trim((string) ($this->validated('guest_first_name') ?? ''));

        return $value !== '' ? $value : null;
    }

    public function guestLastName(): ?string
    {
        $value = trim((string) ($this->validated('guest_last_name') ?? ''));

        return $value !== '' ? $value : null;
    }

    public function guestEmail(): ?string
    {
        $value = trim((string) ($this->validated('guest_email') ?? ''));

        return $value !== '' ? $value : null;
    }

    public function guestPhone(): ?string
    {
        $value = trim((string) ($this->validated('guest_phone') ?? ''));

        return $value !== '' ? $value : null;
    }
}
