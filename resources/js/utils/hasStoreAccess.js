/**
 * Acceso a compra/descuento de tienda socios.
 * VIP (is_vip / #500) o socio con taquilla física. El flag backend manda.
 *
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function hasStoreAccess(user) {
    if (!user) return false;
    if (user.has_store_discount_access === true || String(user.has_store_discount_access) === "1") {
        return true;
    }
    if (user.is_vip === true || String(user.is_vip) === "1") {
        return true;
    }
    const locker = user.numeroTaquilla;
    return locker != null && locker !== 0 && locker !== "0";
}
