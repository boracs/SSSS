<?php

use App\Support\AcademyContact;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\AuctionController;
use App\Http\Controllers\Admin\AuctionController as AdminAuctionController;
use App\Http\Controllers\AutoCoachController;
use App\Http\Controllers\Payments\PaymentWebhookController;
use App\Http\Controllers\Payments\PaymentSuccessController;
use App\Http\Controllers\Admin\BonoController as AdminBonoController;
use App\Http\Controllers\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Admin\PaymentValidationController;
use App\Http\Controllers\Admin\EmergencyKeyController as AdminEmergencyKeyController;
use App\Http\Controllers\Admin\SecondHandBoardController as AdminSecondHandBoardController;
use App\Http\Controllers\Admin\SurfboardController as AdminSurfboardController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Admin\ClassManagerController;
use App\Http\Controllers\Admin\VipClassManagerController;
use App\Http\Controllers\Admin\VipController;
use App\Http\Controllers\CarritoController;
use App\Http\Controllers\Client\BonoController as ClientBonoController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\EmergencyKeyController;
use App\Http\Controllers\Pag_principalController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\PlanesTaquillasController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Rentals\BookingController as RentalsBookingController;
use App\Http\Controllers\Rentals\SurfboardController as RentalsSurfboardController;
use App\Http\Controllers\SecondHandBoardController;
use App\Http\Controllers\TaquillaController;
use App\Http\Controllers\TiendaController;
use App\Http\Controllers\User\MyProfileController;
use App\Http\Controllers\User\MyReservationsController;
use App\Http\Middleware\VerificarAdmin;
use App\Http\Middleware\VerificarTaquilla;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Rutas PUBLICAS DE TODOS LSO USUARIOS (incluso NO REGISTRADOS)
// tema de cuentas login  y registro
Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
Route::post('/login', [AuthenticatedSessionController::class, 'store']);
Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
Route::post('/register', [RegisteredUserController::class, 'store']);
// PAGINA PRINCIPAL (ruta pública, sin middleware auth)
Route::get('/', [Pag_principalController::class, 'index'])->name('Pag_principal');
// NOSOTROS
Route::get('/nosotros', function () {
    return Inertia::render('Nosotros');
})->name('nosotros');
// TIENDA — tienda única oficial S4
Route::get('/tienda', [TiendaController::class, 'index'])->name('tienda');
Route::redirect('/tienda-oficial', '/tienda')->name('tienda.oficial');

// SEGUNDA MANO — Catálogo público (accesible sin autenticación)
Route::get('/segunda-mano', [SecondHandBoardController::class, 'index'])->name('second-hand.index');
Route::get('/segunda-mano/{secondHandBoard}', [SecondHandBoardController::class, 'show'])->name('second-hand.show');

Route::middleware(['auth', 'auction.access'])->group(function () {
    Route::get('/subastas', [AuctionController::class, 'index'])->name('auctions.index');
    Route::get('/subastas/{auction:slug}', [AuctionController::class, 'show'])->name('auctions.show');
    Route::middleware('throttle:30,1')->group(function () {
        Route::post('/subastas/{auction:slug}/pujar', [AuctionController::class, 'placeBid'])->name('auctions.bid');
        Route::post('/subastas/{auction:slug}/pagar', [AuctionController::class, 'pay'])->name('auctions.pay');
    });
});

// TALLER DE SURF — Blog / guías SEO
Route::get('/taller', [ArticleController::class, 'index'])->name('taller.index');
Route::get('/taller/{article:slug}', [ArticleController::class, 'show'])->name('taller.show');

// CONTACTO
Route::get('/contacto', function () {
    return Inertia::render('Contacto');
})->name('contacto');
Route::post('/contacto', [ContactMessageController::class, 'store'])
    ->middleware('throttle:3,1')
    ->name('contacto.store');

// ── Stripe Webhooks (sin CSRF, sin auth — la seguridad la da la firma HMAC) ──
Route::post('/webhooks/stripe', [PaymentWebhookController::class, 'handle'])
    ->name('webhooks.stripe');

