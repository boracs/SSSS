import { useState } from "react";
import { Link } from "@inertiajs/react";

const ListIcon = ({ className = "" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
);
const SoftboardIcon = ({ className = "" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
    </svg>
);
const HardboardIcon = ({ className = "" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
);

function ToggleMenu({ children, menuItems, variant = "default" }) {
    const [showMenu, setShowMenu] = useState(false);
    const isMega = variant === "mega";

    return (
        <div
            className="relative"
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
        >
            {children}
            {showMenu && (
                <div
                    className={`absolute left-0 top-full z-dropdown -mt-1 pt-1 animate-fade-in-down rounded-xl border-2 border-slate-200 bg-white py-2 shadow-xl ring-1 ring-slate-300/80 min-w-[12rem] ${
                        isMega ? "w-56 py-3" : "left-0 w-52"
                    }`}
                >
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            href={
                                item.params !== undefined
                                    ? route(item.href, item.params)
                                    : route(item.href)
                            }
                            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-800 transition-all duration-300 ease-in-out hover:bg-brand-deep/10 hover:text-brand-deep"
                        >
                            {isMega && item.icon && (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-deep/10 text-brand-deep">
                                    {item.icon}
                                </span>
                            )}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ToggleMenu;
export { ListIcon, SoftboardIcon, HardboardIcon };
