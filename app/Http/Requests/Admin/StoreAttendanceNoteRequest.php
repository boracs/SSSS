<?php

namespace App\Http\Requests\Admin;

use App\Models\AttendanceNote;
use App\Models\Booking;
use App\Models\Lesson;
use App\Models\LessonUser;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAttendanceNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-vips') ?? false;
    }

    public function rules(): array
    {
        return [
            'attendance_note_id' => ['nullable', 'integer', 'exists:attendance_notes,id'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'body' => ['required', 'string', 'max:10000'],
            'is_visible_to_student' => ['sometimes', 'boolean'],
            'reservation_type' => ['nullable', 'string', 'in:lesson_user,booking'],
            'reservation_id' => ['nullable', 'integer'],
            'lesson_id' => ['nullable', 'integer', 'exists:lessons,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $userId = (int) $this->input('user_id');
            $user = User::query()->find($userId);
            if (! $user || ! $user->is_vip) {
                $v->errors()->add('user_id', 'El usuario debe existir y ser VIP.');

                return;
            }

            $noteId = $this->input('attendance_note_id');
            if ($noteId !== null && $noteId !== '') {
                $note = AttendanceNote::query()->find((int) $noteId);
                if (! $note || (int) $note->user_id !== $userId) {
                    $v->errors()->add('attendance_note_id', 'La nota no corresponde a este alumno.');
                }

                return;
            }

            $type = $this->input('reservation_type');
            $resId = $this->input('reservation_id');
            $lessonId = $this->input('lesson_id');
            if (($type === null || $type === '') && $lessonId !== null && $lessonId !== '') {
                $okLesson = Lesson::query()->whereKey((int) $lessonId)->exists();
                if (! $okLesson) {
                    $v->errors()->add('lesson_id', 'La clase seleccionada no existe.');
                }

                return;
            }
            if ($type === null || $resId === null || $type === '') {
                return;
            }

            $resId = (int) $resId;
            if ($type === 'lesson_user') {
                $ok = LessonUser::query()
                    ->whereKey($resId)
                    ->where('user_id', $userId)
                    ->exists();
            } elseif ($type === 'booking') {
                $ok = Booking::query()
                    ->whereKey($resId)
                    ->where('user_id', $userId)
                    ->exists();
            } else {
                $ok = false;
            }

            if (! $ok) {
                $v->errors()->add('reservation_id', 'La reserva no pertenece a este alumno.');
            }
        });
    }
}