// ── Retorno desde Stripe Checkout ──
Route::middleware(['auth'])->group(function () {
    Route::get('/pagos/recibos/{paymentReceipt}', [\App\Http\Controllers\Payments\PaymentReceiptController::class, 'show'])
        ->name('payments.receipts.show');
    Route::get('/pagos/facturas/{fiscalInvoice}', [\App\Http\Controllers\Payments\FiscalInvoiceController::class, 'show'])
        ->name('payments.fiscal-invoices.show');
    Route::get('/pagos/facturas/{fiscalInvoice}/pdf', [\App\Http\Controllers\Payments\FiscalInvoiceController::class, 'pdf'])
        ->name('payments.fiscal-invoices.pdf');
    Route::get('/pago/exito', [PaymentSuccessController::class, 'show'])
        ->name('payment.success');
    Route::get('/pago/cancelado', function () {
        return redirect()->back()->with('info', 'Has cancelado el proceso de pago. Puedes intentarlo de nuevo cuando quieras.');
    })->name('payment.cancelled');
});
// PRODUCTO INDIV
Route::get('/producto-ver/{productoId}', [ProductoController::class, 'ver'])->name('producto.ver');
// SERVICIOS
Route::get('/servicios', function () {
    $edy = config('services.repair.edy', []);
    $edyPhoneDigits = preg_replace('/\D+/', '', (string) ($edy['phone'] ?? ''));
    $edyPhoneDisplay = trim((string) ($edy['phone_display'] ?? ''));

    if ($edyPhoneDisplay === '' && $edyPhoneDigits !== '') {
        if (str_starts_with($edyPhoneDigits, '34') && strlen($edyPhoneDigits) >= 11) {
            $local = substr($edyPhoneDigits, 2, 9);
            $edyPhoneDisplay = sprintf(
                '+34 %s %s %s',
                substr($local, 0, 3),
                substr($local, 3, 3),
                substr($local, 6, 3),
            );
        } else {
            $edyPhoneDisplay = '+'.$edyPhoneDigits;
        }
    }

    $edyEmail = trim((string) ($edy['email'] ?? ''));
    $edyWhatsappUrl = AcademyContact::urlForPhone(
        (string) ($edy['phone'] ?? ''),
        'Hola Edy, tengo una duda sobre reparar mi tabla antes de solicitar el servicio.',
    );

    return Inertia::render('Servicios', [
        'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
        'edyContact' => [
            'name' => (string) ($edy['name'] ?? 'Edy Mulder'),
            'phone' => $edyPhoneDisplay !== '' ? $edyPhoneDisplay : null,
            'phoneTel' => $edyPhoneDigits !== '' ? '+'.$edyPhoneDigits : null,
            'email' => $edyEmail !== '' ? $edyEmail : null,
            'whatsappUrl' => $edyWhatsappUrl,
        ],
    ]);
})->name('servicios');
Route::get('/servicios/reparacion-neoprenos', function () {
    $willy = config('services.repair.willy', []);
    $willyPhoneDigits = preg_replace('/\D+/', '', (string) ($willy['phone'] ?? ''));
    $willyPhoneDisplay = trim((string) ($willy['phone_display'] ?? ''));

    if ($willyPhoneDisplay === '' && $willyPhoneDigits !== '') {
        if (str_starts_with($willyPhoneDigits, '34') && strlen($willyPhoneDigits) >= 11) {
            $local = substr($willyPhoneDigits, 2, 9);
            $willyPhoneDisplay = sprintf(
                '+34 %s %s %s',
                substr($local, 0, 3),
                substr($local, 3, 3),
                substr($local, 6, 3),
            );
        } else {
            $willyPhoneDisplay = '+'.$willyPhoneDigits;
        }
    }

    $willyEmail = trim((string) ($willy['email'] ?? ''));
    $willyWhatsappUrl = AcademyContact::urlForPhone(
        (string) ($willy['phone'] ?? ''),
        'Hola Willy, tengo una duda sobre reparar mi neopreno antes de dejarlo en la percha.',
    );

    return Inertia::render('Servicios_ReparacionNeoprenos', [
        'whatsappHelpUrl' => AcademyContact::whatsappBaseUrl(),
        'willyContact' => [
            'name' => (string) ($willy['name'] ?? 'Willy'),
            'phone' => $willyPhoneDisplay !== '' ? $willyPhoneDisplay : null,
            'phoneTel' => $willyPhoneDigits !== '' ? '+'.$willyPhoneDigits : null,
            'email' => $willyEmail !== '' ? $willyEmail : null,
            'whatsappUrl' => $willyWhatsappUrl,
        ],
    ]);
})->name('servicios.reparacionNeoprenos');
Route::get('/servicios/surf', function () {
    return Inertia::render('Servicios_ClasesDeSurf');
})->name('servicios.surf');
Route::get('/servicios/surf-skate', function () {
    return Inertia::render('Servicios_SurfSkate');
})->name('servicios.surfSkate');
Route::get('/servicios/surf-skate/guia-equipamiento', function () {
    return Inertia::render('Servicios_SurfskateGuia');
})->name('servicios.surfSkate.guia');
Route::get('/servicios/surf-trips', function () {
    return Inertia::render('Servicios_SurfTrips');
})->name('servicios.surfTrips');
Route::get('/servicios/fotos', function () {
    return Inertia::render('Servicios_Fotos');
})->name('servicios.fotografia');
Route::get('/servicios/videograbaciones', function () {
    return Inertia::render('Servicios_Videograbaciones');
})->name('servicios.videograbaciones');
Route::get('/servicios/webcams', function () {
    return Inertia::render('Servicios_Webcams');
})->name('servicios.webcams');
Route::redirect('/webcams', '/servicios/webcams');
// Enlaces legacy del carrusel home (OpcionesIntro)
Route::redirect('/clases-de-surf', '/servicios/surf');
Route::redirect('/surftrips', '/servicios/surf-trips');
Route::redirect('/surfskate', '/servicios/surf-skate');
Route::redirect('/surfskate/guia', '/servicios/surf-skate/guia-equipamiento');
Route::redirect('/taquillas', '/taquillas/planes-y-cuotas');

