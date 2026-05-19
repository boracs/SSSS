<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class CancelLessonEnrollmentRequest extends FormRequest
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
            'late_policy' => ['nullable', 'in:lose,rescue'],
        ];
    }

    public function latePolicy(): ?string
    {
        $value = $this->validated('late_policy');

        return is_string($value) ? $value : null;
    }
}
