<?php

declare(strict_types=1);

namespace App\Http\Requests\Academy;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class UploadLessonProofRequest extends FormRequest
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
            'proof' => ['required', 'file', 'mimes:jpeg,jpg,png,gif,webp,pdf', 'max:10240'],
            'payment_method' => ['nullable', 'in:bizum,transferencia'],
        ];
    }

    public function paymentMethod(): ?string
    {
        $value = $this->validated('payment_method');

        return is_string($value) ? $value : null;
    }

    public function proofFile(): UploadedFile
    {
        /** @var UploadedFile $file */
        $file = $this->file('proof');

        return $file;
    }
}