// AutoCoach — comparador de maniobras (público)
Route::prefix('comparador-surf')->name('autocoach.')->group(function () {
    Route::get('/', [AutoCoachController::class, 'index'])->name('index');
    Route::middleware('throttle:120,1')->group(function () {
        Route::get('/api/sports', [AutoCoachController::class, 'sports'])->name('api.sports');
        Route::get('/api/postures', [AutoCoachController::class, 'postures'])->name('api.postures');
        Route::get('/api/tricks', [AutoCoachController::class, 'tricks'])->name('api.tricks');
        Route::get('/api/video', [AutoCoachController::class, 'video'])->name('api.video');
    });
    Route::post('/api/upload', [AutoCoachController::class, 'upload'])
        ->middleware('throttle:15,1')
        ->name('api.upload');
    Route::delete('/api/uploads', [AutoCoachController::class, 'destroyUploads'])
        ->middleware('throttle:20,1')
        ->name('api.uploads.destroy');
    Route::get('/referencia/{path}', [AutoCoachController::class, 'showReference'])
        ->middleware('throttle:240,1')
        ->where('path', '.+')
        ->name('reference.show');
    Route::get('/uploads/{session}/{filename}', [AutoCoachController::class, 'showUpload'])
        ->middleware('throttle:180,1')
        ->where([
            'session' => '[a-zA-Z0-9_-]{16,64}',
            'filename' => '[a-zA-Z0-9._-]+',
        ])
        ->name('uploads.show');
});

// Taquillas — catálogo público de planes y tarifas (sin login)
Route::get('/taquillas/planes-y-cuotas', [PlanesTaquillasController::class, 'publicPlans'])
    ->name('taquillas.planes');

// ==========================
// ACADEMIA (clases con créditos)
// ==========================
Route::middleware('auth')->prefix('academia')->name('academy.')->group(function () {
    Route::get('/', [\App\Http\Controllers\Academy\LessonController::class, 'index'])->name('lessons.index');
    Route::post('/lessons/{lesson}/request', [\App\Http\Controllers\Academy\LessonController::class, 'requestLesson'])->name('lessons.request');
    Route::post('/lessons/{lesson}/pay', [\App\Http\Controllers\Academy\LessonController::class, 'payPendingEnrollment'])->name('lessons.pay');
    Route::get('/particular/availability', [\App\Http\Controllers\Academy\LessonController::class, 'privateAvailability'])->name('private.availability');
    Route::post('/particular/request', [\App\Http\Controllers\Academy\LessonController::class, 'requestPrivateLesson'])->name('private.request');
    Route::post('/lessons/{lesson}/upload-proof', [\App\Http\Controllers\Academy\LessonController::class, 'uploadProof'])->name('lessons.upload-proof');
    Route::post('/lessons/{lesson}/manual-confirm-payment', [\App\Http\Controllers\Academy\LessonController::class, 'confirmManualPayment'])->name('lessons.manual-confirm-payment');
    Route::post('/lessons/{lesson}/enroll', [\App\Http\Controllers\Academy\LessonController::class, 'enroll'])->name('lessons.enroll');
    Route::post('/lessons/{lesson}/cancel', [\App\Http\Controllers\Academy\LessonController::class, 'cancel'])->name('lessons.cancel');
    Route::post('/lessons/{lesson}/confirm-surf-trip', [\App\Http\Controllers\Academy\LessonController::class, 'confirmSurfTrip'])->name('lessons.confirm-surf-trip');
});

