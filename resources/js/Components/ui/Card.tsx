import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'lg' }: CardProps) {
    const padMap = { sm: 'p-4', md: 'p-5', lg: 'p-6' };
    return (
        <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 ${padMap[padding]} ${className}`}>
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-5">
            <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
