import { useEffect, useRef } from "react";
import { usePage } from "@inertiajs/react";
import { toast } from "react-toastify";

/**
 * Muestra flash.success / flash.error de Laravel con react-toastify (una sola notificación).
 */
export default function useInertiaFlashToast() {
    const { flash } = usePage().props;
    const lastKeyRef = useRef("");

    useEffect(() => {
        const success =
            typeof flash?.success === "string" ? flash.success.trim() : "";
        const error = typeof flash?.error === "string" ? flash.error.trim() : "";

        if (!success && !error) {
            lastKeyRef.current = "";
            return;
        }

        const key = `${success}|${error}`;
        if (lastKeyRef.current === key) return;
        lastKeyRef.current = key;

        if (success) toast.success(success);
        if (error) toast.error(error);
    }, [flash?.success, flash?.error]);
}
