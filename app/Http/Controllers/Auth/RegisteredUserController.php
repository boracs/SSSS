<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Carrito;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect; // Importación de Redirect
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'nombre' => 'required|string|max:50',
            'apellido' => 'required|string|max:50',
            'email' => 'required|string|lowercase|email|max:100|unique:'.User::class,
            'telefono' => 'required|string|max:12',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Crear el usuario
        $user = User::create([
            'role' => 'user', // El valor 'user' es el predeterminado
            'nombre' => $request->nombre,
            'apellido' => $request->apellido,
            'email' => $request->email,
            'telefono' => $request->telefono,
            'numeroTaquilla' => $request->numeroTaquilla ?? '0', // Si se proporciona
            'password' => Hash::make($request->password), // Encriptación de la contraseña
        ]);

        // Disparar el evento de registro
        event(new Registered($user));

        // Iniciar sesión automáticamente al crear el usuario
        Auth::login($user);

        $carrito = Carrito::forUser((int) $user->id);

        // Redirigir a una página usando Inertia
        return Redirect::route('Pag_principal')->with([
            'user' => $user,
            'carrito' => $carrito,
        ]);

    }
}
