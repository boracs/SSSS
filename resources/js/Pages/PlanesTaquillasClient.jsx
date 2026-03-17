import { useState, useEffect } from "react";
import Layout1 from "@/layouts/Layout1";

// Eliminada la importación de Layout1 para resolver el error de compilación.

export default function PlanesTaquillasClient({
    planes,
    userData: initialUserData, // Prop inicial
}) {
    const [localUserData, setLocalUserData] = useState({
        nombre_completo: initialUserData?.nombre_completo || "",
        numero_taquilla: initialUserData?.numero_taquilla || "",
        vencimiento_cuota: initialUserData?.vencimiento_cuota || null,
        dias_restantes: initialUserData?.dias_restantes || 0,
        plan_vigente: initialUserData?.plan_vigente || null,
        historial_pagos: initialUserData?.historial_pagos || [],
        ultimo_plan_fin: initialUserData?.ultimo_plan_fin || null,
    });

    const [planSeleccionado, setPlanSeleccionado] = useState("");
    const [referencia, setReferencia] = useState("");
    const [loading, setLoading] = useState(false);
    const [alerta, setAlerta] = useState(null);
    const [confirmacion, setConfirmacion] = useState(null);
    const [historial, setHistorial] = useState(localUserData.historial_pagos);

    // Mantener historial sincronizado con localUserData
    useEffect(() => {
        setHistorial(localUserData.historial_pagos || []);
    }, [localUserData]);

    // Alerta temporal
    useEffect(() => {
        if (alerta) {
            const timer = setTimeout(() => setAlerta(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [alerta]);

    // Cargar datos del usuario al montar
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch("/taquilla/usuario-datos", {
                    method: "GET",
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error(
                        `Error al cargar datos del usuario: ${response.status}`
                    );
                }

                const data = await response.json();

                if (data.success) {
                    setLocalUserData((prev) => ({
                        ...prev,
                        // No tocamos nombre_completo ni numero_taquilla
                        dias_restantes:
                            data.plan_vigente?.dias_restantes ??
                            prev.dias_restantes,
                        plan_vigente: data.plan_vigente ?? prev.plan_vigente,
                        historial_pagos: data.historial ?? prev.historial_pagos,
                        vencimiento_cuota:
                            data.vencimiento_actualizado ??
                            prev.vencimiento_cuota,
                    }));
                } else {
                    throw new Error(
                        data.message ||
                            "No se pudieron cargar los datos del usuario"
                    );
                }
            } catch (err) {
                console.error(err);
                setAlerta({
                    tipo: "error",
                    mensaje: "No se pudieron cargar los datos.",
                });
            }
        };
        fetchUserData();
    }, []); // Solo al montar

    // Desestructuración para render
    const {
        nombre_completo,
        numero_taquilla,
        vencimiento_cuota,
        dias_restantes,
        plan_vigente,
    } = localUserData;

    // FORMATEAR FECHA
    const formatearFecha = (fecha) => {
        if (!fecha) return "-";
        let dateString = fecha;
        if (
            typeof fecha === "string" &&
            dateString.match(/^\d{4}-\d{2}-\d{2}$/)
        ) {
            dateString = fecha + "T00:00:00";
        }
        return new Date(dateString).toLocaleDateString("es-ES");
    };

    // --- FIN FUNCIÓN DE FORMATO CORREGIDA ---

    const mostrarPlanVigente = () => {
        const plan = localUserData.plan_vigente;
        if (!plan) return <p className="text-red-500">Plan vencido</p>;

        return (
            <div>
                <p>Plan: {plan.nombre}</p>
                <p>Precio: {plan.precio} €</p>
                <p>Días restantes: {plan.dias_restantes}</p>
                <p>Fin del periodo: {formatearFecha(plan.fecha_fin)}</p>
            </div>
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!planSeleccionado || !referencia) {
            setAlerta({
                tipo: "error",
                mensaje: "Selecciona un plan y escribe la referencia del pago.",
            });
            return;
        }

        // Validación simple: plan_id debe ser numérico
        if (Number.isNaN(Number(planSeleccionado))) {
            setAlerta({
                tipo: "error",
                mensaje: "El plan seleccionado no es válido.",
            });
            return;
        }

        // Validación simple: referencia con formato numérico (evita basura/typos)
        // Ajusta el patrón si tu referencia bancaria admite letras.
        if (!/^\d{4,}$/.test(referencia.trim())) {
            setAlerta({
                tipo: "error",
                mensaje:
                    "La referencia debe ser numérica y tener al menos 4 dígitos.",
            });
            return;
        }

        const plan = planes.find((p) => p.id == planSeleccionado);
        if (!plan) return;

        // Calcular la fecha de inicio. Esta lógica es solo para el modal de confirmación
        let fechaInicio;
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalizar a medianoche local (hoy)
        if (localUserData.ultimo_plan_fin) {
            // --- INICIO DE LA CORRECCIÓN DE LA FECHA DE FIN PARA CÁLCULO ---
            //
            let ultimoFinDateString = localUserData.ultimo_plan_fin;

            // Si el valor es una cadena YYYY-MM-DD (sin hora), añadimos T00:00:00
            // para que JavaScript la interprete como fecha LOCAL a medianoche,
            // evitando el desfase de zona horaria (UTC) en el cálculo.
            if (
                typeof ultimoFinDateString === "string" &&
                ultimoFinDateString.match(/^\d{4}-\d{2}-\d{2}$/)
            ) {
                ultimoFinDateString += "T00:00:00";
            }

            const ultimoFin = new Date(ultimoFinDateString);
            ultimoFin.setHours(0, 0, 0, 0); // Garantizar la hora local 00:00:00 para la comparación
            // --- FIN DE LA CORRECCIÓN DE LA FECHA DE FIN PARA CÁLCULO ---

            if (ultimoFin.getTime() > now.getTime()) {
                // Si la fecha de vencimiento es futura, el nuevo plan comienza el día siguiente
                fechaInicio = new Date(ultimoFin);
                fechaInicio.setDate(fechaInicio.getDate() + 1);
            } else {
                // Si ya venció o vence hoy, comienza hoy
                fechaInicio = now;
            }
        } else {
            // Es el primer pago, comienza hoy
            fechaInicio = now;
        }

        const fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaFin.getDate() + plan.duracion_dias - 1); // -1 para que la duración sea N días completos

        setConfirmacion({
            plan,
            fechaInicio: formatearFecha(fechaInicio),
            fechaFin: formatearFecha(fechaFin),
        });
    };

    const confirmarPago = async () => {
        if (!confirmacion) return;
        setLoading(true);

        try {
            let response;
            let data = {};
            const maxRetries = 3;
            let retryDelay = 1000;
            let success = false;

            // Lógica de reintentos
            for (let i = 0; i < maxRetries; i++) {
                try {
                    response = await fetch("/taquilla/registrar-pago", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN":
                                document
                                    .querySelector('meta[name="csrf-token"]')
                                    ?.getAttribute("content") || "",
                        },
                        body: JSON.stringify({
                            plan_id: confirmacion.plan.id,
                            referencia_pago_externa: referencia,
                        }),
                        credentials: "include",
                    });

                    if (response.ok) {
                        data = await response.json();
                        success = true;
                        break;
                    } else if ([429, 503].includes(response.status)) {
                        if (i < maxRetries - 1) {
                            await new Promise((res) =>
                                setTimeout(res, retryDelay)
                            );
                            retryDelay *= 2;
                        } else {
                            throw new Error(
                                "Máximo de reintentos alcanzado. El servidor no responde."
                            );
                        }
                    } else {
                        throw new Error(
                            `Error del servidor: ${response.status}`
                        );
                    }
                } catch (fetchError) {
                    if (
                        i < maxRetries - 1 &&
                        fetchError.message.includes("Failed to fetch")
                    ) {
                        await new Promise((res) => setTimeout(res, retryDelay));
                        retryDelay *= 2;
                    } else {
                        throw fetchError;
                    }
                }
            }

            if (success && data.success) {
                // --- ACTUALIZAR ESTADO COMPLETO ---
                setLocalUserData((prev) => ({
                    ...prev,
                    nombre_completo:
                        data.nombre_completo ?? prev.nombre_completo,
                    numero_taquilla:
                        data.numero_taquilla ?? prev.numero_taquilla,
                    vencimiento_cuota:
                        data.vencimiento_actualizado ?? prev.vencimiento_cuota,
                    plan_vigente: data.plan_vigente
                        ? { ...data.plan_vigente }
                        : prev.plan_vigente,
                    dias_restantes:
                        data.dias_restantes ??
                        data.plan_vigente?.dias_restantes ??
                        prev.dias_restantes,
                    ultimo_plan_fin:
                        data.ultimo_plan_fin ?? prev.ultimo_plan_fin,
                    historial_pagos: data.historial ?? [
                        data.pago,
                        ...(prev.historial_pagos || []),
                    ],
                }));

                // Actualiza el historial reactivo para el renderizado de la tabla
                setHistorial(
                    data.historial ?? [data.pago, ...(historial || [])]
                );

                // Mensaje y limpieza
                setAlerta({
                    tipo: "success",
                    mensaje: "Pago registrado correctamente",
                });
                setReferencia("");
                setPlanSeleccionado("");
                setConfirmacion(null);
            } else {
                setAlerta({
                    tipo: "error",
                    mensaje:
                        data.message ||
                        "No se pudo registrar el pago. Verifica la referencia.",
                });
            }
        } catch (error) {
            console.error(error);
            setAlerta({
                tipo: "error",
                mensaje:
                    "Error al registrar el pago. Inténtalo de nuevo. " +
                    error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const getAlertaStyles = (tipo) => {
        switch (tipo) {
            case "success":
                return "bg-green-600/20 text-green-400 border border-green-600/40";
            case "warning":
                return "bg-yellow-600/20 text-yellow-400 border border-yellow-600/40";
            case "error":
                return "bg-red-600/20 text-red-400 border border-red-600/40";
            default:
                return "";
        }
    };

    const diasRestantesPlan = plan_vigente?.dias_restantes ?? dias_restantes;

    return (
        // Reemplazo de <Layout1> por un <div> para asegurar la compilación
        <Layout1>
            <div className="min-h-screen w-full bg-gray-900 text-gray-100 py-10 px-6 font-sans">
                <div className="max-w-5xl mx-auto space-y-10">
                    {/* Título */}
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-8 pt-4 text-center bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        Gestión de Taquilla
                    </h1>

                    {/* Información del Usuario/Taquilla */}
                    <section className="bg-gray-800/70 p-6 rounded-2xl shadow-xl space-y-3 border border-blue-500/20">
                        <h2 className="text-2xl font-semibold text-blue-300 border-b border-gray-700 pb-2">
                            Estado de Cuenta del Cliente
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm sm:text-base">
                            <p>
                                <span className="font-semibold text-gray-300">
                                    Cliente:
                                </span>{" "}
                                {nombre_completo}
                            </p>
                            <p>
                                <span className="font-semibold text-gray-300">
                                    Nº Taquilla:
                                </span>{" "}
                                <span className="text-yellow-400 font-bold">
                                    {numero_taquilla}
                                </span>
                            </p>
                            <p>
                                <span className="font-semibold text-gray-300">
                                    Vencimiento Cuota:
                                </span>{" "}
                                <span className="text-pink-400 font-bold">
                                    {formatearFecha(vencimiento_cuota)}
                                </span>
                            </p>
                            <p>
                                <span className="font-semibold text-gray-300">
                                    Días Restantes:
                                </span>{" "}
                                <span
                                    className={`font-bold ${
                                        dias_restantes < 0
                                            ? "text-red-500 animate-pulse"
                                            : dias_restantes < 7
                                            ? "text-yellow-400"
                                            : "text-green-500"
                                    }`}
                                >
                                    {dias_restantes > 0
                                        ? dias_restantes
                                        : dias_restantes < 0
                                        ? `Vencido hace ${Math.abs(
                                              dias_restantes
                                          )} días`
                                        : 0}
                                </span>
                            </p>

                            <p className="sm:col-span-2">
                                <span className="font-semibold text-gray-300">
                                    Plan Vigente:
                                </span>{" "}
                                <span className="text-purple-300">
                                    {plan_vigente?.nombre ||
                                        "Ninguno / Vencido"}
                                </span>
                            </p>
                        </div>
                    </section>

                    {/* Alerta */}
                    {alerta && (
                        <div
                            className={`p-4 rounded-xl font-semibold text-center transition duration-500 ${getAlertaStyles(
                                alerta.tipo
                            )}`}
                        >
                            {alerta.mensaje}
                        </div>
                    )}

                    {/* Formulario */}
                    <section className="bg-gray-800/70 p-6 rounded-2xl shadow-xl space-y-6">
                        <h2 className="text-2xl font-semibold text-blue-300">
                            Registrar Pago / Escoger Plan
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <select
                                value={planSeleccionado}
                                onChange={(e) =>
                                    setPlanSeleccionado(e.target.value)
                                }
                                className="bg-gray-900 border border-gray-700 p-3 w-full rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            >
                                <option value="">
                                    -- Selecciona un plan --
                                </option>
                                {planes.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.nombre} — {plan.precio_total} € —{" "}
                                        {plan.duracion_dias} días
                                    </option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="Referencia de pago del banco (Ej: TRX12345)"
                                value={referencia}
                                onChange={(e) => setReferencia(e.target.value)}
                                className="bg-gray-900 border border-gray-700 p-3 w-full rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 transition-colors px-6 py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/50 disabled:opacity-50 w-full flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg
                                            className="animate-spin h-5 w-5 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Cargando...
                                    </>
                                ) : (
                                    "Continuar y Confirmar Pago"
                                )}
                            </button>
                        </form>
                    </section>

                    {/* Modal confirmación */}
                    {confirmacion && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center space-y-5 border-2 border-green-500/50 transform transition-all duration-300 scale-100">
                                <h3 className="text-2xl font-bold text-green-400 mb-3">
                                    Confirmar Registro de Pago
                                </h3>
                                <div className="text-left space-y-3">
                                    <p className="border-b border-gray-700 pb-1">
                                        <span className="font-semibold text-gray-300 w-32 inline-block">
                                            Plan:
                                        </span>{" "}
                                        {confirmacion.plan.nombre}
                                    </p>
                                    <p className="border-b border-gray-700 pb-1">
                                        <span className="font-semibold text-gray-300 w-32 inline-block">
                                            Referencia:
                                        </span>{" "}
                                        <span className="text-yellow-300">
                                            {referencia}
                                        </span>
                                    </p>
                                    <p className="border-b border-gray-700 pb-1">
                                        <span className="font-semibold text-gray-300 w-32 inline-block">
                                            Inicio:
                                        </span>{" "}
                                        {confirmacion.fechaInicio}
                                    </p>
                                    <p className="border-b border-gray-700 pb-1">
                                        <span className="font-semibold text-gray-300 w-32 inline-block">
                                            Fin estimado:
                                        </span>{" "}
                                        {confirmacion.fechaFin}
                                    </p>
                                    <p className="text-lg pt-2 bg-gray-700/50 p-2 rounded-lg">
                                        <span className="font-extrabold text-white w-32 inline-block">
                                            Total:
                                        </span>{" "}
                                        <span className="text-2xl text-green-500 font-extrabold">
                                            {confirmacion.plan.precio_total} €
                                        </span>
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                                    <button
                                        onClick={confirmarPago}
                                        disabled={loading}
                                        className="flex-1 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold text-white transition disabled:opacity-50 shadow-md shadow-green-500/50"
                                    >
                                        {loading
                                            ? "Registrando..."
                                            : "Confirmar Pago"}
                                    </button>
                                    <button
                                        onClick={() => setConfirmacion(null)}
                                        className="flex-1 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl font-semibold text-white transition shadow-md"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Historial */}
                    <section className="bg-gray-800/60 p-6 rounded-2xl shadow-xl border border-purple-500/20">
                        <h2 className="text-2xl font-semibold text-purple-300 mb-4 border-b border-gray-700 pb-2">
                            Historial de Pagos
                        </h2>
                        {historial.length > 0 ? (
                            <div className="rounded-lg">
                                <table className="min-w-full border-collapse text-left">
                                    <thead>
                                        <tr className="bg-gray-700/70 text-gray-400 text-sm uppercase">
                                            <th className="py-3 px-4">Plan</th>
                                            <th className="py-3 px-4">
                                                Referencia
                                            </th>
                                            <th className="py-3 px-4">Monto</th>
                                            <th className="py-3 px-4">
                                                Inicio
                                            </th>
                                            <th className="py-3 px-4">Fin</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.map((pago, id) => (
                                            <tr
                                                key={id}
                                                className="border-b border-gray-800 hover:bg-gray-700/40 transition text-sm"
                                            >
                                                <td className="py-3 px-4">
                                                    {pago.plan?.nombre || "-"}
                                                </td>
                                                <td className="py-3 px-4 text-gray-400">
                                                    {
                                                        pago.referencia_pago_externa
                                                    }
                                                </td>
                                                <td className="py-3 px-4 text-green-400 font-semibold">
                                                    {pago.monto_pagado} €
                                                </td>
                                                <td className="py-3 px-4">
                                                    {formatearFecha(
                                                        pago.periodo_inicio
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {formatearFecha(
                                                        pago.periodo_fin
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-4 italic">
                                No hay pagos registrados aún.
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </Layout1>
    );
}
