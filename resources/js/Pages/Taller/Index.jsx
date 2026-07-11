import React from "react";
import { Head, Link } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import Contenedor_productos from "../../layouts/Contenedor_productos";
import { TallerPageShell, TallerHero, TallerBadge, fadeUp, motion } from "../../components/Taller/TallerShell";
import { TallerArticleCard } from "../../components/Taller/TallerArticleCard";
import { Compass, Sparkles, Waves } from "lucide-react";

export default function Index({ articles = [], productos = [] }) {
    const [featured, ...rest] = articles;

    return (
        <Layout1>
            <Head title="Taller de Surf · Guías y consejos" />

            <TallerPageShell>
                <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
                    <TallerHero
                        badge={<TallerBadge icon={Waves} label="Taller de Surf · S4" />}
                        title={
                            <>
                                Guías, técnicas y{" "}
                                <span className="bg-gradient-to-r from-[#0f5f74] to-cyan-500 bg-clip-text text-transparent">
                                    cultura del surf
                                </span>
                            </>
                        }
                        description="Artículos redactados por nuestro equipo para elegir material, leer el mar, surfear con seguridad y disfrutar más de cada sesión en Zurriola."
                    >
                        <div className="flex flex-wrap gap-3">
                            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                                <Sparkles className="h-3.5 w-3.5 text-cyan-600" aria-hidden="true" />
                                {articles.length} guías publicadas
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                                <Compass className="h-3.5 w-3.5 text-[#0f5f74]" aria-hidden="true" />
                                Desde iniciación hasta lectura avanzada del mar
                            </span>
                        </div>
                    </TallerHero>

                    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {featured ? (
                            <TallerArticleCard article={featured} index={0} featured />
                        ) : null}
                        {rest.map((article, index) => (
                            <TallerArticleCard key={article.id} article={article} index={index + 1} />
                        ))}
                    </div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                        className="mt-14"
                    >
                        <Contenedor_productos
                            productos={productos}
                            eyebrow="Material recomendado"
                            title="Equipamiento de la tienda S4"
                            description="Accesorios, trajes y material seleccionado por nuestro equipo — ideal para complementar lo que lees en el Taller."
                            scrollHint="Desliza para ver productos de la tienda"
                        />
                    </motion.div>
                </div>
            </TallerPageShell>
        </Layout1>
    );
}
