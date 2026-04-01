"use client";

import Link from "next/link";
import {
  Waves,
  MapPin,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================
interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface FooterProps {
  sections?: FooterSection[];
  className?: string;
}

// ============================================
// SUBCOMPONENTS
// ============================================

function FooterLogo() {
  return (
    <div className="space-y-4">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform group-hover:scale-105">
          <Waves className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold text-foreground">
            San Sebastián
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            Surf School
          </span>
        </div>
      </Link>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        La Concha · Zurriola · Cantábrico
        <br />
        Seguridad, técnica y experiencia premium.
      </p>
    </div>
  );
}

function FooterNavSection({ section }: { section: FooterSection }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {section.title}
      </h3>
      <ul className="space-y-3">
        {section.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-foreground/80 transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactInfo() {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Escuela
      </h3>
      <ul className="space-y-3">
        <li className="flex items-start gap-2 text-sm text-foreground/80">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>
            Playa de La Concha
            <br />
            San Sebastián, 20003
          </span>
        </li>
        <li>
          <Link
            href="mailto:info@sansebastiansurf.school"
            className="flex items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-accent"
          >
            <Mail className="h-4 w-4 text-accent" />
            info@sansebastiansurf.school
          </Link>
        </li>
        <li>
          <Link
            href="tel:+34943000000"
            className="flex items-center gap-2 text-sm text-foreground/80 transition-colors hover:text-accent"
          >
            <Phone className="h-4 w-4 text-accent" />
            +34 943 000 000
          </Link>
        </li>
      </ul>
    </div>
  );
}

function SocialLinks() {
  const socials = [
    { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
    { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
    { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  ];

  return (
    <div className="flex items-center gap-2">
      {socials.map((social) => (
        <Link
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={social.label}
        >
          <social.icon className="h-4 w-4" />
        </Link>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function Footer({ sections = defaultSections, className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("border-t border-border/50 bg-secondary/30", className)}>
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Logo & Description */}
          <div className="sm:col-span-2 lg:col-span-2">
            <FooterLogo />
            <div className="mt-6">
              <SocialLinks />
            </div>
          </div>

          {/* Navigation Sections */}
          {sections.map((section) => (
            <FooterNavSection key={section.title} section={section} />
          ))}

          {/* Contact Info */}
          <ContactInfo />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">
            © {currentYear} San Sebastian Surf School - S4. Todos los derechos
            reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacidad"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Política de privacidad
            </Link>
            <Link
              href="/cookies"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Aviso de cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Default footer sections
const defaultSections: FooterSection[] = [
  {
    title: "Explorar",
    links: [
      { label: "Sobre S4", href: "/nosotros" },
      { label: "Clases de surf", href: "/clases" },
      { label: "Tablas de alquiler", href: "/alquiler" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { label: "San Sebastián · Contacta", href: "/contacto" },
      { label: "Preguntas frecuentes", href: "/faq" },
      { label: "Política de cancelación", href: "/cancelacion" },
    ],
  },
];
