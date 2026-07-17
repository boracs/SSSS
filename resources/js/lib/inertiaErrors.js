/**
 * Convierte el objeto errors de Inertia en mensajes legibles para toasts o alertas inline.
 */
export function inertiaErrorMessages(errors) {
    if (!errors || typeof errors !== 'object') {
        return [];
    }

    return Object.values(errors)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((msg) => String(msg ?? '').trim())
        .filter(Boolean);
}

export function showInertiaErrors(errors, toast, fallback = 'Ha ocurrido un error. Inténtalo de nuevo.') {
    const messages = inertiaErrorMessages(errors);
    if (messages.length === 0) {
        toast.error(fallback);
        return;
    }
    messages.forEach((msg) => toast.error(msg));
}
