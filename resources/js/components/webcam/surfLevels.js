/**
 * Niveles del Parte S4 (contenido fijo de la escuela, no IA).
 * `labelClass` / idle / active deben coincidir con las etiquetas de los
 * párrafos de nivel del parte.
 */
export const SURF_LEVELS = [
    {
        level: "iniciacion",
        label: "Iniciación",
        title: "Tus primeras espumas",
        body: "Estás en este nivel si te manejas en la orilla y con el agua por la cintura: coges la espuma, la ola ya rota que llega blanca, e intentas ponerte de pie sobre la tabla. Aún no remas hasta donde rompen las olas ni sales tú solo.",
        next: "Señal de que ya no eres de este nivel: te levantas casi siempre y quieres pasar la rompiente.",
        labelClass: "bg-emerald-100 text-emerald-800 ring-emerald-200",
        idleClass:
            "border-emerald-200/80 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-50",
        activeClass:
            "border-emerald-400 bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
    },
    {
        level: "intermedio",
        label: "Intermedio",
        title: "Ya pasas la rompiente",
        body: "Estás en este nivel si remas hasta fuera cruzando la zona donde rompen las olas, te colocas solo y coges la ola antes de que rompa, no la espuma. Te pones de pie con soltura y empiezas a deslizarte hacia un lado en lugar de ir recto.",
        next: "Señal de que ya no eres de este nivel: eliges la ola y la giras a voluntad.",
        labelClass: "bg-sky-100 text-sky-800 ring-sky-200",
        idleClass:
            "border-sky-200/80 bg-sky-50/60 text-sky-800 hover:bg-sky-50",
        activeClass:
            "border-sky-400 bg-sky-100 text-sky-900 ring-1 ring-sky-300",
    },
    {
        level: "avanzado",
        label: "Avanzado",
        title: "Lees la ola y giras",
        body: "Estás en este nivel si eliges dónde colocarte según cómo entra el mar, remas la ola justo en el punto donde empieza a levantarse y encadenas giros aprovechando la pared. Te desenvuelves con olas de más fuerza y sabes leer las corrientes para entrar y salir.",
        next: "Si esto se te queda corto, el parte de hoy es tu única referencia.",
        labelClass: "bg-rose-100 text-rose-800 ring-rose-200",
        idleClass:
            "border-rose-200/80 bg-rose-50/60 text-rose-800 hover:bg-rose-50",
        activeClass:
            "border-rose-400 bg-rose-100 text-rose-900 ring-1 ring-rose-300",
    },
];

export function surfLevelMeta(level) {
    return SURF_LEVELS.find((l) => l.level === level) || null;
}

/** Tokens dark para pills de estrellas por nivel (slider / overlay). */
export const LEVEL_STAR_STYLES = {
    iniciacion: {
        short: "Ini",
        aria: "Iniciación",
        pill: "bg-emerald-500/15 ring-emerald-500/30",
        filled: "fill-emerald-300 text-emerald-300",
        label: "text-emerald-300/90",
    },
    intermedio: {
        short: "Int",
        aria: "Intermedio",
        pill: "bg-sky-500/15 ring-sky-500/30",
        filled: "fill-sky-300 text-sky-300",
        label: "text-sky-300/90",
    },
    avanzado: {
        short: "Ava",
        aria: "Avanzado",
        pill: "bg-rose-500/15 ring-rose-500/30",
        filled: "fill-rose-300 text-rose-300",
        label: "text-rose-300/90",
    },
};

export const LEVEL_STAR_ORDER = ["iniciacion", "intermedio", "avanzado"];
