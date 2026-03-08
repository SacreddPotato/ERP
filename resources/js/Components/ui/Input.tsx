import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
}

export function Input({ label, hint, error, className = '', id, ...props }: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 shadow-sm px-4 py-2.5 text-sm
                    focus:border-indigo-500 focus:ring-indigo-500 transition-colors
                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                    ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
                    ${className}`}
                {...props}
            />
            {hint && !error && <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
    placeholder?: string;
}

export function Select({ label, options, placeholder, className = '', id, ...props }: SelectProps) {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div>
            {label && (
                <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {label}
                </label>
            )}
            <select
                id={selectId}
                className={`w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 shadow-sm px-4 py-2.5 text-sm
                    focus:border-indigo-500 focus:ring-indigo-500 transition-colors
                    ${className}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export function Textarea({ label, className = '', id, ...props }: TextareaProps) {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
        <div>
            {label && (
                <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {label}
                </label>
            )}
            <textarea
                id={textareaId}
                rows={3}
                className={`w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 shadow-sm px-4 py-2.5 text-sm
                    focus:border-indigo-500 focus:ring-indigo-500 transition-colors
                    placeholder:text-slate-400 dark:placeholder:text-slate-500 ${className}`}
                {...props}
            />
        </div>
    );
}
