<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Shell de entrada del catálogo admin (tabs → CRUDs de dominio existentes).
 * Sin lógica de negocio ni unificación de modelos.
 */
final class CatalogHubController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Catalog/Index');
    }

    public function surfskate(): Response
    {
        return Inertia::render('Admin/Catalog/SurfskatePlaceholder');
    }
}
