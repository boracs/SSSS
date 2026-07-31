/**
 * Acceso a compra/descuento de tienda socios.
 * Acepta flag backend `has_store_discount_access` o taquilla activa.
 *
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function hasStoreAccess(user) {
    if (!user) return false;
    if (user.has_store_discount_access === true || String(user.has_store_discount_access) === "1") {
        return true;
    }
    const locker = user.numeroTaquilla;
    return locker != null && locker !== 0 && locker !== "0";
}
