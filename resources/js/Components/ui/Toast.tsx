import React, { useEffect, useState } from 'react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function toast(message: string, type: Toast['type'] = 'success') {
    addToastFn?.({ message, type });
}

const typeStyles = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    warning: 'bg-amber-500',
    info: 'bg-indigo-600',
};

export function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        addToastFn = (t) => {
            const id = Math.random().toString(36).slice(2);
            setToasts((prev) => [...prev, { ...t, id }]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((x) => x.id !== id));
            }, 4000);
        };
        return () => { addToastFn = null; };
    }, []);

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" dir="ltr">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`${typeStyles[t.type]} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium
                        pointer-events-auto animate-in slide-in-from-right fade-in duration-300`}
                >
                    {t.message}
                </div>
            ))}
        </div>
    );
}
