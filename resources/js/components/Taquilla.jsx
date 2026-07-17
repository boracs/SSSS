import React, { useState, useEffect } from "react";
// ESTA ES LA IMPORTACIÓN REAL QUE DEBES USAR EN TU PROYECTO LARAVEL/INERTIA:
import { Head, Link, usePage, useForm } from "@inertiajs/react";
import {
    Key,
    Calendar,
    CheckCircle,
    XCircle,
    Tag,
    Warehouse,
    ChevronLeft,
    AlertTriangle,
    Loader2,
} from "lucide-react";

// ===============================================
// Componente de Mensajes Flash
// ===============================================
const FlashMessages = ({ flash }) => {
    return (
        <div className="mb-6">
            {flash.success && (
                <div
                    className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg"
                    role="alert"
                >
                    <p className="font-bold">Éxito</p>
                    <p>{flash.success}</p>
                </div>
            )}
            {flash.error && (
                <div
                    className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg"
                    role="alert"
                >
                    <p className="font-bold">Error</p>
                    <p>{flash.error}</p>
                </div>
            )}
            {flash.warning && (
                <div
                    className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg"
                    role="alert"
                >
                    <p className="font-bold">Advertencia</p>
                    <p>{flash.warning}</p>
                </div>
            )}
        </div>
    );
};

