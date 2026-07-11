<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirección externa compatible con Inertia 2 (X-Inertia) y peticiones clásicas.
 */
trait RedirectsToStripeCheckout
{
    protected function redirectToStripeCheckout(string $checkoutUrl): RedirectResponse|Response
    {
        if (request()->header('X-Inertia')) {
            return Inertia::location($checkoutUrl);
        }

        return redirect()->away($checkoutUrl);
    }
}
