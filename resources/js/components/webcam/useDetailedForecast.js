import { useCallback, useRef, useState } from "react";
import axios from "axios";

/**
 * Fetch on-demand del slider "forecast al detalle" (cada 2h).
 * Una sola petición por montaje tras éxito; reintento si falla.
 */
export default function useDetailedForecast() {
    const [open, setOpen] = useState(false);
    const [days, setDays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [weatherOk, setWeatherOk] = useState(true);
    const [weatherMessage, setWeatherMessage] = useState("");
    const fetchedRef = useRef(false);

    const openDetailed = useCallback(async () => {
        setOpen(true);

        if (fetchedRef.current) {
            return;
        }

        setLoading(true);
        setError("");

        try {
            const { data } = await axios.get(route("servicios.webcams.forecast_detailed"));
            if (data?.ok) {
                fetchedRef.current = true;
                setDays(Array.isArray(data.days) ? data.days : []);
                setWeatherOk(data.weatherOk !== false);
                setWeatherMessage(data.weatherMessage || "");
            } else {
                fetchedRef.current = false;
                setError(data?.message || "No se pudo cargar el detalle cada 2h.");
            }
        } catch {
            fetchedRef.current = false;
            setError("No se pudo cargar el detalle cada 2h. Prueba otra vez.");
        } finally {
            setLoading(false);
        }
    }, []);

    const closeDetailed = useCallback(() => {
        setOpen(false);
    }, []);

    return {
        open,
        days,
        loading,
        error,
        weatherOk,
        weatherMessage,
        openDetailed,
        closeDetailed,
    };
}
