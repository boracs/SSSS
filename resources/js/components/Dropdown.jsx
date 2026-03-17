import { Transition } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { createContext, useContext, useState } from 'react';

const DropDownContext = createContext();

const Dropdown = ({ children }) => {
    const [open, setOpen] = useState(false);

    const toggleOpen = () => {
        setOpen((previousState) => !previousState);
    };

    return (
        <DropDownContext.Provider value={{ open, setOpen, toggleOpen }}>
            <div className="relative">{children}</div>
        </DropDownContext.Provider>
    );
};

const Trigger = ({ children }) => {
    const { toggleOpen } = useContext(DropDownContext);

    return (
        <div onClick={toggleOpen} className="cursor-pointer">
            {children}
        </div>
    );
};

const Overlay = () => {
    const { open, setOpen } = useContext(DropDownContext);
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-dropdown"
            aria-hidden="true"
            onClick={() => setOpen(false)}
        />
    );
};

const Content = ({
    align = 'right',
    width = '48',
    contentClasses = 'py-1 bg-white',
    children,
}) => {
    const { open } = useContext(DropDownContext);

    let alignmentClasses = 'origin-top';

    if (align === 'left') {
        alignmentClasses = 'ltr:origin-top-left rtl:origin-top-right start-0';
    } else if (align === 'right') {
        alignmentClasses = 'ltr:origin-top-right rtl:origin-top-left end-0';
    }

    let widthClasses = '';

    if (width === '48') {
        widthClasses = 'w-48';
    }

    return (
        <>
            <Transition
                show={open}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 -translate-y-2"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-75"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 -translate-y-2"
            >
                <div
                    className={`absolute z-dropdown mt-2 rounded-md shadow-lg ${alignmentClasses} ${widthClasses}`}
                >
                    <div
                        className={
                            `rounded-md ring-1 ring-black ring-opacity-5 ` +
                            contentClasses
                        }
                    >
                        {children}
                    </div>
                </div>
            </Transition>
        </>
    );
};

const DropdownLink = ({ className = '', children, ...props }) => {
    // No pasar onClick al Link: Inertia lo usa para GET/POST. Al hacer click, la navegación
    // cierra el dropdown al cargar la nueva página. Cerrar antes (setOpen) puede desmontar
    // el Link y cancelar la navegación.
    return (
        <Link
            {...props}
            className={
                'block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 transition duration-150 ease-in-out hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ' +
                className
            }
        >
            {children}
        </Link>
    );
};

const DropdownAction = ({ className = '', children, onClick, ...rest }) => {
    const { setOpen } = useContext(DropDownContext);

    const handleClick = (e) => {
        e.preventDefault();
        if (onClick) onClick(e);
        setOpen(false);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className={
                'block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 transition duration-150 ease-in-out hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ' +
                className
            }
            {...rest}
        >
            {children}
        </button>
    );
};

Dropdown.Trigger = Trigger;
Dropdown.Overlay = Overlay;
Dropdown.Content = Content;
Dropdown.Link = DropdownLink;
Dropdown.Action = DropdownAction;

export default Dropdown;