Route::middleware('auth')->prefix('bonos')->name('bonos.')->group(function () {
    Route::get('/', [ClientBonoController::class, 'index'])->name('index');
    Route::post('/request-purchase', [ClientBonoController::class, 'requestPurchase'])->name('request-purchase');
});

// ==========================
// ALQUILER DE TABLAS (público)
// ==========================
// Catálogo accesible por cualquier usuario/visitante. La reserva se crea vía POST (CSRF) con datos de cliente.
Route::prefix('tablas-alquiler')->name('rentals.')->group(function () {
    Route::get('/', [RentalsSurfboardController::class, 'index'])->name('surfboards.index');
    Route::get('/{category}', [RentalsSurfboardController::class, 'index'])
        ->whereIn('category', ['soft', 'hard'])
        ->name('surfboards.index.category');
    Route::get('/tabla/{surfboard}', [RentalsSurfboardController::class, 'show'])->name('surfboards.show');

    Route::get('/check-availability', [RentalsBookingController::class, 'checkAvailability'])->name('bookings.check-availability');
    Route::post('/reservar', [RentalsBookingController::class, 'store'])->name('bookings.store');
});

// ///USUARIO REGISTRADO SIN TAQUILLA ASIGNADA////////////

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // PEDIDOS (disponible para cualquier usuario autenticado)
    Route::get('/pedidos', [PedidoController::class, 'mostrarPedidos'])->name('pedidos');
    Route::get('/mostrar-pedido/{id_pedido}', [PedidoController::class, 'mostrarPedido'])->name('mostrar.pedido');
    Route::get('/mis-reservas', [MyReservationsController::class, 'index'])->name('my-reservations.index');
    Route::get('/mis-facturas', [\App\Http\Controllers\Payments\MyFiscalInvoicesController::class, 'index'])->name('my-invoices.index');
    Route::get('/mi-perfil', [MyProfileController::class, 'index'])->name('my-profile.index');
    Route::post('/mis-reservas/clases/{enrollment}/pagar', [MyReservationsController::class, 'payClassEnrollment'])->name('my-reservations.class.pay');
    Route::post('/mis-reservas/alquileres/{booking}/pagar', [MyReservationsController::class, 'payRentalBooking'])->name('my-reservations.rental.pay');
    Route::post('/mis-reservas/clases/{enrollment}/upload-proof', [MyReservationsController::class, 'uploadClassProof'])->name('my-reservations.class.upload-proof');
    Route::post('/mis-reservas/alquileres/{booking}/upload-proof', [MyReservationsController::class, 'uploadRentalProof'])->name('my-reservations.rental.upload-proof');
    Route::post('/mis-reservas/clases/{enrollment}/cancel', [MyReservationsController::class, 'cancelClass'])->name('my-reservations.class.cancel');
    Route::post('/mis-reservas/alquileres/{booking}/cancel', [MyReservationsController::class, 'cancelRental'])->name('my-reservations.rental.cancel');

    // Panel de planes/cuotas: accesible sin taquilla (solo consulta); el pago exige taquilla asignada.
    Route::get('/taquilla/planes', [PlanesTaquillasController::class, 'ClientIndex'])->name('taquillas.index.client');
});

// RUTAS PARA LSO USUARISO REGISTRADOS CON TAQUILLA ASIGNADDA

// Aplicamos ['auth', 'verificarTaquilla'] a TODAS las rutas relacionadas con el proceso de compra.
Route::middleware(['auth', 'verificarTaquilla'])->group(function () {

    // CARRITO (REQUIERE TAQUILLA)
    // Ruta para agregar productos al carrito
    Route::post('/carrito/agregar/{productoId}', [CarritoController::class, 'agregarAlCarrito'])->name('carrito.agregar');
    // Ruta para ver el carrito
    Route::get('/carrito', [CarritoController::class, 'index'])->name('carrito');
    // Ruta para eliminar productos del carrito
    Route::delete('/carrito/eliminar/{productoId}', [CarritoController::class, 'eliminarProducto'])->name('carrito.eliminar');

    // Redirigir GET a la ruta del carrito para evitar errores al refrescar la página
    Route::get('/carrito/agregar/{id}', function ($id) {
        return redirect()->route('carrito');
    });

    // PEDIDOS (acciones que requieren taquilla)
    Route::post('/crear-pedido', [PedidoController::class, 'crear'])->name('crear.pedido');
    // La ruta de confirmación de pedido se gestionaría dentro del POST de 'crear-pedido'

    // CLIENT PANEL DE TAQUILLAS (REQUIERE TAQUILLA)
    Route::post('/taquilla/registrar-pago', [PlanesTaquillasController::class, 'registrarPago'])
        ->middleware('throttle:10,1')
        ->name('taquillas.pago.client');
    Route::post('/taquilla/pagos/{pago}/pagar', [PlanesTaquillasController::class, 'payPendingPago'])
        ->middleware('throttle:10,1')
        ->name('taquillas.pago.pay');
    Route::post('/taquilla/pagos/{pago}/subir-justificante', [PlanesTaquillasController::class, 'subirJustificante'])
        ->middleware('throttle:10,1')
        ->name('taquillas.pago.upload-proof');
    Route::get('/taquilla/pagos/{pago}/justificante', [PlanesTaquillasController::class, 'showProof'])
        ->name('taquillas.pago.proof');
    Route::get('/taquilla/usuario-datos', [PlanesTaquillasController::class, 'obtenerDatosUsuario'])->name('taquillas.usuario.datos');

    // Llave de emergencia — socio con taquilla activa
    Route::get('/profile/me-quede-sin-llave', [EmergencyKeyController::class, 'show'])->name('emergency-key.show');
    Route::post('/profile/me-quede-sin-llave', [EmergencyKeyController::class, 'request'])->name('emergency-key.request');
});

