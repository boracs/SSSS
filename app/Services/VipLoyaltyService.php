<?php

namespace App\Services;

class VipLoyaltyService
{
    /**
     * Texto plano: sin HTML para evitar XSS al mostrar en cliente.
     */
    public function sanitizeNoteBody(string $body): string
    {
        $text = strip_tags($body);

        return trim(preg_replace('/\s+/u', ' ', $text));
    }
}
