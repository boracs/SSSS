<?php

declare(strict_types=1);

namespace App\Contracts\Payments;

use App\DTOs\Payments\InitiatePaymentDto;

interface StartsCheckout
{
    public function execute(InitiatePaymentDto $dto): string;
}
