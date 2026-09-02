import { Head, Link } from "@inertiajs/react";
import VipProfileDashboard from "@/components/VipProfile/VipProfileDashboard";
import S4Button from "@/components/S4Button";

export default function MyProfile({ performanceData = null, isVip = false }) {
    return (
        <>
            <Head title="Mi Perfil" />
            <div className="s4-surface-light min-h-screen">
                <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
                    <div className="space-y-1">
                        <h1 className="font-heading text-2xl font-bold text-slate-900">Mi Perfil</h1>
                        <p className="max-w-3xl text-sm text-slate-600">
                            Tu evolución como alumno: saldo VIP, calendario de asistencia, estadísticas
                            e historial de consumo de créditos. Para reservar clases o alquileres, ve a{" "}
                            <Link
                                href={route("my-reservations.index")}
                                className="font-medium text-s4 hover:text-s4-hover"
                            >
                                Mis Reservas
                            </Link>
                            .
                        </p>
                    </div>

                    {!isVip ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                            <p className="text-sm font-medium text-amber-900">
                                El panel VIP (créditos y asistencia) está disponible para miembros VIP.
                            </p>
                            <S4Button
                                href={route("bonos.index")}
                                variant="accent"
                                className="mt-4 bg-amber-500 font-semibold text-slate-900 hover:bg-amber-400"
                            >
                                Ver bonos y activar VIP
                            </S4Button>
                        </div>
                    ) : (
                        <VipProfileDashboard
                            performanceData={performanceData}
                            profileRouteName="my-profile.index"
                        />
                    )}

                    {isVip ? (
                        <div className="flex flex-wrap justify-center gap-3 pt-2">
                            <S4Button
                                href={route("bonos.index")}
                                variant="secondary"
                                className="border-teal-200 bg-teal-50 font-semibold text-teal-800 hover:bg-teal-100"
                            >
                                Recargar créditos
                            </S4Button>
                            <S4Button
                                href={route("academy.lessons.index")}
                                variant="secondary"
                                className="border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Reservar clase
                            </S4Button>
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
}
