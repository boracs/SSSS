import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { router } from '@inertiajs/react';

const CartContext = createContext(null);

export const CartProvider = ({ children, initialCartCount = 0, userId }) => {
    const [cartCount, setCartCount] = useState(initialCartCount);
    const [cartProducts, setCartProducts] = useState([]);
    const [cartLoadError, setCartLoadError] = useState(null);

    const updateCartCount = useCallback((count) => {
        setCartCount(count);
    }, []);

    const loadCart = useCallback(() => {
        try {
            setCartLoadError(null);
            router.get(route('carrito'), {}, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: (page) => {
                    setCartLoadError(null);
                    const productos = page?.props?.productos ?? [];
                    setCartProducts(productos);
                    setCartCount(Array.isArray(productos) ? productos.length : 0);
                },
                onError: () => {
                    setCartLoadError('No se pudo cargar el carrito.');
                },
            });
        } catch {
            setCartLoadError('Fallo inesperado al cargar el carrito.');
        }
    }, []);

    useEffect(() => {
        // Sin auto-navegación desde Layout/Menu; ver comentario en loadCart().
        void userId;
    }, [userId]);

    const value = useMemo(
        () => ({ cartCount, updateCartCount, cartProducts, loadCart, cartLoadError }),
        [cartCount, updateCartCount, cartProducts, loadCart, cartLoadError],
    );

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

export const useCartContext = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCartContext debe usarse dentro de CartProvider');
    }
    return context;
};
