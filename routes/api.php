<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ChatbotController; // Asegúrate de tener esta importación

use App\Http\Controllers\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\PlanesTaquillasController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Aquí es donde puedes registrar rutas de API para tu aplicación. Estas
| rutas son cargadas por el RouteServiceProvider dentro de un grupo
| que se asigna al middleware "api". ¡Disfruta construyendo tu API!
|


*/
//CHAAAT TBOOOTTTT
Route::middleware('throttle:40,1')->group(function () {
    Route::post('/chatbot/message', [ChatbotController::class, 'handleMessage']);
    Route::post('/chatbot/extract-artifact', [ChatbotController::class, 'extractAndSaveArtifact']);
    Route::post('/chatbot/extract-and-save-artifact', [ChatbotController::class, 'extractAndSaveArtifact']);
});
// Ejemplo de ruta de usuario que ya podrías tener
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});



// Rutas bajo autenticación (admin/taquilla y disponibilidad)
Route::middleware(['auth'])->group(function () {
    Route::get('/taquilla', [PlanesTaquillasController::class, 'AdminIndex'])->name('taquilla.index.admin');
    Route::get('/bookings/check-availability', [AdminBookingController::class, 'checkAvailability']);
});