// ===============================================
// Sub-Vista 1: Lista de Planes (TaquillaIndex)
// ===============================================
const TaquillaIndex = ({ planes, user, estadoCuota, flash }) => {
    // Función para obtener el Plan Vigente del array de planes (usado si el user no trae la relación completa)
    const currentPlan = planes.find((p) => p.id === user.id_plan_vigente);
    const planVigenteNombre = currentPlan
        ? currentPlan.nombre
        : user.plan_vigente?.nombre || "N/A";
    const planVigenteDescuento = currentPlan
        ? currentPlan.porcentaje_descuento
        : user.plan_vigente?.porcentaje_descuento || "N/A";

    return (
        <div className="container mx-auto p-4 sm:p-8">
            <Head title="Gestión de Taquilla" />

            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b-4 border-indigo-600 pb-2">
                Sistema de Taquilla y Cuotas
            </h1>

            <FlashMessages flash={flash} />

            {/* Sección de Estado de la Cuota */}
            <div
                className={`bg-white shadow-xl rounded-2xl p-6 mb-8 border-l-8 ${
                    estadoCuota.esVigente
                        ? "border-green-500"
                        : "border-red-500"
                }`}
            >
                <h2 className="text-2xl font-semibold mb-3 text-gray-800 flex items-center">
                    {user.numeroTaquilla ? (
                        <Key className="text-indigo-500 mr-3 w-6 h-6" />
                    ) : (
                        <XCircle className="text-red-500 mr-3 w-6 h-6" />
                    )}
                    Mi Taquilla:
                    <span className="text-indigo-600 ml-2">
                        {user.numeroTaquilla || "Sin Asignar"}
                    </span>
                </h2>

                <p className="text-lg text-gray-600 mb-4">
                    {estadoCuota.esVigente ? (
                        <>
                            <CheckCircle className="inline w-5 h-5 text-green-500 mr-2" />
                            Tu cuota actual está **VIGENTE**. Tienes un plan **
                            {planVigenteNombre}**.
                            <br />
                            Vence el **{estadoCuota.venceEn}** (
                            {estadoCuota.daysRemaining} días restantes).
                            <p className="mt-2 text-sm text-green-700 font-medium">
                                ¡Disfrutas de un {planVigenteDescuento}% de
                                descuento en todos tus pedidos!
                            </p>
                        </>
                    ) : (
                        <>
                            <XCircle className="inline w-5 h-5 text-red-500 mr-2" />
                            {user.fecha_vencimiento_cuota
                                ? `Tu cuota ha VENCIDO el ${estadoCuota.venceEn}. Por favor, renuévala para mantener los beneficios.`
                                : "No tienes una cuota activa. ¡Selecciona un plan a continuación para obtener tu Taquilla y beneficios!"}
                        </>
                    )}
                </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Planes de Cuota Disponibles
            </h2>

            {/* Grid de Planes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {planes.map((plan) => (
                    <div
                        key={plan.id}
                        className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                    >
                        {/* Header del Plan */}
                        <div
                            className={`p-6 ${
                                plan.duracion_dias === 90
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                            }`}
                        >
                            <h3 className="text-2xl font-extrabold">
                                {plan.nombre}
                            </h3>
                            <p
                                className={`mt-1 text-sm ${
                                    plan.duracion_dias === 90
                                        ? "text-indigo-200"
                                        : "text-gray-500"
                                }`}
                            >
                                {plan.duracion_dias} días de acceso
                            </p>
                        </div>

                        {/* Cuerpo del Plan */}
                        <div className="p-6">
                            <div className="text-4xl font-bold text-gray-900 mb-4">
                                ${plan.precio_total.toFixed(2)}
                                <span className="text-lg font-normal text-gray-500">
                                    /{" "}
                                    {plan.duracion_dias === 30
                                        ? "Mes"
                                        : "Trimestre"}
                                </span>
                            </div>

                            <p className="text-gray-600 mb-4">
                                {plan.descripcion}
                            </p>

                            <ul className="space-y-3 text-gray-700">
                                <li className="flex items-center">
                                    <Tag className="text-green-500 mr-3 w-5 h-5" />
                                    <span>
                                        **{plan.porcentaje_descuento}% de
                                        Descuento** en todos tus pedidos.
                                    </span>
                                </li>
                                <li className="flex items-center">
                                    <Warehouse className="text-indigo-500 mr-3 w-5 h-5" />
                                    <span>
                                        Asignación de Taquilla Personal.
                                    </span>
                                </li>
                                <li className="flex items-center">
                                    <Calendar className="text-indigo-500 mr-3 w-5 h-5" />
                                    <span>
                                        Sin permanencia (renovación opcional).
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {/* Footer/Acción del Plan */}
                        <div className="p-6 border-t border-gray-100">
                            {/* Usa Link de Inertia para navegar */}
                            <Link
                                href={route("taquilla.comprar", plan.id)}
                                className={`w-full block text-center py-3 px-4 rounded-xl font-bold transition-colors duration-300 ${
                                    plan.duracion_dias === 90
                                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                        : "bg-green-500 text-white hover:bg-green-600"
                                }`}
                            >
                                {estadoCuota.esVigente
                                    ? "Renovar / Ampliar"
                                    : "Comprar Cuota Ahora"}
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ===============================================
// Sub-Vista 2: Confirmación de Compra (TaquillaConfirmacion)
// ===============================================
const TaquillaConfirmacion = ({ plan, user, estadoCuota, flash }) => {
    // useForm de Inertia para manejar el POST
    const { data, setData, post, processing, errors } = useForm({
        referencia_pago_externa: "",
        metodo_pago: "datafono",
    });

    const submit = (e) => {
        e.preventDefault();
        // Llama al método post de Inertia para enviar a la ruta del controlador
        post(route("taquilla.pagar", plan.id));
    };

    return (
        <div className="container mx-auto p-4 sm:p-8 max-w-lg">
            <Head title="Confirmar Compra" />

            <div className="bg-white shadow-xl rounded-2xl p-8">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
                    Confirmar Compra
                </h1>
                <p className="text-gray-600 mb-6">
                    Estás a punto de adquirir o renovar la siguiente cuota:
                </p>

                <FlashMessages flash={flash} />

                {/* Detalles del Plan */}
                <div className="border border-gray-200 rounded-xl p-4 mb-6">
                    <h2 className="text-2xl font-bold text-indigo-700 mb-2">
                        {plan.nombre}
                    </h2>
                    <ul className="space-y-2 text-gray-700">
                        <li className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="font-medium">Precio Total:</span>
                            <span className="font-bold text-lg">
                                ${plan.precio_total.toFixed(2)}
                            </span>
                        </li>
                        <li className="flex justify-between border-b border-gray-100 pb-1">
                            <span className="font-medium">Duración:</span>
                            <span>{plan.duracion_dias} días</span>
                        </li>
                        <li className="flex justify-between">
                            <span className="font-medium">Beneficio:</span>
                            <span className="text-green-600 font-semibold">
                                {plan.porcentaje_descuento}% de descuento
                            </span>
                        </li>
                    </ul>
                </div>

                {/* Resumen del Estado Actual del Usuario */}
                <div
                    className={`p-4 rounded-lg mb-6 text-sm ${
                        estadoCuota.esVigente
                            ? "bg-yellow-50 border-yellow-500 text-yellow-700"
                            : "bg-red-50 border-red-500 text-red-700"
                    }`}
                >
                    <AlertTriangle className="inline w-4 h-4 mr-2" />
                    <span className="font-semibold">Estado de la Cuota:</span>

                    {estadoCuota.esVigente ? (
                        <>
                            <p className="mt-1">
                                Tu cuota actual vence el **{estadoCuota.venceEn}
                                **.
                            </p>
                            <p className="font-semibold">
                                El nuevo periodo de {plan.duracion_dias} días se
                                **sumará** a esta fecha.
                            </p>
                        </>
                    ) : (
                        <p className="mt-1">
                            Tu cuota está vencida o no existe. El nuevo periodo
                            comienza **hoy**.
                        </p>
                    )}
                </div>

                {/* Formulario de Simulación de Pago (ADMIN) */}
                <form onSubmit={submit}>
                    <div className="mb-6">
                        <label
                            htmlFor="referencia_pago"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Referencia del Datáfono / TPV (CRUCIAL para
                            auditoría)
                        </label>
                        <input
                            id="referencia_pago"
                            name="referencia_pago_externa"
                            value={data.referencia_pago_externa}
                            onChange={(e) =>
                                setData(
                                    "referencia_pago_externa",
                                    e.target.value
                                )
                            }
                            type="text"
                            placeholder="Ej: A123456789 (Número de recibo)"
                            className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                            required
                        />
                        {errors.referencia_pago_externa && (
                            <div className="text-red-500 text-sm mt-1">
                                {errors.referencia_pago_externa}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col space-y-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className={`w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-lg font-medium text-white 
                            ${
                                processing
                                    ? "bg-gray-400"
                                    : "bg-green-600 hover:bg-green-700"
                            } transition-colors duration-200 flex items-center justify-center`}
                        >
                            {processing ? (
                                <>
                                    <span className="animate-spin mr-2">
                                        <Loader2 className="w-5 h-5" />
                                    </span>
                                    Procesando Pago...
                                </>
                            ) : (
                                `Confirmar Pago de $${plan.precio_total.toFixed(
                                    2
                                )}`
                            )}
                        </button>

                        <Link
                            href={route("taquilla.index")}
                            disabled={processing}
                            className="w-full text-center py-3 px-4 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
                        >
                            <ChevronLeft className="w-5 h-5 mr-2" />
                            Volver a Planes
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ===============================================
// Componente Padre: TaquillaApp
// ===============================================
export default function TaquillaApp(props) {
    // Las props llegan del controlador Inertia (index o comprarCuota)
    const { view, planes, user, estadoCuota, plan, flash } = props;

    // Aquí decides qué componente renderizar según la prop 'view' enviada por el controlador
    const renderComponent = () => {
        switch (view) {
            case "Confirmacion":
                return (
                    <TaquillaConfirmacion
                        plan={plan}
                        user={user}
                        estadoCuota={estadoCuota}
                        flash={flash}
                    />
                );
            case "Index":
            default:
                return (
                    <TaquillaIndex
                        planes={planes}
                        user={user}
                        estadoCuota={estadoCuota}
                        flash={flash}
                    />
                );
        }
    };

    // Usamos un layout simple de centrado
    return (
        <div className="min-h-screen bg-gray-100 py-10">
            {renderComponent()}
        </div>
    );
}
