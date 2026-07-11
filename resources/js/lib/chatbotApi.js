/**
 * Cliente FAQ chatbot — POST /api/chatbot/message (sin Firestore/Gemini).
 */

import axios from "axios";

/**
 * @param {string} userId
 * @param {Array<{ role: string, text: string }>} history
 * @returns {Promise<{ message: string, context: string }>}
 */
export async function postChatbotMessage(userId, history) {
    const { data } = await axios.post("/api/chatbot/message", {
        userId,
        history,
    });

    return {
        message: String(data.message ?? ""),
        context: String(data.context ?? "fallback"),
    };
}
