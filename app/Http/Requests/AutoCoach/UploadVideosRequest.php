<?php

declare(strict_types=1);

namespace App\Http\Requests\AutoCoach;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UploadVideosRequest extends FormRequest
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
        $maxBatch = (int) config('autocoach.max_files_per_batch', 7);
        $maxKb = (int) ceil(config('autocoach.max_file_bytes') / 1024);

        return [
            'videos' => ['required', 'array', 'min:1', 'max:'.$maxBatch],
            'videos.*' => ['required', 'file', 'mimes:mp4,mov,webm', 'max:'.$maxKb],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $maxBatch = (int) config('autocoach.max_files_per_batch', 7);
        $maxMb = (int) ceil(config('autocoach.max_file_bytes') / (1024 * 1024));
        $maxDuration = (int) config('autocoach.max_duration_seconds', 30);

        return [
            'videos.required' => 'No se recibieron vídeos.',
            'videos.max' => "Máximo {$maxBatch} vídeos por subida.",
            'videos.*.mimes' => 'Formato no permitido. Usa MP4, MOV o WebM.',
            'videos.*.max' => "Cada clip puede pesar como máximo {$maxMb} MB (y durar hasta {$maxDuration} s).",
        ];
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
