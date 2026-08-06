import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePage } from "@inertiajs/react";
import { postChatbotMessage, fetchChatbotHistory, registerChatbotContactPhone } from "../lib/chatbotApi";
import { whatsappUrlWithMessage } from "../lib/whatsapp";
import {
    MessagesSquare,
    Send,
    Loader2,
    X,
    AlertTriangle,
    Database,
    MessageSquare,
    Clock,
    Sparkles,
    ShieldAlert,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const LOCAL_CHAT_KEY = "s4_anon_chat_v1";
const ANON_SESSION_TOKEN_KEY = "s4_anon_chat_token";

const CHAT_Z = "z-[850]";

const fieldShell =
    "group relative flex flex-1 items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-2.5 transition-all duration-200 focus-within:border-s4/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-500/15";

const fieldInput =
    "min-w-0 flex-1 border-0 bg-transparent py-1 text-[15px] text-slate-900 outline-none placeholder:text-slate-400";

const panelShell =
    "fixed bottom-6 right-6 flex w-[calc(100%-3rem)] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-cyan-900/10 bg-white shadow-[0_24px_60px_-28px_rgba(15,95,116,0.28)] transition-all duration-300 " +
    CHAT_Z;

const useChatbot = () => {
    const { props } = usePage();
    const laravelUserId = props?.auth?.user?.id;
    const userTelefono = props?.auth?.user?.telefono ?? null;
    const academyWhatsappUrl = props?.academyWhatsappUrl ?? null;

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [apiError, setApiError] = useState(null);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
    const [userId, setUserId] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [requiresHuman, setRequiresHuman] = useState(false);
    const [caseReference, setCaseReference] = useState(null);
    const [savedContactPhone, setSavedContactPhone] = useState(null);
    const [whatsappBusy, setWhatsappBusy] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const messagesEndRef = useRef(null);
    const messagesRef = useRef([]);
    const sessionTokenRef = useRef(null);
    const setInputRef = useRef(setInputMessage);
    const setMessagesRef = useRef(setMessages);
    const setApiErrorRef = useRef(setApiError);
    const setRateLimitRef = useRef(setIsRateLimited);
    const setRetryRef = useRef(setRetryAfterSeconds);

    messagesRef.current = messages;
    setInputRef.current = setInputMessage;
    setMessagesRef.current = setMessages;
    setApiErrorRef.current = setApiError;
    setRateLimitRef.current = setIsRateLimited;
    setRetryRef.current = setRetryAfterSeconds;

    const getOrCreateSessionToken = () => {
        let token = localStorage.getItem(ANON_SESSION_TOKEN_KEY);
        if (!token) {
            token = crypto.randomUUID();
            localStorage.setItem(ANON_SESSION_TOKEN_KEY, token);
        }
        return token;
    };

    const loadLocalChat = () => {
        try {
            const history = localStorage.getItem(LOCAL_CHAT_KEY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error("Error cargando chat local:", error);
            return [];
        }
    };

    const saveLocalChat = (currentMessages) => {
        try {
            localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(currentMessages));
        } catch (error) {
            console.error("Error guardando chat local:", error);
        }
    };

    useEffect(() => {
        if (laravelUserId != null) {
            setUserId(String(laravelUserId));
            setIsLoggedIn(true);
            sessionTokenRef.current = null;
            setIsAuthReady(true);
            return;
        }

        sessionTokenRef.current = getOrCreateSessionToken();
        setUserId(sessionTokenRef.current);
        setIsLoggedIn(false);
        setMessages(loadLocalChat());
        setIsAuthReady(true);
    }, [laravelUserId]);

    useEffect(() => {
        if (!isAuthReady || !isLoggedIn) return;

        let cancelled = false;
        fetchChatbotHistory()
            .then(({ history, status, caseReference: serverCase, contactPhone }) => {
                if (cancelled) return;
                if (history.length > 0) {
                    setMessages(history.map((turn, index) => ({ id: `srv-${index}`, ...turn })));
                }
                if (status === "requires_human") {
                    setRequiresHuman(true);
                    setCaseReference(serverCase);
                }
                if (contactPhone) {
                    setSavedContactPhone(contactPhone);
                }
            })
            .catch((error) => console.error("Error cargando historial del chatbot:", error));

        return () => {
            cancelled = true;
        };
    }, [isAuthReady, isLoggedIn]);

    useEffect(() => {
        if (!requiresHuman || !isLoggedIn || !userTelefono || savedContactPhone) {
            return;
        }

        let cancelled = false;
        registerChatbotContactPhone({
            phone: userTelefono,
            sessionToken: null,
            caseReference,
        })
            .then((result) => {
                if (!cancelled && result.success && result.contactPhone) {
                    setSavedContactPhone(result.contactPhone);
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [requiresHuman, isLoggedIn, userTelefono, caseReference, savedContactPhone]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // useState (no useActionState): evita que Suspense del layout oculte el chat al enviar.
    const submitMessage = async (userText) => {
        const text = String(userText ?? "").trim();
        if (!text || isPending) {
            return;
        }

        setIsPending(true);
        setApiErrorRef.current(null);
        setInputRef.current("");

        const userMessage = { role: "user", text, createdAt: new Date() };
        const snapshot = [...messagesRef.current, userMessage];
        setMessagesRef.current(snapshot);

        if (!isLoggedIn) {
            saveLocalChat(snapshot);
        }

        const historyForApi = snapshot
            .slice(0, -1)
            .filter((m) => m.text && m.text.trim())
            .map((m) => ({ role: m.role, text: m.text }));

        try {
            const reply = await postChatbotMessage({
                message: text,
                history: historyForApi,
                sessionToken: sessionTokenRef.current,
            });

            const botMessage = { role: "model", text: reply.message, createdAt: new Date() };
            const finalMessages = [...snapshot, botMessage];
            setMessagesRef.current(finalMessages);

            if (!isLoggedIn) {
                saveLocalChat(finalMessages);
            }

            if (reply.requiresHuman) {
                setRequiresHuman(true);
                setCaseReference(reply.caseReference);
            }
        } catch (error) {
            console.error("Error durante el proceso de chat:", error);
            if (error.response?.status === 429) {
                const retryAfter = error.response.headers["Retry-After"] || 60;
                const waitTime = parseInt(retryAfter, 10);
                setRetryRef.current(waitTime);
                setRateLimitRef.current(true);
                setApiErrorRef.current(
                    `Has excedido el límite de mensajes. Por favor, espera ${waitTime} segundos.`,
                );
            } else {
                setApiErrorRef.current(
                    `Error de comunicación (${error.response?.status || "network"}). Maider no pudo responder.`,
                );
            }
        } finally {
            setIsPending(false);
        }
    };

    useEffect(scrollToBottom, [messages, isPending, isOpen, apiError]);

    const buildWhatsappMessage = () => {
        const parts = [`Hola, mi caso es ${caseReference ?? "sin número"}.`];
        parts.push("Necesito ayuda con mi consulta al chatbot.");
        return parts.join(" ");
    };

    /** Abre WhatsApp al instante: el móvil del cliente ya se ve en el chat de WA. */
    const handleWhatsappContinue = (e) => {
        e.preventDefault();
        if (!academyWhatsappUrl || whatsappBusy) {
            return;
        }

        setWhatsappBusy(true);
        setApiError(null);

        try {
            const url = whatsappUrlWithMessage(academyWhatsappUrl, buildWhatsappMessage());
            if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
            } else {
                setApiError("No hay un enlace de WhatsApp configurado ahora mismo.");
            }
        } catch {
            setApiError("Error al abrir WhatsApp. Inténtalo de nuevo.");
        } finally {
            setWhatsappBusy(false);
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (isPending || isRateLimited || !userId) return;
        void submitMessage(inputMessage.trim().slice(0, 500));
    };

    return {
        isOpen,
        setIsOpen,
        messages,
        inputMessage,
        setInputMessage,
        isLoading: isPending,
        apiError,
        isRateLimited,
        retryAfterSeconds,
        handleSend,
        messagesEndRef,
        isLoggedIn,
        requiresHuman,
        caseReference,
        whatsappBusy,
        handleWhatsappContinue,
        academyWhatsappUrl,
    };
};

const Message = ({ message }) => {
    const isUser = message.role === "user";

    return (
        <div
            className={`max-w-[88%] transition duration-200 ease-in-out ${
                isUser ? "self-end" : "self-start"
            }`}
        >
            <div
                className={
                    isUser
                        ? "rounded-2xl rounded-br-md bg-[#0f5f74] px-4 py-3 text-sm leading-relaxed text-white shadow-md shadow-cyan-900/20"
                        : "rounded-2xl rounded-bl-md border border-slate-200/90 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm"
                }
            >
                <ReactMarkdown
                    components={{
                        p: ({ children }) => <p className="mb-0 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        a: ({ href, children }) => (
                            <a
                                href={href}
                                className={
                                    isUser
                                        ? "font-semibold underline decoration-white/50 underline-offset-2 hover:decoration-white"
                                        : "font-semibold text-s4 underline decoration-cyan-300 underline-offset-2 hover:text-cyan-800"
                                }
                                target={href?.startsWith("http") ? "_blank" : undefined}
                                rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                            >
                                {children}
                            </a>
                        ),
                    }}
                >
                    {message.text}
                </ReactMarkdown>
            </div>
        </div>
    );
};

const TypingIndicator = () => (
    <div className="max-w-[88%] self-start rounded-2xl rounded-bl-md border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-s4" aria-hidden="true" />
            <span>Consultando FAQ…</span>
        </div>
    </div>
);

const Chatbot = () => {
    const {
        isOpen,
        setIsOpen,
        messages,
        inputMessage,
        setInputMessage,
        isLoading,
        apiError,
        isRateLimited,
        retryAfterSeconds,
        handleSend,
        messagesEndRef,
        isLoggedIn,
        requiresHuman,
        caseReference,
        whatsappBusy,
        handleWhatsappContinue,
        academyWhatsappUrl,
    } = useChatbot();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const fabButton = (
        <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f5f74] text-white shadow-[0_12px_28px_-8px_rgba(15,95,116,0.55)] ring-1 ring-white/20 transition duration-300 hover:scale-105 hover:bg-[#0d5568] hover:shadow-[0_16px_32px_-8px_rgba(15,95,116,0.65)] ${CHAT_Z}`}
            aria-label="Abrir chat con Maider"
        >
            <MessagesSquare className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        </button>
    );

    if (!mounted) {
        return null;
    }

    if (!isOpen) {
        return createPortal(fabButton, document.body);
    }

    const panel = (
        <div className={`${panelShell} h-[80vh] sm:h-[600px]`}>
            <div className="h-1.5 w-full bg-gradient-to-r from-[#0f5f74] via-cyan-500 to-cyan-300" aria-hidden="true" />

            <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            San Sebastián Surf School
                        </p>
                        <h3 className="mt-1 font-heading text-lg font-bold tracking-tight text-slate-900">
                            Maider{" "}
                            <span className="bg-gradient-to-r from-[#0f5f74] to-cyan-600 bg-clip-text text-transparent">
                                Asistente
                            </span>
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {isLoggedIn ? "Sesión registrada" : "Sesión anónima"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="rounded-xl border border-slate-200/90 p-2 text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50/60 hover:text-s4"
                        aria-label="Cerrar chat"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto bg-gradient-to-b from-cyan-50/40 via-slate-50/60 to-white p-4">
                {apiError && !isRateLimited ? (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{apiError}</span>
                    </div>
                ) : null}
                {isRateLimited ? (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <Clock className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                        <span>
                            Límite excedido. Reintento en {retryAfterSeconds} segundos.
                        </span>
                    </div>
                ) : null}
                {requiresHuman ? (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                            Te pasamos con el equipo
                            {caseReference ? ` (caso ${caseReference})` : ""}. Abre WhatsApp y te
                            atendemos con el número de caso ya incluido.
                        </span>
                    </div>
                ) : null}
                {messages.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-cyan-100/80 bg-white p-5 text-center shadow-sm">
                        <Sparkles className="mx-auto mb-3 h-8 w-8 text-s4" aria-hidden="true" />
                        <p className="font-heading text-base font-bold text-slate-900">¡Hola! Soy Maider</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Te ayudo con clases, bonos VIP, alquiler de tablas y dudas del día a día.
                        </p>
                        <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700">
                            <Database className="h-3 w-3" aria-hidden="true" />
                            FAQ local · respuesta instantánea
                        </p>
                    </div>
                ) : null}
                <div className="flex flex-col gap-2">
                    {messages.map((msg, index) => (
                        <Message key={msg.id || index} message={msg} />
                    ))}
                </div>
                {isLoading ? <TypingIndicator /> : null}
                <div ref={messagesEndRef} />
            </div>

            {requiresHuman && academyWhatsappUrl ? (
                <div className="border-t border-slate-100 bg-white p-4">
                    <p className="mb-3 text-center text-xs leading-relaxed text-slate-500">
                        El número de caso ya va en el mensaje. Te atendemos al instante.
                    </p>
                    <button
                        type="button"
                        onClick={handleWhatsappContinue}
                        disabled={whatsappBusy}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {whatsappBusy ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
                        ) : (
                            <MessageSquare className="h-4.5 w-4.5" aria-hidden="true" />
                        )}
                        Continuar por WhatsApp{caseReference ? ` · ${caseReference}` : ""}
                    </button>
                </div>
            ) : null}

            <form onSubmit={handleSend} className="border-t border-slate-100 bg-white p-4">
                <div className="flex items-center gap-2">
                    <div className={fieldShell}>
                        <MessageSquare
                            className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-focus-within:text-s4"
                            aria-hidden="true"
                        />
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder={
                                isRateLimited
                                    ? `Espera ${retryAfterSeconds}s…`
                                    : "Escribe tu mensaje…"
                            }
                            className={fieldInput}
                            disabled={isLoading || isRateLimited}
                            autoComplete="off"
                            maxLength={500}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || isRateLimited || !inputMessage.trim()}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0f5f74] text-white shadow-lg shadow-cyan-900/25 transition hover:bg-[#0d5568] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Enviar mensaje"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        ) : (
                            <Send className="h-5 w-5" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );

    return createPortal(panel, document.body);
};

export default Chatbot;
