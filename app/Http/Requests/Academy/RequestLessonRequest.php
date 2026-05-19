<?php

declare(strict_types=1);

namespace App\Http\Requests\Academy;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class RequestLessonRequest extends FormRequest
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
            'quantity' => ['nullable', 'integer', 'min:1', 'max:6'],
            'party_size' => ['nullable', 'integer', 'min:1', 'max:12'],
            'request_extra_monitor' => ['nullable', 'boolean'],
            'age_bracket' => ['nullable', 'in:children,adult,family'],
            'proof' => ['required', 'file', 'mimes:jpeg,jpg,png,gif,webp,pdf', 'max:10240'],
            'payment_method' => ['nullable', 'in:bizum,transferencia'],
        ];
    }

    public function partySize(): int
    {
        return (int) ($this->validated('quantity') ?? $this->validated('party_size') ?? 1);
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
