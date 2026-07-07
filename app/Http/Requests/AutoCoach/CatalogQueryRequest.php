<?php

declare(strict_types=1);

namespace App\Http\Requests\AutoCoach;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Validator as ValidationValidator;

class CatalogQueryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'sport' => ['sometimes', 'nullable', 'string', 'max:80', 'regex:/^[a-zA-Z0-9_ -]+$/'],
            'posture' => ['sometimes', 'nullable', 'string', 'max:80', 'regex:/^[a-zA-Z0-9_ -]+$/'],
            'trick' => ['sometimes', 'nullable', 'string', 'max:120', 'regex:/^[a-zA-Z0-9_ -]+$/'],
        ];
    }

    public function withValidator(ValidationValidator $validator): void
    {
        $validator->after(function (ValidationValidator $validator): void {
            $route = $this->route()?->getName();

            if (in_array($route, ['autocoach.api.postures', 'autocoach.api.tricks', 'autocoach.api.video'], true)
                && (! is_string($this->query('sport')) || trim((string) $this->query('sport')) === '')) {
                $validator->errors()->add('sport', 'Falta el deporte.');
            }

            if (in_array($route, ['autocoach.api.tricks', 'autocoach.api.video'], true)
                && (! is_string($this->query('posture')) || trim((string) $this->query('posture')) === '')) {
                $validator->errors()->add('posture', 'Falta la postura.');
            }

            if ($route === 'autocoach.api.video'
                && (! is_string($this->query('trick')) || trim((string) $this->query('trick')) === '')) {
                $validator->errors()->add('trick', 'Falta la maniobra.');
            }
        });
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors()->all(),
        ], 422));
    }
}
