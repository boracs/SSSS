<?php

declare(strict_types=1);

namespace App\Http\Requests\Academy;

use Illuminate\Foundation\Http\FormRequest;

class RequestLessonRequest extends FormRequest
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
                'guest_email' => ['required', 'email', 'max:120'],
                'guest_phone' => ['required', 'string', 'max:40'],
            ];

        return array_merge([
            'quantity' => ['nullable', 'integer', 'min:1', 'max:6'],
            'party_size' => ['nullable', 'integer', 'min:1', 'max:12'],
            'request_extra_monitor' => ['nullable', 'boolean'],
            'age_bracket' => ['nullable', 'in:children,adult,family'],
            'participants' => ['nullable', 'array', 'min:1', 'max:6'],
            'participants.*.first_name' => ['required_with:participants', 'string', 'max:80'],
            'participants.*.last_name' => ['required_with:participants', 'string', 'max:80'],
        ], $guestRules);
    }

    public function partySize(): int
    {
        $participants = $this->participants();
        if ($participants !== []) {
            return count($participants);
        }

        return (int) ($this->validated('quantity') ?? $this->validated('party_size') ?? 1);
    }

    /**
     * @return list<array{first_name: string, last_name: string}>
     */
    public function participants(): array
    {
        $rows = $this->validated('participants');
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
            if ($first === '' || $last === '') {
                continue;
            }
            $out[] = ['first_name' => $first, 'last_name' => $last];
        }

        return $out;
    }

    public function requestExtraMonitor(): bool
    {
        return (bool) ($this->validated('request_extra_monitor') ?? false);
    }

    public function ageBracket(): ?string
    {
        $value = $this->validated('age_bracket');

        return is_string($value) ? $value : null;
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
