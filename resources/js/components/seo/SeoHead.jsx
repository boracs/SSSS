import React from "react";
import { Head } from "@inertiajs/react";

/**
 * Metadatos SEO/GEO desde DTO backend (`seo` prop).
 * Sin lógica de negocio: solo render de tags + JSON-LD + preloads LCP.
 */
export default function SeoHead({ seo }) {
    if (!seo || typeof seo !== "object") {
        return null;
    }

    const title = seo.title || "";
    const description = seo.description || "";
    const canonical = seo.canonical || "";
    const robots = seo.robots || "index, follow";
    const ogTitle = seo.ogTitle || title;
    const ogDescription = seo.ogDescription || description;
    const ogImage = seo.ogImage || "";
    const ogType = seo.ogType || "website";
    const ogLocale = seo.ogLocale || "es_ES";
    const jsonLd = Array.isArray(seo.jsonLd) ? seo.jsonLd : [];
    const preloadImages = Array.isArray(seo.preloadImages) ? seo.preloadImages : [];

    return (
        <Head>
            {title ? <title>{title}</title> : null}
            {description ? (
                <meta head-key="description" name="description" content={description} />
            ) : null}
            {robots ? (
                <meta head-key="robots" name="robots" content={robots} />
            ) : null}
            {canonical ? (
                <link head-key="canonical" rel="canonical" href={canonical} />
            ) : null}

            {preloadImages.map((item, index) => {
                if (!item?.href) return null;
                return (
                    <link
                        key={`preload-img-${index}`}
                        rel="preload"
                        as={item.as || "image"}
                        href={item.href}
                        type={item.type || undefined}
                        imageSrcSet={item.imagesrcset || undefined}
                        imageSizes={item.imagesizes || undefined}
                        fetchPriority={item.fetchpriority || undefined}
                    />
                );
            })}

            <meta head-key="og:locale" property="og:locale" content={ogLocale} />
            <meta head-key="og:type" property="og:type" content={ogType} />
            {ogTitle ? (
                <meta head-key="og:title" property="og:title" content={ogTitle} />
            ) : null}
            {ogDescription ? (
                <meta
                    head-key="og:description"
                    property="og:description"
                    content={ogDescription}
                />
            ) : null}
            {ogImage ? (
                <meta head-key="og:image" property="og:image" content={ogImage} />
            ) : null}
            {canonical ? (
                <meta head-key="og:url" property="og:url" content={canonical} />
            ) : null}

            <meta head-key="twitter:card" name="twitter:card" content="summary_large_image" />
            {ogTitle ? (
                <meta head-key="twitter:title" name="twitter:title" content={ogTitle} />
            ) : null}
            {ogDescription ? (
                <meta
                    head-key="twitter:description"
                    name="twitter:description"
                    content={ogDescription}
                />
            ) : null}
            {ogImage ? (
                <meta head-key="twitter:image" name="twitter:image" content={ogImage} />
            ) : null}

            {jsonLd.map((node, index) => (
                <script
                    key={`ld-${index}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
                />
            ))}
        </Head>
    );
}
