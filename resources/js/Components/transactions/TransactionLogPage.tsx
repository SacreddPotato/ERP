import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import { ExportPrintModal, ColumnDef } from '../ui/ExportPrintModal';
import { Pagination } from '../ui/Pagination';
import { DatePickerInput } from '../ui/DatePickerInput';
import api from '../../lib/api';
import { fmtNum, fmtInt, fmtDate, fmtDateTime } from '../../lib/format';
import { TransactionLog, LedgerLog, FACTORIES } from '../../types';

type LogCategory = 'all' | 'stock' | 'customer' | 'supplier' | 'treasury' | 'covenant' | 'advance';

interface UnifiedLog {
    id: number;
    source: 'stock' | 'ledger';
    logged_at: string;
    transaction_date: string | null;
    category: string;
    action: string;
    code: string;
    name: string;
    quantity: number | null;
    debit: number | null;
    credit: number | null;
    prev_value: number;
    new_value: number;
    factory: string | null;
    detail: string | null;
    document_number: string | null;
    payment_method: string | null;
    is_reversed: boolean;
    _change: number;
}

const LOG_CATEGORIES: { id: LogCategory; key: string; icon: string }[] = [
    { id: 'all', key: 'log_cat_all', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'stock', key: 'log_cat_stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'customer', key: 'log_cat_customer', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'supplier', key: 'log_cat_supplier', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'treasury', key: 'log_cat_treasury', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'covenant', key: 'log_cat_covenant', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'advance', key: 'log_cat_advance', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    stock: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
    customer: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
    supplier: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
    treasury: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
    covenant: { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400' },
    advance: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
};

function stockToUnified(log: TransactionLog): UnifiedLog {
    return {
        id: log.id, source: 'stock', logged_at: log.logged_at, transaction_date: log.transaction_date,
        category: 'stock', action: log.transaction_type, code: log.item_code, name: log.item_name,
        quantity: log.quantity, debit: null, credit: null,
        prev_value: log.previous_stock, new_value: log.new_stock,
        factory: log.factory, detail: log.notes, document_number: log.document_number,
        payment_method: null, is_reversed: (log.notes ?? '').includes('[REVERSED]'),
        _change: log.quantity ?? 0,
    };
}

function ledgerToUnified(log: LedgerLog): UnifiedLog {
    return {
        id: log.id, source: 'ledger', logged_at: log.logged_at, transaction_date: log.transaction_date,
        category: log.ledger_type, action: log.transaction_type, code: log.entity_code, name: log.entity_name,
        quantity: null, debit: log.debit, credit: log.credit,
        prev_value: log.previous_balance, new_value: log.new_balance,
        factory: null, detail: log.statement, document_number: log.document_number,
        payment_method: log.payment_method, is_reversed: (log.statement ?? '').includes('[REVERSED]'),
        _change: (Number(log.debit) || 0) - (Number(log.credit) || 0),
    };
}

export default function TransactionLogPage() {
    const { t } = useApp();
    const [category, setCategory] = useState<LogCategory>('all');
    const [stockLogs, setStockLogs] = useState<TransactionLog[]>([]);
    const [ledgerLogs, setLedgerLogs] = useState<LedgerLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalItems, setTotalItems] = useState(0);

    // Multi-tag search
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [searchMode, setSearchMode] = useState<'AND' | 'OR'>('OR');

    // Filters
    const [filterFactory, setFilterFactory] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [transDateFrom, setTransDateFrom] = useState('');
    const [transDateTo, setTransDateTo] = useState('');
    const [filterDocNumber, setFilterDocNumber] = useState('');

    // Sorting
    const [sortBy, setSortBy] = useState('logged_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Export/Print
    const [showExport, setShowExport] = useState(false);

    // Reverse modal
    const [reverseTarget, setReverseTarget] = useState<{ id: number; source: 'stock' | 'ledger' } | null>(null);

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (!tags.includes(newTag)) setTags([...tags, newTag]);
            setTagInput('');
            setPage(1);
        }
    };

    const removeTag = (index: number) => { setTags(tags.filter((_, i) => i !== index)); setPage(1); };

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const keyword = tags.length > 0 ? tags.join(searchMode === 'AND' ? ' ' : '|') : undefined;
            const needsStock = category === 'all' || category === 'stock';
            const needsLedger = category === 'all' || category !== 'stock';

            const promises: Promise<any>[] = [];

            if (needsStock) {
                promises.push(api.get('/api/transactions/stock', {
                    params: {
                        page,
                        per_page: pageSize,
                        factory: filterFactory || undefined,
                        keyword,
                        date_from: dateFrom || undefined,
                        date_to: dateTo || undefined,
                        trans_date_from: transDateFrom || undefined,
                        trans_date_to: transDateTo || undefined,
                        document_number: filterDocNumber || undefined,
                    },
                }));
            } else {
                promises.push(Promise.resolve({ data: { data: [], total: 0 } }));
            }

            if (needsLedger) {
                const ledgerType = category !== 'all' ? (category as string) : undefined;
                promises.push(api.get('/api/transactions/ledger', {
                    params: {
                        page,
                        per_page: pageSize,
                        keyword,
                        ledger_type: ledgerType,
                        date_from: dateFrom || undefined,
                        date_to: dateTo || undefined,
                        trans_date_from: transDateFrom || undefined,
                        trans_date_to: transDateTo || undefined,
                    },
                }));
            } else {
                promises.push(Promise.resolve({ data: { data: [], total: 0 } }));
            }

            const [stockRes, ledgerRes] = await Promise.all(promises);
            const stockPayload = stockRes.data as { data: TransactionLog[]; total: number };
            const ledgerPayload = ledgerRes.data as { data: LedgerLog[]; total: number };
            setStockLogs(stockPayload.data);
            setLedgerLogs(ledgerPayload.data);
            setTotalItems(stockPayload.total + ledgerPayload.total);
        } catch { toast(t('sync_failed'), 'error'); }
        setLoading(false);
    }, [category, tags, searchMode, filterFactory, dateFrom, dateTo, transDateFrom, transDateTo, filterDocNumber, page, pageSize, t]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // Unified logs
    const unifiedLogs: UnifiedLog[] = [
        ...stockLogs.map(stockToUnified),
        ...ledgerLogs.map(ledgerToUnified),
    ];

    // Client-side tag filtering
    const matchesTags = useCallback((searchableText: string): boolean => {
        if (tags.length === 0) return true;
        const lower = searchableText.toLowerCase();
        return searchMode === 'AND'
            ? tags.every(tag => lower.includes(tag.toLowerCase()))
            : tags.some(tag => lower.includes(tag.toLowerCase()));
    }, [tags, searchMode]);

    const getSearchableText = (log: UnifiedLog) =>
        [log.code, log.name, log.category, log.action, log.factory, log.detail, log.document_number, log.payment_method].filter(Boolean).join(' ');

    // Sort
    const compareValues = (aVal: any, bVal: any, dir: 'asc' | 'desc') => {
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return dir === 'asc' ? -1 : 1;
        if (bVal == null) return dir === 'asc' ? 1 : -1;
        const cmp = typeof aVal === 'number' && typeof bVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
        return dir === 'asc' ? cmp : -cmp;
    };

    const filteredLogs = unifiedLogs
        .filter(log => matchesTags(getSearchableText(log)))
        .sort((a, b) => compareValues((a as any)[sortBy], (b as any)[sortBy], sortDir));

    const toggleSort = (col: string) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };

    const SortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
        <th
            onClick={() => toggleSort(col)}
            className="px-4 py-3.5 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none whitespace-nowrap"
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {sortBy === col && <span className="text-indigo-600">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
            </span>
        </th>
    );

    const confirmReverse = async () => {
        if (!reverseTarget) return;
        try {
            await api.post('/api/transactions/reverse', {
                log_type: reverseTarget.source,
                id: reverseTarget.id,
            });
            toast(t('reverse_success'), 'success');
            setReverseTarget(null);
            fetchLogs();
        } catch (e: any) {
            toast(e.response?.data?.message || t('reverse_failed'), 'error');
        }
    };

    const clearFilters = () => {
        setTags([]); setTagInput(''); setFilterFactory('');
        setDateFrom(''); setDateTo(''); setTransDateFrom(''); setTransDateTo('');
        setFilterDocNumber(''); setPage(1);
    };

    const formatChange = (log: UnifiedLog): React.ReactNode => {
        if (log.source === 'stock') {
            const qty = log.quantity ?? 0;
            if (qty === 0) return <span className="text-slate-400">-</span>;
            return <span className="font-medium tabular-nums">{fmtInt(qty)}</span>;
        }
        const d = log.debit ?? 0;
        const c = log.credit ?? 0;
        if (d === 0 && c === 0) return <span className="text-slate-400">-</span>;
        return (
            <span className="tabular-nums">
                {d > 0 && <span className="text-emerald-600 font-medium">{fmtNum(d)}</span>}
                {d > 0 && c > 0 && <span className="text-slate-400 mx-1">/</span>}
                {c > 0 && <span className="text-red-500 font-medium">{fmtNum(c)}</span>}
            </span>
        );
    };

    const formatBalance = (log: UnifiedLog) => {
        if (log.source === 'stock') return fmtInt(log.new_value);
        return fmtNum(log.new_value);
    };

    const getCategoryLabel = (cat: string) => {
        const key = `log_cat_${cat}`;
        return t(key) || cat;
    };

    // Clean detail: strip [REVERSED], [DELETED_ITEM:...], [DELETED_ENTITY:...]
    const cleanDetail = (detail: string | null): string => {
        if (!detail) return '-';
        return detail
            .replace(/\[REVERSED\]/g, '')
            .replace(/\[DELETED_ITEM:[^\]]+\]/g, '')
            .replace(/\[DELETED_ENTITY:[^\]]+\]/g, '')
            .trim() || '-';
    };

    const getExportColumns = (): ColumnDef[] => {
        const common: ColumnDef[] = [
            { key: 'logged_at', label: t('th_logged_at'), render: (v) => fmtDateTime(v) },
            { key: 'transaction_date', label: t('th_trans_date'), render: (v) => fmtDate(v) },
        ];

        if (category === 'stock') {
            return [
                ...common,
                { key: 'action', label: t('th_action') },
                { key: 'code', label: t('th_code') },
                { key: 'name', label: t('th_name') },
                { key: 'factory', label: t('th_factory') },
                { key: 'quantity', label: t('th_quantity'), render: (v) => v != null ? fmtInt(v) : '-', summable: true },
                { key: 'new_value', label: t('th_stock'), render: (v) => fmtInt(v), summable: true },
                { key: 'detail', label: t('th_detail'), render: (v: any) => cleanDetail(v) },
            ];
        }

        if (category !== 'all') {
            return [
                ...common,
                { key: 'action', label: t('th_action') },
                { key: 'code', label: t('th_code') },
                { key: 'name', label: t('th_name') },
                { key: 'document_number', label: t('th_document_number'), render: (v) => v || '-' },
                { key: 'payment_method', label: t('th_payment_method'), render: (v) => v || '-' },
                { key: 'debit', label: t('th_debit'), render: (v) => { const n = Number(v) || 0; return n > 0 ? fmtNum(n) : '-'; }, summable: true },
                { key: 'credit', label: t('th_credit'), render: (v) => { const n = Number(v) || 0; return n > 0 ? fmtNum(n) : '-'; }, summable: true },
                { key: 'prev_value', label: t('th_previous_balance'), render: (v) => fmtNum(v), summable: true },
                { key: 'new_value', label: t('th_balance'), render: (v) => fmtNum(v), summable: true },
                { key: 'detail', label: t('th_detail'), render: (v: any) => cleanDetail(v) },
            ];
        }

        // "all" view
        return [
            ...common,
            { key: 'category', label: t('th_module') },
            { key: 'action', label: t('th_action') },
            { key: 'code', label: t('th_code') },
            { key: 'name', label: t('th_name') },
            {
                key: '_change',
                label: t('th_change'),
                summable: true,
                render: (_v: any, row: any) => {
                    if (!row.source) {
                        const v = Number(_v) || 0;
                        return v === 0 ? '-' : fmtNum(v);
                    }
                    if (row.source === 'stock') {
                        const qty = Number(row.quantity) || 0;
                        return qty === 0 ? '-' : fmtInt(qty);
                    }
                    const d = Number(row.debit) || 0;
                    const c = Number(row.credit) || 0;
                    if (d === 0 && c === 0) return '-';
                    const parts: string[] = [];
                    if (d > 0) parts.push(fmtNum(d));
                    if (c > 0) parts.push(fmtNum(c));
                    return parts.join(' / ');
                },
            },
            { key: 'new_value', label: t('th_balance'), render: (v) => fmtNum(v), summable: true },
            { key: 'detail', label: t('th_detail'), render: (v: any) => cleanDetail(v) },
        ];
    };

    const exportColumns = getExportColumns();

    interface TableColumn {
        key: string;
        label: string;
        sortable: boolean;
    }

    const getTableColumns = (): TableColumn[] => {
        const common: TableColumn[] = [
            { key: 'logged_at', label: t('th_logged_at'), sortable: true },
            { key: 'transaction_date', label: t('th_trans_date'), sortable: true },
        ];

        if (category === 'stock') {
            return [
                ...common,
                { key: 'action', label: t('th_action'), sortable: true },
                { key: 'code', label: t('th_code'), sortable: true },
                { key: 'name', label: t('th_name'), sortable: true },
                { key: 'factory', label: t('th_factory'), sortable: true },
                { key: 'quantity', label: t('th_quantity'), sortable: true },
                { key: 'new_value', label: t('th_stock'), sortable: true },
                { key: 'detail', label: t('th_detail'), sortable: false },
                { key: '_actions', label: t('th_actions'), sortable: false },
            ];
        }

        if (category !== 'all') {
            // Ledger-specific view
            return [
                ...common,
                { key: 'action', label: t('th_action'), sortable: true },
                { key: 'code', label: t('th_code'), sortable: true },
                { key: 'name', label: t('th_name'), sortable: true },
                { key: 'document_number', label: t('th_document_number'), sortable: true },
                { key: 'payment_method', label: t('th_payment_method'), sortable: true },
                { key: 'debit', label: t('th_debit'), sortable: true },
                { key: 'credit', label: t('th_credit'), sortable: true },
                { key: 'prev_value', label: t('th_previous_balance'), sortable: true },
                { key: 'new_value', label: t('th_balance'), sortable: true },
                { key: 'detail', label: t('th_detail'), sortable: false },
                { key: '_actions', label: t('th_actions'), sortable: false },
            ];
        }

        // "all" view
        return [
            ...common,
            { key: 'category', label: t('th_module'), sortable: true },
            { key: 'action', label: t('th_action'), sortable: true },
            { key: 'code', label: t('th_code'), sortable: true },
            { key: 'name', label: t('th_name'), sortable: true },
            { key: '_change', label: t('th_change'), sortable: false },
            { key: 'new_value', label: t('th_balance'), sortable: true },
            { key: 'detail', label: t('th_detail'), sortable: false },
            { key: '_actions', label: t('th_actions'), sortable: false },
        ];
    };

    const tableColumns = getTableColumns();

    const renderCell = (log: UnifiedLog, col: TableColumn): React.ReactNode => {
        const colors = CATEGORY_COLORS[log.category] || CATEGORY_COLORS.stock;
        switch (col.key) {
            case 'logged_at':
                return <td key={col.key} className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDateTime(log.logged_at)}</td>;
            case 'transaction_date':
                return <td key={col.key} className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(log.transaction_date)}</td>;
            case 'category':
                return (
                    <td key={col.key} className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {getCategoryLabel(log.category)}
                        </span>
                    </td>
                );
            case 'action':
                return (
                    <td key={col.key} className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 ${log.is_reversed ? 'line-through' : ''}`}>
                            <Badge>{log.action}</Badge>
                            {log.is_reversed && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                    {t('reversed_label')}
                                </span>
                            )}
                        </span>
                    </td>
                );
            case 'code':
                return <td key={col.key} className="px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400">{log.code}</td>;
            case 'name':
                return <td key={col.key} className={`px-4 py-3 text-sm text-slate-900 dark:text-slate-100 ${log.is_reversed ? 'line-through' : ''}`}>{log.name}</td>;
            case '_change':
                return <td key={col.key} className="px-4 py-3 text-sm">{formatChange(log)}</td>;
            case 'new_value':
                return <td key={col.key} className="px-4 py-3 text-sm font-bold dark:text-slate-100 tabular-nums">{formatBalance(log)}</td>;
            case 'prev_value':
                return <td key={col.key} className="px-4 py-3 text-sm dark:text-slate-100 tabular-nums">{fmtNum(log.prev_value)}</td>;
            case 'detail':
                return <td key={col.key} className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[180px] truncate" title={cleanDetail(log.detail)}>{cleanDetail(log.detail)}</td>;
            case 'document_number':
                return <td key={col.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{log.document_number || '-'}</td>;
            case 'payment_method':
                return <td key={col.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{log.payment_method || '-'}</td>;
            case 'debit':
                return (
                    <td key={col.key} className="px-4 py-3 text-sm tabular-nums">
                        {(log.debit ?? 0) > 0
                            ? <span className="text-emerald-600 font-medium">{fmtNum(log.debit!)}</span>
                            : <span className="text-slate-400">-</span>
                        }
                    </td>
                );
            case 'credit':
                return (
                    <td key={col.key} className="px-4 py-3 text-sm tabular-nums">
                        {(log.credit ?? 0) > 0
                            ? <span className="text-red-500 font-medium">{fmtNum(log.credit!)}</span>
                            : <span className="text-slate-400">-</span>
                        }
                    </td>
                );
            case 'factory':
                return <td key={col.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{log.factory || '-'}</td>;
            case 'quantity':
                return (
                    <td key={col.key} className="px-4 py-3 text-sm tabular-nums">
                        {log.quantity != null
                            ? <span className="font-medium">{fmtInt(log.quantity)}</span>
                            : <span className="text-slate-400">-</span>
                        }
                    </td>
                );
            case '_actions':
                return (
                    <td key={col.key} className="px-4 py-3">
                        {!log.is_reversed ? (
                            <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setReverseTarget({ id: log.id, source: log.source })}
                                className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                                {t('btn_reverse')}
                            </Button>
                        ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-600 italic">{t('reversed_label')}</span>
                        )}
                    </td>
                );
            default:
                return <td key={col.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{(log as any)[col.key] ?? '-'}</td>;
        }
    };

    const showFactoryFilter = category === 'all' || category === 'stock';

    return (
        <div className="space-y-6">
            {/* Category Selector */}
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                {LOG_CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => { setCategory(cat.id); clearFilters(); setPage(1); }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                            category === cat.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                        </svg>
                        {t(cat.key)}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <Card>
                {/* Tag Search */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('filter_keyword')}</label>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <div className="flex flex-wrap items-center gap-1.5 min-h-[42px] px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                                {tags.map((tag, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium border border-indigo-100 dark:border-indigo-800"
                                    >
                                        {tag}
                                        <button type="button" onClick={() => removeTag(i)} className="ml-0.5 text-indigo-400 dark:text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors" aria-label={t('remove_tag')}>&times;</button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    placeholder={tags.length === 0 ? t('placeholder_keyword_search') : ''}
                                    className="tag-search-input flex-1 min-w-[120px] p-0 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 focus:outline-none bg-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('search_mode_label')}:</span>
                            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                                <button type="button" onClick={() => setSearchMode('AND')} className={`px-3 py-1.5 text-xs font-semibold transition-all ${searchMode === 'AND' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>{t('search_mode_and')}</button>
                                <button type="button" onClick={() => setSearchMode('OR')} className={`px-3 py-1.5 text-xs font-semibold transition-all ${searchMode === 'OR' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>{t('search_mode_or')}</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Factory Pills (only for stock-related views) */}
                {showFactoryFilter && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('filter_location')}</label>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setFilterFactory('')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    filterFactory === ''
                                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                {t('all_locations')}
                            </button>
                            {FACTORIES.map(f => (
                                <button
                                    key={f.value}
                                    type="button"
                                    onClick={() => setFilterFactory(f.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        filterFactory === f.value
                                            ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {t(f.labelKey)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <DatePickerInput label={t('filter_date_from')} value={dateFrom} onChange={setDateFrom} />
                    <DatePickerInput label={t('filter_date_to')} value={dateTo} onChange={setDateTo} />
                    <DatePickerInput label={t('filter_trans_date_from')} value={transDateFrom} onChange={setTransDateFrom} />
                    <DatePickerInput label={t('filter_trans_date_to')} value={transDateTo} onChange={setTransDateTo} />
                    <Input label={t('filter_document_number')} value={filterDocNumber} onChange={(e) => setFilterDocNumber(e.target.value)} placeholder={t('placeholder_search_doc_number')} />
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="ghost" onClick={clearFilters}>{t('btn_clear')}</Button>
                    <Button variant="ghost" onClick={() => setShowExport(true)}>{t('btn_export')}</Button>
                    <Button variant="ghost" onClick={() => setShowExport(true)}>{t('btn_print')}</Button>
                    <Button onClick={fetchLogs} loading={loading}>{t('btn_apply')}</Button>
                </div>
            </Card>

            {/* Unified Activity Table */}
            <Card padding="sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                {tableColumns.map((col) =>
                                    col.sortable ? (
                                        <SortHeader key={col.key} col={col.key}>{col.label}</SortHeader>
                                    ) : (
                                        <th
                                            key={col.key}
                                            className={`px-4 py-3.5 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider${col.key === 'detail' ? ' max-w-[180px]' : ''}`}
                                        >
                                            {col.label}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredLogs.map((log) => (
                                <tr
                                    key={`${log.source}-${log.id}`}
                                    className={`transition-colors ${
                                        log.is_reversed
                                            ? 'opacity-50'
                                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    {tableColumns.map((col) => renderCell(log, col))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLogs.length === 0 && (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">{t('no_activity')}</div>
                    )}
                </div>
                {filteredLogs.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        {t('showing_activity').replace(':count', String(totalItems))}
                    </div>
                )}
                <Pagination
                    currentPage={page}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                    t={t}
                />
            </Card>

            {/* Export/Print Modal */}
            <ExportPrintModal
                open={showExport}
                onClose={() => setShowExport(false)}
                title={t('activity_log')}
                columns={exportColumns}
                data={filteredLogs}
                filename="activity_log"
                t={t}
                onFetchAll={async () => {
                    const keyword = tags.length > 0 ? tags.join(searchMode === 'AND' ? ' ' : '|') : undefined;
                    const needsStockAll = category === 'all' || category === 'stock';
                    const needsLedgerAll = category === 'all' || category !== 'stock';
                    const ledgerTypeAll = category !== 'all' && category !== 'stock' ? (category as string) : undefined;

                    const allPromises: Promise<any>[] = [];

                    if (needsStockAll) {
                        allPromises.push(api.get('/api/transactions/stock', {
                            params: {
                                page: 1,
                                per_page: 999999,
                                factory: filterFactory || undefined,
                                keyword,
                                date_from: dateFrom || undefined,
                                date_to: dateTo || undefined,
                                trans_date_from: transDateFrom || undefined,
                                trans_date_to: transDateTo || undefined,
                                document_number: filterDocNumber || undefined,
                            },
                        }));
                    } else {
                        allPromises.push(Promise.resolve({ data: { data: [] } }));
                    }

                    if (needsLedgerAll) {
                        allPromises.push(api.get('/api/transactions/ledger', {
                            params: {
                                page: 1,
                                per_page: 999999,
                                keyword,
                                ledger_type: ledgerTypeAll,
                                date_from: dateFrom || undefined,
                                date_to: dateTo || undefined,
                                trans_date_from: transDateFrom || undefined,
                                trans_date_to: transDateTo || undefined,
                            },
                        }));
                    } else {
                        allPromises.push(Promise.resolve({ data: { data: [] } }));
                    }

                    const [stockAll, ledgerAll] = await Promise.all(allPromises);
                    const allStockData = (stockAll.data as { data: TransactionLog[] }).data;
                    const allLedgerData = (ledgerAll.data as { data: LedgerLog[] }).data;

                    const unified: UnifiedLog[] = [
                        ...allStockData.map(stockToUnified),
                        ...allLedgerData.map(ledgerToUnified),
                    ];

                    return unified
                        .filter(log => matchesTags(getSearchableText(log)))
                        .sort((a, b) => compareValues((a as any)[sortBy], (b as any)[sortBy], sortDir));
                }}
            />

            {/* Reverse Confirmation Modal */}
            <Modal open={!!reverseTarget} onClose={() => setReverseTarget(null)} title={t('confirm_reverse_title')}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{t('confirm_reverse_message')}</p>
                <p className="text-xs text-amber-600 mb-4">{t('confirm_reverse_warning')}</p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setReverseTarget(null)}>{t('btn_cancel')}</Button>
                    <Button variant="danger" onClick={confirmReverse}>{t('btn_confirm')}</Button>
                </div>
            </Modal>
        </div>
    );
}
