<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        // Invalida las demás sesiones del usuario (móvil, otros navegadores...).
        // Debe ir ANTES de cambiar el password: verifica el password actual contra
        // el hash todavía vigente en el guard; si se llama después, compara la
        // contraseña antigua contra el hash nuevo y siempre falla.
        Auth::logoutOtherDevices($validated['current_password']);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back();
    }
}
