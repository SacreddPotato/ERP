import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerInputProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    hint?: string;
}

export function DatePickerInput({ label, value, onChange, placeholder, id, hint }: DatePickerInputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const parseDate = (v: string): Date | null => {
        if (!v) return null;
        // Handle ISO datetime strings (e.g. "2024-01-15T00:00:00.000000Z")
        const dateStr = v.includes('T') ? v.split('T')[0] : v;
        const parts = dateStr.split('-').map(Number);
        if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        return null;
    };

    const formatDate = (date: Date | null): string => {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    return (
        <div>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {label}
                </label>
            )}
            <DatePicker
                id={inputId}
                selected={parseDate(value)}
                onChange={(date: Date | null) => onChange(formatDate(date))}
                dateFormat="yyyy-MM-dd"
                placeholderText={placeholder || 'YYYY-MM-DD'}
                isClearable
                className="w-full rounded-xl shadow-sm px-4 py-2.5 text-sm transition-colors"
                wrapperClassName="w-full"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
            />
            {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        </div>
    );
}
