import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-xl border border-gray-600 bg-gray-900 text-gray-100 shadow-sm transition-shadow duration-200 focus:border-brand-action focus:outline-none focus:ring-2 focus:ring-brand-action/20 ' +
                className
            }
            ref={localRef}
        />
    );
});
