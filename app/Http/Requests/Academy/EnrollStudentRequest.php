<?php

declare(strict_types=1);

namespace App\Http\Requests\Academy;

use Illuminate\Foundation\Http\FormRequest;

class EnrollStudentRequest extends FormRequest
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
        return [];
    }
}
