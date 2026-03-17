
import React, { createContext, useState, useEffect, useContext } from 'react';
import { router } from '@inertiajs/react';

const CartContext = createContext();

export const CartProvider = ({ children, initialCartCount = 0, userId }) => {
    const [cartCount, setCartCount] = useState(initialCartCount);
    const [cartProducts, setCartProducts] = useState([]); // Aquí almacenamos los productos del carrito
    const [cartLoadError, setCartLoadError] = useState(null);

    // Función para actualizar el carrito
    const updateCartCount = (count) => {
        setCartCount(count);
    };

    /**
     * Carga del carrito (ruta unificada: /carrito).
     *
     * Importante: /carrito es una ruta Inertia que renderiza la página del carrito.
     * Para evitar que la app "salte" de pantalla desde el header/layout, NO se ejecuta
     * automáticamente al montar. Se deja disponible para invocarla explícitamente.
     */
    const loadCart = () => {
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
                onError: (error) => {
                    console.error('Error al cargar el carrito', error);
                    setCartLoadError('No se pudo cargar el carrito.');
                },
            });
        } catch (e) {
            console.error('Fallo inesperado al cargar el carrito', e);
            setCartLoadError('Fallo inesperado al cargar el carrito.');
        }
    };

    useEffect(() => {
        // Evitamos auto-navegación desde Layout/Menu.
        // Si más adelante se implementa un endpoint JSON (p.ej. /api/carrito/resumen),
        // aquí podría reactivarse una carga no intrusiva.
    }, [userId]);

    return (
        <CartContext.Provider value={{ cartCount, updateCartCount, cartProducts, loadCart, cartLoadError }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCartContext = () => {
    return useContext(CartContext);
};












/* -----------------------------------------------------



// Hook para consumir el contexto en cualquier componente
export const useCart = () => {
    return useContext(CartContext);
};

// Proveedor del contexto
export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState({
        items: [],
        quantity: 0,
        total: 0,  // Total agregado para poder manejar el valor total
    });

    // Función para agregar un producto al carrito
    const addToCart = (item) => {
        setCart((prevState) => {
            const existingItem = prevState.items.find((cartItem) => cartItem.id === item.id);

            let newItems;
            if (existingItem) {
                // Si el producto ya está, incrementamos la cantidad
                newItems = prevState.items.map((cartItem) =>
                    cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
                );
            } else {
                // Si el producto no está en el carrito, lo agregamos
                newItems = [...prevState.items, { ...item, quantity: 1 }];
            }

            const newQuantity = newItems.reduce((acc, item) => acc + item.quantity, 0); // Actualizamos la cantidad total
            const newTotal = newItems.reduce((acc, item) => acc + item.precio * item.quantity, 0); // Calculamos el total

            return { items: newItems, quantity: newQuantity, total: newTotal };
        });
    };

    // Función para eliminar un producto del carrito
    const removeFromCart = (e, productId) => {
        e.preventDefault();  // Evita la recarga de la página en un evento de clic
        setCart((prevState) => {
            const updatedItems = prevState.items.filter(item => item.id !== productId);
            const newQuantity = updatedItems.reduce((acc, item) => acc + item.quantity, 0);  // Actualizamos la cantidad total
            const newTotal = updatedItems.reduce((acc, item) => acc + item.precio * item.quantity, 0);  // Calculamos el total
    
            return { items: updatedItems, quantity: newQuantity, total: newTotal };
        });
    };

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart }}>
            {children}
        </CartContext.Provider>
    );
};
 */