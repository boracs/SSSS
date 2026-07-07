export const PAYMENT_STATUS_LABELS = {
    pending: "Pendiente",
    confirmed: "Pagado",
    rejected: "Rechazado",
};

export function paymentBadgeClass(status) {
    if (status === "confirmed") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
    if (status === "rejected") return "bg-rose-500/15 text-rose-200 border-rose-500/30";
    return "bg-amber-500/15 text-amber-200 border-amber-500/30";
}

export const emptyGuestForm = () => ({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    payment_status: "pending",
});

export function guestFormFromEnrollment(enrollment) {
    if (!enrollment) return emptyGuestForm();
    return {
        first_name: enrollment.first_name || "",
        last_name: enrollment.last_name || "",
        phone: enrollment.phone || "",
        email: enrollment.email || "",
        payment_status: enrollment.payment_status || "pending",
    };
}
