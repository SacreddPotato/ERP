import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const badgeVariants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${badgeVariants[variant]}`}>
            {children}
        </span>
    );
}
