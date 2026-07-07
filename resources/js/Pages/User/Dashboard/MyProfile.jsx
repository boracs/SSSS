import { Head, Link } from "@inertiajs/react";
import VipProfileDashboard from "@/components/VipProfile/VipProfileDashboard";

export default function MyProfile({ performanceData = null, isVip = false }) {
    return (
        <>
            <Head title="Mi Perfil" />
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2233] to-slate-950">
                <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
                        <p className="max-w-3xl text-sm text-slate-400">
                            Tu evolución como alumno: saldo VIP, calendario de asistencia, estadísticas
                            e historial de consumo de créditos. Para reservar clases o alquileres, ve a{" "}
                            <Link
                                href={route("my-reservations.index")}
                                className="font-medium text-cyan-400 hover:text-cyan-300"
                            >
                                Mis Reservas
                            </Link>
                            .
                        </p>
                    </div>

                    {!isVip ? (
                        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-6 text-center">
                            <p className="text-sm font-medium text-amber-100">
                                El panel VIP (créditos y asistencia) está disponible para miembros VIP.
                            </p>
                            <Link
                                href={route("bonos.index")}
                                className="mt-4 inline-flex rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400"
                            >
                                Ver bonos y activar VIP
                            </Link>
                        </div>
                    ) : (
                        <VipProfileDashboard
                            performanceData={performanceData}
                            profileRouteName="my-profile.index"
                        />
                    )}

                    {isVip ? (
                        <div className="flex flex-wrap justify-center gap-3 pt-2">
                            <Link
                                href={route("bonos.index")}
                                className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-200 hover:bg-teal-500/20"
                            >
                                Recargar créditos
                            </Link>
                            <Link
                                href={route("academy.lessons.index")}
                                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                            >
                                Reservar clase
                            </Link>
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}
