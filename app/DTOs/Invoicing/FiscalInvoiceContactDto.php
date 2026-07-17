<?php

declare(strict_types=1);

namespace App\DTOs\Invoicing;

use InvalidArgumentException;

/**
 * Datos del destinatario de la factura (comprador).
 *
 * NOTA (iteración 2 pendiente): `User` no almacena hoy NIF/dirección fiscal, por lo que
 * se emite como factura simplificada (nombre + email) — ver docs/invoicing/B2BROUTER-TICKETBAI.md.
 */
final readonly class FiscalInvoiceContactDto
{
    public function __construct(
        public string $name,
        public string $email,
        public string $country = 'es',
        public string $language = 'es',
        public string $currency = 'EUR',
        public ?string $address = null,
        public ?string $city = null,
        public ?string $province = null,
        public ?string $postalcode = null,
        public ?int $tinScheme = null,
        public ?string $tinValue = null,
    ) {
        if ($this->name === '') {
            throw new InvalidArgumentException('El nombre del contacto es obligatorio.');
        }

        if ($this->email === '') {
            throw new InvalidArgumentException('El email del contacto es obligatorio.');
        }
    }
}
