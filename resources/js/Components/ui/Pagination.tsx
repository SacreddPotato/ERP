import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
    t: (key: string) => string;
}

export function Pagination({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [15, 25, 50, 100],
    t,
}: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);

    const getPageNumbers = (): (number | '...')[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | '...')[] = [1];
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
        return pages;
    };

    if (totalItems <= pageSizeOptions[0] && currentPage === 1) return null;

    return (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-2xl flex-wrap">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                    {t('pagination_showing')
                        .replace(':from', String(from))
                        .replace(':to', String(to))
                        .replace(':total', String(totalItems))}
                </span>
                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs px-2 py-1 text-slate-600 dark:text-slate-300 focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                    >
                        {pageSizeOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt} / {t('pagination_page')}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    aria-label="Previous"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {getPageNumbers().map((page, i) =>
                    page === '...' ? (
                        <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                            ...
                        </span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                                page === currentPage
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                            {page}
                        </button>
                    )
                )}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    aria-label="Next"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

/** Slice an array for the current page */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}
