<?php

declare(strict_types=1);

namespace App\DTOs\Academy;

readonly class AdminGuestEnrollmentDto
{
    public function __construct(
        public string $firstName,
        public string $lastName,
        public ?string $phone = null,
        public ?string $email = null,
        public bool $paymentConfirmed = false,
        public ?string $paymentMethod = null,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $paymentStatus = (string) ($data['payment_status'] ?? 'pending');

        return new self(
            firstName: trim((string) ($data['first_name'] ?? $data['guest_first_name'] ?? '')),
            lastName: trim((string) ($data['last_name'] ?? $data['guest_last_name'] ?? '')),
            phone: self::nullableString($data['phone'] ?? $data['guest_phone'] ?? null),
            email: self::nullableString($data['email'] ?? $data['guest_email'] ?? null),
            paymentConfirmed: $paymentStatus === 'confirmed',
            paymentMethod: self::nullableString($data['payment_method'] ?? null),
        );
    }

    private static function nullableString(mixed $value): ?string
    {
        $trimmed = trim((string) ($value ?? ''));

        return $trimmed !== '' ? $trimmed : null;
    }
}
