import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePage } from "@inertiajs/react";
import { postChatbotMessage, fetchChatbotHistory, registerChatbotContactPhone } from "../lib/chatbotApi";
import { whatsappUrlWithMessage } from "../lib/whatsapp";
import {
    MessageCircle,
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
    "group relative flex flex-1 items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-2.5 transition-all duration-200 focus-within:border-orange-400/80 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10";

const fieldInput =
    "min-w-0 flex-1 border-0 bg-transparent py-1 text-[15px] text-slate-900 outline-none placeholder:text-slate-400";

const panelShell =
    "fixed bottom-6 right-6 flex w-[calc(100%-3rem)] max-w-sm flex-col overflow-hidden rounded-[1.75rem] border border-white/60 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] transition-all duration-300 " +
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
    const [phoneInput, setPhoneInput] = useState("");
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
        const phone = savedContactPhone ?? userTelefono ?? phoneInput.trim();
        if (phone) {
            parts.push(`Mi móvil es ${phone}.`);
        }
        parts.push("Necesito ayuda con mi consulta al chatbot.");

        return parts.join(" ");
    };

    const handleWhatsappContinue = async (e) => {
        e.preventDefault();
        if (!academyWhatsappUrl || whatsappBusy) {
            return;
        }

        const phoneToSave = userTelefono ?? phoneInput.trim();
        if (!savedContactPhone && !userTelefono) {
            if (!phoneToSave || phoneToSave.replace(/\D/g, "").length < 9) {
                setApiError("Introduce un móvil válido (9 dígitos) para que podamos responderte.");
                return;
            }
        }

        setWhatsappBusy(true);
        setApiError(null);

        try {
            if (!savedContactPhone) {
                const result = await registerChatbotContactPhone({
                    phone: phoneToSave,
                    sessionToken: sessionTokenRef.current,
                    caseReference,
                });
                if (!result.success) {
                    setApiError(result.message || "No se pudo guardar el teléfono.");
                    return;
                }
                if (result.contactPhone) {
                    setSavedContactPhone(result.contactPhone);
                }
            }

            const url = whatsappUrlWithMessage(academyWhatsappUrl, buildWhatsappMessage());
            if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
            }
        } catch {
            setApiError("Error al conectar con WhatsApp. Inténtalo de nuevo.");
        } finally {
            setWhatsappBusy(false);
        }
    };

    const needsPhoneInput = requiresHuman && !savedContactPhone && !userTelefono;

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
        savedContactPhone,
        phoneInput,
        setPhoneInput,
        needsPhoneInput,
        whatsappBusy,
        handleWhatsappContinue,
        userTelefono,
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
                        ? "rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-relaxed text-white shadow-md shadow-slate-900/15"
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
                                        : "font-semibold text-orange-600 underline decoration-orange-300 underline-offset-2 hover:text-orange-700"
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
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" aria-hidden="true" />
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
        savedContactPhone,
        phoneInput,
        setPhoneInput,
        needsPhoneInput,
        whatsappBusy,
        handleWhatsappContinue,
        userTelefono,
        academyWhatsappUrl,
    } = useChatbot();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const fabButton = (
        <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/25 transition duration-300 hover:scale-110 hover:bg-slate-800 ${CHAT_Z}`}
            aria-label="Abrir chat con Maider"
        >
            <MessageCircle className="h-7 w-7" aria-hidden="true" />
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
            <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-500" aria-hidden="true" />

            <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            San Sebastián Surf School
                        </p>
                        <h3 className="mt-1 font-heading text-lg font-bold tracking-tight text-slate-900">
                            Maider{" "}
                            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
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
                        className="rounded-xl border border-slate-200/90 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                        aria-label="Cerrar chat"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50/80 to-white p-4">
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
                            Esta conversación tiene **revisión manual**
                            {caseReference ? ` (caso ${caseReference})` : ""}. Puedes seguir preguntando cosas
                            sencillas aquí o usar **WhatsApp** para tu caso concreto.
                        </span>
                    </div>
                ) : null}
                {messages.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-slate-200/90 bg-white p-5 text-center shadow-sm">
                        <Sparkles className="mx-auto mb-3 h-8 w-8 text-orange-500" aria-hidden="true" />
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

            {requiresHuman ? (
                <div className="border-t border-slate-100 bg-white p-4">
                    {needsPhoneInput ? (
                        <div className="mb-3">
                            <label htmlFor="chatbot-contact-phone" className="mb-1.5 block text-xs font-semibold text-slate-600">
                                Tu móvil (para que podamos responderte)
                            </label>
                            <input
                                id="chatbot-contact-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                placeholder="600 000 000"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                            />
                        </div>
                    ) : savedContactPhone || userTelefono ? (
                        <p className="mb-3 text-center text-xs text-slate-500">
                            Móvil registrado:{" "}
                            <span className="font-semibold text-slate-700">{savedContactPhone ?? userTelefono}</span>
                        </p>
                    ) : null}
                    <button
                        type="button"
                        onClick={handleWhatsappContinue}
                        disabled={whatsappBusy || (needsPhoneInput && phoneInput.replace(/\D/g, "").length < 9)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {whatsappBusy ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden="true" />
                        ) : (
                            <MessageCircle className="h-4.5 w-4.5" aria-hidden="true" />
                        )}
                        Continuar por WhatsApp{caseReference ? ` · ${caseReference}` : ""}
                    </button>
                </div>
            ) : null}

            <form onSubmit={handleSend} className="border-t border-slate-100 bg-white p-4">
                <div className="flex items-center gap-2">
                    <div className={fieldShell}>
                        <MessageSquare
                            className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-focus-within:text-orange-500"
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
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