// ///ADMINISTRADORES////////////

// Aqui uso un midleware personalizado que sirve pàra unicamente permitir el acceso a los usuariso que son admin
Route::middleware(['auth', VerificarAdmin::class, 'can:manage-vips'])->group(function () { // verifico que este asutentificado y ademas que sea admin
    // PRODUCTOS   // Rutas para el administrador para poder modificar productos
    Route::get('/productos', [ProductoController::class, 'mostrarProductos'])->name('mostrar.productos');
    Route::put('/productos/{id}/eliminar', [ProductoController::class, 'desactivarProducto'])->name('producto.eliminar');
    Route::post('/productos-edit/{id}', [ProductoController::class, 'update'])->name('producto.edit');
    Route::get('/producto-crear', [ProductoController::class, 'crear'])->name('producto.crear'); // muestra la vista de crear producto

    Route::post('/producto-store', [ProductoController::class, 'store'])->name('producto.create');
    // mostrar cuando un produto se modifico o se creo corerctamente
    Route::get('/producto-modificado', function () {
        return Inertia::render('ProductoModificado');
    })->name('producto.modificado');
    Route::get('/producto-creado', function () {
        return Inertia::render('ProductoCreado');
    })->name('producto.creado');
    Route::post('/productos/{producto}/imagen-principal', [ProductoController::class, 'cambiarImagenPrincipal'])->name('producto.imagen-principal'); // CAMBIO LA IMAGEN PRINCIPAL DE UN PRODUCTO
    Route::get('/productos/{producto}/imagenes', [ProductoController::class, 'obtenerImagenes'])->name('producto.imagenes'); // OBTENGO LAS IMAGENES DE UN PRODUCTO SELECCIONADO

    // ASIGNADOR DE TAQUILLAS:
    // mostrar el formulario y envia al cotnrolador apra msdotrar el formulario con sus datos
    Route::get('/asignar-taquilla-mostrar/{success?}/{usuario?}', [TaquillaController::class, 'showForm'])->name('asignar.taquilla.mostrar');
    // madna al contorlador que ejecuta todo esto de asignar la  taquilla y despues el cotnrolador iimprime la vista otra vez con mensaje de exito
    Route::post('/asignar-taquilla-usuario', [TaquillaController::class, 'AsignarTaquilla'])->name('asignar.taquilla');
    Route::post('/asignar-taquilla-usuario/{user}/liberar', [TaquillaController::class, 'liberarTaquilla'])->name('asignar.taquilla.liberar');
    // muestro asignar taquilla con mensaje de exito;

    // GESTOR PEDIDOS
    Route::get('/gestor-pedidos', [PedidoController::class, 'index'])->name('gestor.pedidos');
    Route::get('/gestor/pedidos/filtrar', [PedidoController::class, 'applyFilter'])->name('gestor.pedidos.filtrar');
    // rutas de lso toiogles pagado y entregado
    Route::patch('/pedido/{id}/toggle-pagado', [PedidoController::class, 'togglePagado'])->name('pedido.togglePagado');
    Route::patch('/pedido/{id}/toggle-entregado', [PedidoController::class, 'toggleEntregado'])->name('pedido.toggleEntregado');

    // USUARIOS
    Route::get('/listaUsuarios', [TaquillaController::class, 'listaUsuarios'])->name('listaUsuarios');
    //

    // ADMINPANEL  DE TAQUILLAS Y PLANES
    // 1. Ruta principaPLANES TAQUILLASl: Muestra la lista de planes y el estado de lso usuarios si estana ctivo ....m uestra el panel de admin
    Route::get('/taquilla/admin/index', [PlanesTaquillasController::class, 'AdminIndex'])->name('taquilla.index.admin');
    Route::post('/taquilla/admin/planes', [PlanesTaquillasController::class, 'storePlan'])->name('taquilla.planes.store');
    Route::put('/taquilla/admin/planes/{plan}', [PlanesTaquillasController::class, 'updatePlan'])->name('taquilla.planes.update');
    Route::patch('/taquilla/admin/planes/{plan}/toggle-active', [PlanesTaquillasController::class, 'togglePlanActive'])->name('taquilla.planes.toggle-active');
    Route::get('/taquilla/admin/pagos/cola', [PlanesTaquillasController::class, 'colaPagos'])->name('taquilla.pagos.queue');
    Route::patch('/taquilla/admin/pagos/{pago}/reviewed', [PlanesTaquillasController::class, 'markPagoTaquillaReviewed'])->name('taquilla.pagos.reviewed');
    Route::patch('/taquilla/admin/pagos/{pago}/payment-state', [PlanesTaquillasController::class, 'updatePagoTaquillaPaymentState'])->name('taquilla.pagos.payment-state');
    Route::patch('/taquilla/admin/pagos/{pago}/checked-state', [PlanesTaquillasController::class, 'updatePagoTaquillaCheckedState'])->name('taquilla.pagos.checked-state');
    Route::post('/taquilla/admin/pagos/{pago}/confirmar', [PlanesTaquillasController::class, 'confirmarPagoTaquilla'])->name('taquilla.pagos.confirm');
    Route::post('/taquilla/admin/pagos/{pago}/rechazar', [PlanesTaquillasController::class, 'rechazarPagoTaquilla'])->name('taquilla.pagos.reject');
    Route::get('/taquilla/admin/pagos/{pago}/proof', [PlanesTaquillasController::class, 'showProof'])->name('taquilla.pagos.proof');
    Route::post('/taquilla/admin/usuarios/{user}/reasignar', [PlanesTaquillasController::class, 'reassignLocker'])->name('taquilla.users.reassign');
    Route::get('/taquilla/admin/usuarios/{user}/pagos', [PlanesTaquillasController::class, 'userPaymentHistory'])->name('taquilla.users.payments');
    // MSOTRAR NOMBRE Y CORRREO DEL USUARIO QUE CORREPSONDE AL CLCIAR EL OJO
    Route::get('/admin/usuarios/{id}/contacto', [PlanesTaquillasController::class, 'obtenerContactoUsuario'])->name('admin.usuario.contacto');

    // Surfboards y reservas (prefijo /admin)
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::resource('surfboards', AdminSurfboardController::class)->except(['show']);

        // Segunda Mano — gestión admin completa
        Route::resource('second-hand', AdminSecondHandBoardController::class)
            ->except(['show'])
            ->parameters(['second-hand' => 'secondHandBoard']);
        // Cambio de estado rápido (inline desde el listado admin)
        Route::patch('second-hand/{secondHandBoard}/status', [AdminSecondHandBoardController::class, 'updateStatus'])
            ->name('second-hand.update-status');

        Route::resource('auctions', AdminAuctionController::class)->except(['show']);
        Route::patch('auctions/{auction}/publish', [AdminAuctionController::class, 'publish'])->name('auctions.publish');
        Route::patch('auctions/{auction}/close', [AdminAuctionController::class, 'close'])->name('auctions.close');
        Route::patch('auctions/{auction}/cancel', [AdminAuctionController::class, 'cancel'])->name('auctions.cancel');

        Route::get('bookings', [AdminBookingController::class, 'index'])->name('bookings.index');
        Route::post('bookings', [AdminBookingController::class, 'store'])->name('bookings.store');
        Route::get('bookings/check-availability', [AdminBookingController::class, 'checkAvailability'])->name('bookings.check-availability');
        Route::post('bookings/mark-expired', [AdminBookingController::class, 'markExpired'])->name('bookings.mark-expired');
        Route::patch('bookings/{booking}/confirm-payment', [AdminBookingController::class, 'confirmPayment'])->name('bookings.confirm-payment');
        Route::patch('bookings/{booking}/cancel', [AdminBookingController::class, 'cancel'])->name('bookings.cancel');
        Route::post('bookings/{booking}/approve-proof', [AdminBookingController::class, 'approveProof'])->name('bookings.approve-proof');
        Route::post('bookings/{booking}/reject-proof', [AdminBookingController::class, 'rejectProof'])->name('bookings.reject-proof');
        Route::get('bookings/{booking}/proof', [AdminBookingController::class, 'showProof'])->name('bookings.proof');
        Route::get('chatbot', [\App\Http\Controllers\Admin\ChatbotInteractionController::class, 'index'])->name('chatbot.index');
        Route::patch('chatbot/{chatbotInteraction}/resolve', [\App\Http\Controllers\Admin\ChatbotInteractionController::class, 'resolve'])->name('chatbot.resolve');
        Route::get('check-manager', [\App\Http\Controllers\Admin\AcademyController::class, 'checkManager'])->name('check-manager');
        Route::get('payments/global-dashboard', [\App\Http\Controllers\Admin\AcademyController::class, 'globalPaymentsDashboard'])->name('payments.global');
        Route::get('payments/clients', [\App\Http\Controllers\Admin\ClientPaymentsController::class, 'index'])->name('payments.clients.index');
        Route::get('payments/clients/{user}/history', [\App\Http\Controllers\Admin\ClientPaymentsController::class, 'history'])->name('payments.clients.history');
        Route::patch('payments/reviewed', [\App\Http\Controllers\Admin\AcademyController::class, 'markPaymentReviewed'])->name('payments.reviewed');
        Route::patch('payments/refund-status', [\App\Http\Controllers\Admin\AcademyController::class, 'updateRefundStatus'])->name('payments.refund-status');
        Route::get('payment-validation', [PaymentValidationController::class, 'index'])->name('payment-validation.index');
        Route::post('payment-validation/{userBonoId}/confirm', [PaymentValidationController::class, 'confirm'])->name('payment-validation.confirm');
        Route::post('payment-validation/{userBonoId}/reject', [PaymentValidationController::class, 'reject'])->name('payment-validation.reject');
        Route::get('bonos', [AdminBonoController::class, 'index'])->name('bonos.index');
        Route::post('bonos', [AdminBonoController::class, 'store'])->name('bonos.store');
        Route::patch('bonos/{packBono}/toggle-active', [AdminBonoController::class, 'toggleActive'])->name('bonos.toggle-active');
        Route::post('bonos/assign-manual', [AdminBonoController::class, 'assignManual'])->name('bonos.assign-manual');
        Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
        Route::patch('users/{user}/toggle-vip', [AdminUserController::class, 'toggleVip'])->name('users.toggle-vip');
        Route::get('vips', [VipController::class, 'index'])->name('vips.index');
        Route::post('vips/attendance-notes', [VipController::class, 'storeNote'])->name('vips.attendance-notes.store');
        Route::get('vips/{user}/analisis', [VipController::class, 'analysis'])->name('vips.analysis');
        Route::get('vips/{user}/whatsapp', [VipController::class, 'whatsapp'])->name('vips.whatsapp');
        Route::get('class-manager', [ClassManagerController::class, 'index'])->name('class-manager.index');
        Route::post('class-manager/lessons/{lesson}/guest-enrollments', [\App\Http\Controllers\Admin\ClassManagerEnrollmentController::class, 'store'])->name('class-manager.guest-enrollments.store');
        Route::patch('class-manager/guest-enrollments/{enrollment}', [\App\Http\Controllers\Admin\ClassManagerEnrollmentController::class, 'update'])->name('class-manager.guest-enrollments.update');
        Route::delete('class-manager/guest-enrollments/{enrollment}', [\App\Http\Controllers\Admin\ClassManagerEnrollmentController::class, 'destroy'])->name('class-manager.guest-enrollments.destroy');
        Route::patch('class-manager/guest-enrollments/{enrollment}/payment', [\App\Http\Controllers\Admin\ClassManagerEnrollmentController::class, 'updatePayment'])->name('class-manager.guest-enrollments.payment');
        Route::post('class-manager/guest-enrollments/{enrollment}/approve-quota', [\App\Http\Controllers\Admin\ClassManagerEnrollmentController::class, 'approveQuota'])->name('class-manager.guest-enrollments.approve-quota');
        Route::post('class-manager/guest-enrollments/{enrollment}/deny-quota', [\App\Http\Controllers\Admin\ClassManagerEnrollmentController::class, 'denyQuota'])->name('class-manager.guest-enrollments.deny-quota');
        Route::patch('class-manager/lessons/{lesson}/booker', [\App\Http\Controllers\Admin\ClassManagerEnrollmentController::class, 'updateBooker'])->name('class-manager.lessons.booker');
        Route::get('vip-manager', fn () => redirect()->route('admin.class-manager.index'))->name('vip-manager.index');
        Route::get('vip-manager/check-availability', [VipClassManagerController::class, 'checkAvailability'])->name('vip-manager.check-availability');
        Route::post('vip-manager/lessons', [VipClassManagerController::class, 'store'])->name('vip-manager.lessons.store');
        Route::patch('vip-manager/lessons/{lesson}', [VipClassManagerController::class, 'update'])->name('vip-manager.lessons.update');
        Route::delete('vip-manager/lessons/{lesson}', [VipClassManagerController::class, 'destroy'])->name('vip-manager.lessons.destroy');
        Route::post('vip-manager/replicate-previous-week', [VipClassManagerController::class, 'replicatePreviousWeek'])->name('vip-manager.replicate-previous-week');
    });

    // Academia: Consola Comandante
    Route::prefix('admin/academy')->name('admin.academy.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AcademyController::class, 'index'])->name('index');
        Route::get('check-availability', [\App\Http\Controllers\Admin\AcademyController::class, 'checkAvailability'])->name('check-availability');
        Route::post('lessons', [\App\Http\Controllers\Admin\AcademyController::class, 'store'])->name('lessons.store');
        Route::put('lessons/{lesson}', [\App\Http\Controllers\Admin\AcademyController::class, 'update'])->name('lessons.update');
        Route::post('lessons/{lesson}/optimal-waves', [\App\Http\Controllers\Admin\AcademyController::class, 'toggleOptimalWaves'])->name('lessons.optimal-waves');
        Route::post('lessons/{lesson}/surf-trip', [\App\Http\Controllers\Admin\AcademyController::class, 'triggerSurfTrip'])->name('lessons.surf-trip');
        Route::post('lessons/{lesson}/cancel-mal-mar', [\App\Http\Controllers\Admin\AcademyController::class, 'cancelMalMar'])->name('lessons.cancel-mal-mar');
        Route::post('lessons/{lesson}/cancel', [\App\Http\Controllers\Admin\AcademyController::class, 'cancelLesson'])->name('lessons.cancel');
        Route::post('lessons/cancel-batch', [\App\Http\Controllers\Admin\AcademyController::class, 'cancelBatch'])->name('lessons.cancel-batch');
        Route::post('staff/assign', [\App\Http\Controllers\Admin\AcademyController::class, 'assignStaff'])->name('staff.assign');
        Route::post('enrollments/{enrollmentId}/confirm', [\App\Http\Controllers\Admin\AcademyController::class, 'confirmEnrollment'])->name('enrollments.confirm');
        Route::post('enrollments/{enrollmentId}/resend-confirmation', [\App\Http\Controllers\Admin\AcademyController::class, 'resendConfirmation'])->name('enrollments.resend-confirmation');
        Route::post('enrollments/{enrollmentId}/reject', [\App\Http\Controllers\Admin\AcademyController::class, 'rejectEnrollmentProof'])->name('enrollments.reject');
        Route::post('enrollments/{enrollmentId}/reactivate', [\App\Http\Controllers\Admin\AcademyController::class, 'reactivateEnrollment'])->name('enrollments.reactivate');
        Route::get('enrollments/{enrollmentId}/proof', [\App\Http\Controllers\Admin\AcademyController::class, 'showProof'])->name('enrollments.proof');
        Route::get('lessons/{lesson}/details', [\App\Http\Controllers\Admin\AcademyController::class, 'lessonDetails'])->name('lessons.details');
        Route::post('enrollments/bulk-delete-stale', [\App\Http\Controllers\Admin\AcademyController::class, 'bulkDeleteStale'])->name('enrollments.bulk-delete-stale');
    });
});

// Llave de emergencia — panel admin (auth + email verificado + rol admin)
Route::middleware(['auth', 'verified', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('emergency-keys', [AdminEmergencyKeyController::class, 'index'])->name('emergency-keys.index');
        Route::post('emergency-keys/lock-code', [AdminEmergencyKeyController::class, 'updateCode'])->name('emergency-keys.update-code');
        Route::patch('emergency-keys/requests/{emergencyKeyRequest}/deactivate', [AdminEmergencyKeyController::class, 'markKeyDeactivated'])
            ->name('emergency-keys.mark-deactivated');
        Route::patch('emergency-keys/requests/{emergencyKeyRequest}/resolve', [AdminEmergencyKeyController::class, 'resolveKeyRequest'])
            ->name('emergency-keys.resolve');
    });

// Rutas de pedidos

require __DIR__.'/auth.php';
