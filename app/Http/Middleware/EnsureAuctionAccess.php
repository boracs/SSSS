<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Seo\PublicPageSeoService;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureAuctionAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return redirect()->guest(route('login'));
        }

        if ($user->role === 'admin' || $user->canAccessAuctions()) {
            return $next($request);
        }

        return Inertia::render('Auctions/AccessRequired', [
            'seo' => app(PublicPageSeoService::class)->subastasAccessRequired()->toArray(),
        ])
            ->toResponse($request)
            ->setStatusCode(403);
    }
}
