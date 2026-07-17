/**
 * Cliente del agente de chatbot — POST /api/chatbot/message + GET /api/chatbot/history.
 * Backend: FAQ local determinista + guard anti-inyección + derivación a humano (sin IA externa).
 */

import axios from "axios";

/**
 * @param {{ message: string, history: Array<{ role: string, text: string }>, sessionToken?: string|null }} payload
 * @returns {Promise<{ message: string, context: string, requiresHuman: boolean, caseReference: string|null }>}
 */
export async function postChatbotMessage({ message, history, sessionToken }) {
    const { data } = await axios.post("/api/chatbot/message", {
        message,
        history,
        sessionToken: sessionToken ?? null,
    });

    return {
        message: String(data.message ?? ""),
        context: String(data.context ?? "fallback"),
        requiresHuman: Boolean(data.requiresHuman),
        caseReference: data.caseReference ?? null,
    };
}

/**
 * Carga perezosa del historial persistido en MySQL para un usuario autenticado.
 * @returns {Promise<{ history: Array<{ role: string, text: string }>, status: string|null, caseReference: string|null }>}
 */
export async function fetchChatbotHistory() {
    const { data } = await axios.get("/api/chatbot/history");

    return {
        history: Array.isArray(data.history) ? data.history : [],
        status: data.status ?? null,
        caseReference: data.caseReference ?? null,
        contactPhone: data.contactPhone ?? null,
    };
}

/**
 * Guarda el móvil del visitante vinculado al caso derivado a humano.
 * @returns {Promise<{ success: boolean, contactPhone: string|null, caseReference: string|null, message?: string }>}
 */
export async function registerChatbotContactPhone({ phone, sessionToken, caseReference }) {
    const { data } = await axios.post("/api/chatbot/contact-phone", {
        phone,
        sessionToken: sessionToken ?? null,
        caseReference: caseReference ?? null,
    });

    return {
        success: Boolean(data.success),
        contactPhone: data.contactPhone ?? null,
        caseReference: data.caseReference ?? null,
        message: data.message,
    };
}
