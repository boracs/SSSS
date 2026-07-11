#!/usr/bin/env python3
"""Parse articles_raw.txt (latin-1 from pdftotext) into taller_articles.php."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "articles_raw.txt"
OUT = ROOT / "data" / "taller_articles.php"

TITLE_PATTERNS = [
    r"^El Kit del Surfista",
    r"^Guía Práctica",
    r"^Manual de Surf",
    r"^¿Cuál es la Tabla",
    r"^¿Cómo saber si tu Tabla",
    r"^¿Qué Debo Tener en Cuenta al Reservar",
    r"^Guía de Corrientes",
    r"^¿Qué Aprenderé en mi Primera Clase",
    r"^¿De Qué Materiales",
    r"^¿A Qué Edad",
    r"^Guía Completa: Partes",
    r"^Medidas de las Tablas",
    r"^Guía de Olas y Rompientes",
    r"^¿Dónde Colocarse",
    r"^¿Qué Titulación",
    r"^¿Cómo hacer el pato",
    r"^Cómo interpretar el parte",
    r"^¿Cómo saber en qué dirección",
]

SKIP_LINE = (
    "Aquí tienes",
    "¡Excelente",
    "¡Claro",
    "He eliminado",
    "Se han corregido",
    "unificando los bloques",
    "Este texto explica el mecanismo",
)


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")[:80]


def clean_title(line: str) -> str:
    line = line.strip()
    line = re.sub(r"\s+", " ", line)
    return line.rstrip("?")


def is_title_line(line: str) -> bool:
    s = line.strip()
    if not s or len(s) > 120 or any(x in s for x in SKIP_LINE):
        return False
    if s.startswith(" ") or re.match(r"^\d+\.\s", s):
        return False
    return any(re.match(p, s) for p in TITLE_PATTERNS)


def find_sections(lines: list[str]) -> list[tuple[str, list[str]]]:
    indices: list[tuple[int, str]] = []
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if s == "¿Qué Aprenderé en mi Primera Clase de" and i + 1 < len(lines):
            s = f"{s} {lines[i + 1].strip()}"
            indices.append((i, clean_title(s)))
            i += 2
            continue
        if is_title_line(s):
            indices.append((i, clean_title(s)))
        i += 1

    sections: list[tuple[str, list[str]]] = []
    for idx, (start, title) in enumerate(indices):
        end = indices[idx + 1][0] if idx + 1 < len(indices) else len(lines)
        body = lines[start + 1 : end]
        sections.append((title, body))
    return sections


def normalize_body_lines(body: list[str]) -> list[str]:
    out: list[str] = []
    for line in body:
        line = line.replace("\f", "").rstrip()
        if not line.strip():
            out.append("")
            continue
        if any(x in line for x in SKIP_LINE):
            continue
        out.append(line)
    return out


def is_bullet(line: str) -> bool:
    s = line.strip()
    if s.startswith(("•", "-", "–", "·")):
        return True
    if line.startswith((" ", "\t")) and len(s) > 2:
        if re.match(r"^[\wÁÉÍÓÚáéíóú¿¡]", s):
            return True
    return False


def is_numbered_heading(line: str) -> bool:
    return bool(re.match(r"^\d+\.\s+[A-ZÁÉÍÓÚ¿¡]", line.strip()))


def is_subheading(line: str) -> bool:
    s = line.strip()
    if len(s) > 90 or len(s) < 8:
        return False
    if s.endswith(":") and not s.startswith(("http", "www")):
        return True
    if re.match(r"^(La |El |Los |Las |Entendiendo|Método|Tablas|Escenario|Conclusión|Fases|Ejercicio)", s):
        if s.endswith(".") and len(s) > 40:
            return False
        return True
    return False


def lines_to_html(lines: list[str]) -> str:
    html: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue

        if is_numbered_heading(line):
            html.append(f"<h2>{escape(line.strip())}</h2>")
            i += 1
            continue

        if is_subheading(line.strip()) and not is_bullet(line):
            html.append(f"<h3>{escape(line.strip().rstrip(':'))}</h3>")
            i += 1
            continue

        if is_bullet(line):
            items: list[str] = []
            while i < len(lines) and is_bullet(lines[i]):
                item = lines[i].strip()
                item = re.sub(r"^[•\-–·]\s*", "", item)
                items.append(f"<li>{escape(item)}</li>")
                i += 1
            html.append(f"<ul>{''.join(items)}</ul>")
            continue

        para_lines: list[str] = [line.strip()]
        i += 1
        while i < len(lines) and lines[i].strip() and not is_bullet(lines[i]) and not is_numbered_heading(lines[i]):
            if is_subheading(lines[i].strip()):
                break
            para_lines.append(lines[i].strip())
            i += 1
        text = " ".join(para_lines)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            html.append(f"<p>{escape(text)}</p>")

    return "\n".join(html)


def escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def excerpt_from_html(html: str, max_len: int = 180) -> str:
    plain = re.sub(r"<[^>]+>", " ", html)
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) <= max_len:
        return plain
    cut = plain[: max_len - 1].rsplit(" ", 1)[0]
    return cut + "…"


def meta_keywords(title: str) -> str:
    base = ["surf", "escuela de surf", "Donostia", "San Sebastián", "Zurriola"]
    words = re.findall(r"\w+", title.lower())
    extra = [w for w in words if len(w) > 3 and w not in ("para", "como", "qué", "guía")]
    return ", ".join(dict.fromkeys(extra + base))


def php_export(articles: list[dict]) -> str:
    lines = ["<?php", "", "declare(strict_types=1);", "", "/**", " * Artículos del Taller de Surf — generado desde PDF.", " */", "return ["]
    for art in articles:
        lines.append("    [")
        for key in ("title", "slug", "excerpt", "content", "meta_title", "meta_description", "meta_keywords"):
            val = art[key]
            if key == "content":
                lines.append(f"        '{key}' => <<<'HTML'")
                lines.append(val)
                lines.append("HTML,")
            else:
                escaped = val.replace("\\", "\\\\").replace("'", "\\'")
                lines.append(f"        '{key}' => '{escaped}',")
        lines.append("    ],")
    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    raw = RAW.read_bytes().decode("latin-1")
    lines = raw.splitlines()
    sections = find_sections(lines)

    articles: list[dict] = []
    used_slugs: set[str] = set()

    for title, body in sections:
        body_lines = normalize_body_lines(body)
        content = lines_to_html(body_lines)
        if len(content) < 80:
            continue

        slug = slugify(title)
        if slug in used_slugs:
            slug = f"{slug}-{len(used_slugs) + 1}"
        used_slugs.add(slug)

        excerpt = excerpt_from_html(content)
        articles.append(
            {
                "title": title,
                "slug": slug,
                "excerpt": excerpt,
                "content": content,
                "meta_title": f"{title} | Taller de Surf S4",
                "meta_description": excerpt,
                "meta_keywords": meta_keywords(title),
            }
        )

    OUT.write_text(php_export(articles), encoding="utf-8")
    print(f"Wrote {len(articles)} articles to {OUT}")


if __name__ == "__main__":
    main()
