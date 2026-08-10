import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import DeleteUserForm from "./Partials/DeleteUserForm";
import UpdatePasswordForm from "./Partials/UpdatePasswordForm";
import UpdateProfileInformationForm from "./Partials/UpdateProfileInformationForm";

function initialsOf(user) {
    const first = String(user?.nombre || "").trim().charAt(0);
    const last = String(user?.apellido || "").trim().charAt(0);
    const initials = (first + last).toUpperCase();
    return initials || String(user?.email || "?").trim().charAt(0).toUpperCase();
}

function fullName(user) {
    return [user?.nombre, user?.apellido].filter(Boolean).join(" ").trim();
}

export default function Edit({ mustVerifyEmail, status }) {
    const user = usePage().props.auth.user;

    return (
        <>
            <Head title="Mi perfil" />

            <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
                <div className="mx-auto w-full max-w-3xl space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                                {initialsOf(user)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                    Mi perfil
                                </h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Actualiza tu información personal y mantén tu cuenta segura.
                                </p>
                                {fullName(user) ? (
                                    <p className="mt-1.5 text-sm font-semibold text-slate-800">
                                        {fullName(user)}
                                    </p>
                                ) : null}
                                {user?.email ? (
                                    <p className="text-xs text-slate-500">
                                        {user.email}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <Link
                            href={route("my-profile.index", undefined, false)}
                            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver atrás
                        </Link>
                    </div>

                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />

                    <UpdatePasswordForm />

                    <DeleteUserForm />
                </div>
            </div>
        </>
    );
}
