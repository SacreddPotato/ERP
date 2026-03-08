import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import { ExportPrintModal, ColumnDef } from '../ui/ExportPrintModal';
import api from '../../lib/api';
import { fmtNum, fmtInt, fmtDate, fmtDateTime } from '../../lib/format';
import { TransactionLog, LedgerLog, FACTORIES } from '../../types';

export default function TransactionLogPage() {
    const { t, factory } = useApp();
    const [logSource, setLogSource] = useState<'stock' | 'ledger'>('stock');
    const [stockLogs, setStockLogs] = useState<TransactionLog[]>([]);
    const [ledgerLogs, setLedgerLogs] = useState<LedgerLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Multi-tag search
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [searchMode, setSearchMode] = useState<'AND' | 'OR'>('OR');

    // Filters
    const [filterFactory, setFilterFactory] = useState('');
    const [filterType, setFilterType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [transDateFrom, setTransDateFrom] = useState('');
    const [transDateTo, setTransDateTo] = useState('');
    const [filterDocType, setFilterDocType] = useState('');
    const [filterDocNumber, setFilterDocNumber] = useState('');

    // Sorting — default descending by logged_at
    const [stockSortBy, setStockSortBy] = useState('logged_at');
    const [stockSortDir, setStockSortDir] = useState<'asc' | 'desc'>('desc');
    const [ledgerSortBy, setLedgerSortBy] = useState('logged_at');
    const [ledgerSortDir, setLedgerSortDir] = useState<'asc' | 'desc'>('desc');

    // Export/Print modal
    const [showExport, setShowExport] = useState(false);

    // Reverse modal
    const [reverseTarget, setReverseTarget] = useState<{ id: number; source: 'stock' | 'ledger' } | null>(null);

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (!tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setTagInput('');
        }
    };

    const removeTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const keyword = tags.length > 0 ? tags.join(searchMode === 'AND' ? ' ' : '|') : undefined;
            if (logSource === 'stock') {
                const res = await api.get('/api/transactions/stock', {
                    params: {
                        factory: filterFactory || undefined,
                        keyword,
                        type: filterType || undefined,
                        date_from: dateFrom || undefined,
                        date_to: dateTo || undefined,
                        trans_date_from: transDateFrom || undefined,
                        trans_date_to: transDateTo || undefined,
                        document_type: filterDocType || undefined,
                        document_number: filterDocNumber || undefined,
                    },
                });
                setStockLogs(res.data);
            } else {
                const res = await api.get('/api/transactions/ledger', {
                    params: {
                        keyword,
                        date_from: dateFrom || undefined,
                        date_to: dateTo || undefined,
                        trans_date_from: transDateFrom || undefined,
                        trans_date_to: transDateTo || undefined,
                    },
                });
                setLedgerLogs(res.data);
            }
        } catch { toast(t('sync_failed'), 'error'); }
        setLoading(false);
    }, [logSource, tags, searchMode, filterFactory, filterType, dateFrom, dateTo, transDateFrom, transDateTo, filterDocType, filterDocNumber, t]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    // Client-side tag filtering (AND/OR on all searchable text fields)
    const matchesTags = useCallback((searchableText: string): boolean => {
        if (tags.length === 0) return true;
        const lower = searchableText.toLowerCase();
        if (searchMode === 'AND') {
            return tags.every(tag => lower.includes(tag.toLowerCase()));
        } else {
            return tags.some(tag => lower.includes(tag.toLowerCase()));
        }
    }, [tags, searchMode]);

    const getStockSearchableText = (log: TransactionLog) =>
        [log.item_code, log.item_name, log.transaction_type, log.factory, log.notes, log.supplier, log.document_number].filter(Boolean).join(' ');

    const getLedgerSearchableText = (log: LedgerLog) =>
        [log.entity_code, log.entity_name, log.ledger_type, log.transaction_type, log.statement, log.document_number].filter(Boolean).join(' ');

    // Sorting logic
    const compareValues = (aVal: any, bVal: any, dir: 'asc' | 'desc') => {
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return dir === 'asc' ? -1 : 1;
        if (bVal == null) return dir === 'asc' ? 1 : -1;
        const cmp = typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        return dir === 'asc' ? cmp : -cmp;
    };

    const filteredStockLogs = stockLogs
        .filter(log => matchesTags(getStockSearchableText(log)))
        .sort((a, b) => compareValues((a as any)[stockSortBy], (b as any)[stockSortBy], stockSortDir));

    const filteredLedgerLogs = ledgerLogs
        .filter(log => matchesTags(getLedgerSearchableText(log)))
        .sort((a, b) => compareValues((a as any)[ledgerSortBy], (b as any)[ledgerSortBy], ledgerSortDir));

    const toggleStockSort = (col: string) => {
        if (stockSortBy === col) setStockSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setStockSortBy(col); setStockSortDir('asc'); }
    };

    const toggleLedgerSort = (col: string) => {
        if (ledgerSortBy === col) setLedgerSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setLedgerSortBy(col); setLedgerSortDir('asc'); }
    };

    const StockSortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
        <th
            onClick={() => toggleStockSort(col)}
            className="px-4 py-3.5 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none whitespace-nowrap"
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {stockSortBy === col && <span className="text-indigo-600">{stockSortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
            </span>
        </th>
    );

    const LedgerSortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
        <th
            onClick={() => toggleLedgerSort(col)}
            className="px-4 py-3.5 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 select-none whitespace-nowrap"
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {ledgerSortBy === col && <span className="text-indigo-600">{ledgerSortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
            </span>
        </th>
    );

    const confirmReverse = async () => {
        if (!reverseTarget) return;
        try {
            if (reverseTarget.source === 'stock') {
                await api.post('/api/stock/reverse', { id: reverseTarget.id });
            } else {
                await api.post('/api/ledger/reverse', { id: reverseTarget.id });
            }
            toast(t('reverse_success'), 'success');
            setReverseTarget(null);
            fetchLogs();
        } catch (e: any) {
            toast(e.response?.data?.message || t('reverse_failed'), 'error');
        }
    };

    const clearFilters = () => {
        setTags([]); setTagInput(''); setFilterFactory(''); setFilterType('');
        setDateFrom(''); setDateTo(''); setTransDateFrom(''); setTransDateTo('');
        setFilterDocType(''); setFilterDocNumber('');
    };

    const factoryOptions = [{ value: '', label: t('all_locations') }, ...FACTORIES.map(f => ({ value: f.value, label: t(f.labelKey) }))];

    const stockExportColumns: ColumnDef[] = [
        { key: 'logged_at', label: t('th_logged_at'), render: (v) => fmtDateTime(v) },
        { key: 'transaction_date', label: t('th_trans_date'), render: (v) => fmtDate(v) },
        { key: 'item_code', label: t('th_item_id') },
        { key: 'item_name', label: t('th_item_name') },
        { key: 'transaction_type', label: t('th_type') },
        { key: 'quantity', label: t('th_quantity'), render: (v) => fmtInt(v) },
        { key: 'previous_stock', label: t('th_prev_stock'), render: (v) => fmtInt(v) },
        { key: 'new_stock', label: t('th_new_stock'), render: (v) => fmtInt(v) },
        { key: 'factory', label: t('th_location') },
        { key: 'notes', label: t('th_notes'), render: (v) => v || '' },
    ];

    const ledgerExportColumns: ColumnDef[] = [
        { key: 'logged_at', label: t('th_logged_at'), render: (v) => fmtDateTime(v) },
        { key: 'transaction_date', label: t('th_trans_date'), render: (v) => fmtDate(v) },
        { key: 'ledger_type', label: t('th_type') },
        { key: 'entity_code', label: t('th_id') },
        { key: 'entity_name', label: t('th_name') },
        { key: 'debit', label: t('th_debit'), render: (v) => fmtNum(v) },
        { key: 'credit', label: t('th_credit'), render: (v) => fmtNum(v) },
        { key: 'new_balance', label: t('th_balance'), render: (v) => fmtNum(v) },
        { key: 'statement', label: t('th_statement'), render: (v) => v || '' },
    ];

    return (
        <div className="space-y-6">
            {/* Source Toggle */}
            <div className="flex items-center gap-2">
                <Button
                    variant={logSource === 'stock' ? 'primary' : 'secondary'}
                    onClick={() => { setLogSource('stock'); clearFilters(); }}
                >
                    {t('log_source_stock')}
                </Button>
                <Button
                    variant={logSource === 'ledger' ? 'primary' : 'secondary'}
                    onClick={() => { setLogSource('ledger'); clearFilters(); }}
                >
                    {t('log_source_all_ledger')}
                </Button>
            </div>

            {/* Filters */}
            <Card>
                {/* Multi-tag search */}
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
                                        <button
                                            type="button"
                                            onClick={() => removeTag(i)}
                                            className="ml-0.5 text-indigo-400 dark:text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                            aria-label={t('remove_tag')}
                                        >
                                            &times;
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    placeholder={tags.length === 0 ? t('placeholder_keyword_search') : ''}
                                    className="flex-1 min-w-[120px] border-0 p-0 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 focus:outline-none bg-transparent"
                                />
                            </div>
                        </div>
                        {/* AND/OR toggle */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('search_mode_label')}:</span>
                            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                                <button
                                    type="button"
                                    onClick={() => setSearchMode('AND')}
                                    className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                                        searchMode === 'AND'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {t('search_mode_and')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSearchMode('OR')}
                                    className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                                        searchMode === 'OR'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {t('search_mode_or')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {logSource === 'stock' && (
                        <Select label={t('filter_location')} options={factoryOptions} value={filterFactory} onChange={(e) => setFilterFactory(e.target.value)} />
                    )}
                    <Input label={t('filter_date_from')} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <Input label={t('filter_date_to')} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    <Input label={t('filter_trans_date_from')} type="date" value={transDateFrom} onChange={(e) => setTransDateFrom(e.target.value)} />
                    <Input label={t('filter_trans_date_to')} type="date" value={transDateTo} onChange={(e) => setTransDateTo(e.target.value)} />
                    {logSource === 'stock' && (
                        <Input label={t('filter_document_number')} value={filterDocNumber} onChange={(e) => setFilterDocNumber(e.target.value)} placeholder={t('placeholder_search_doc_number')} />
                    )}
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="ghost" onClick={clearFilters}>{t('btn_clear')}</Button>
                    <Button variant="ghost" onClick={() => setShowExport(true)}>{t('btn_export')}</Button>
                    <Button variant="ghost" onClick={() => setShowExport(true)}>{t('btn_print')}</Button>
                    <Button onClick={fetchLogs} loading={loading}>{t('btn_apply')}</Button>
                </div>
            </Card>

            {/* Stock Transaction Table */}
            {logSource === 'stock' && (
                <Card padding="sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <StockSortHeader col="logged_at">{t('th_logged_at')}</StockSortHeader>
                                    <StockSortHeader col="transaction_date">{t('th_trans_date')}</StockSortHeader>
                                    <StockSortHeader col="item_code">{t('th_item_id')}</StockSortHeader>
                                    <StockSortHeader col="item_name">{t('th_item_name')}</StockSortHeader>
                                    <StockSortHeader col="transaction_type">{t('th_type')}</StockSortHeader>
                                    <StockSortHeader col="quantity">{t('th_quantity')}</StockSortHeader>
                                    <StockSortHeader col="previous_stock">{t('th_prev_stock')}</StockSortHeader>
                                    <StockSortHeader col="new_stock">{t('th_new_stock')}</StockSortHeader>
                                    <StockSortHeader col="factory">{t('th_location')}</StockSortHeader>
                                    <StockSortHeader col="notes">{t('th_notes')}</StockSortHeader>
                                    <th className="px-4 py-3.5 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredStockLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDateTime(log.logged_at)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(log.transaction_date)}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-indigo-600">{log.item_code}</td>
                                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{log.item_name}</td>
                                        <td className="px-4 py-3"><Badge>{log.transaction_type}</Badge></td>
                                        <td className="px-4 py-3 text-sm font-medium dark:text-slate-100 text-center">{fmtInt(log.quantity)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">{fmtInt(log.previous_stock)}</td>
                                        <td className="px-4 py-3 text-sm font-bold dark:text-slate-100 text-center">{fmtInt(log.new_stock)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{log.factory}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{log.notes || '-'}</td>
                                        <td className="px-4 py-3">
                                            <Button size="xs" variant="ghost" onClick={() => setReverseTarget({ id: log.id, source: 'stock' })} className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                                {t('btn_reverse')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStockLogs.length === 0 && (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">{t('no_transactions')}</div>
                        )}
                    </div>
                    {filteredStockLogs.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                            {t('showing_transactions').replace(':count', String(filteredStockLogs.length))}
                        </div>
                    )}
                </Card>
            )}

            {/* Ledger Transaction Table */}
            {logSource === 'ledger' && (
                <Card padding="sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <LedgerSortHeader col="logged_at">{t('th_logged_at')}</LedgerSortHeader>
                                    <LedgerSortHeader col="transaction_date">{t('th_trans_date')}</LedgerSortHeader>
                                    <LedgerSortHeader col="ledger_type">{t('th_type')}</LedgerSortHeader>
                                    <LedgerSortHeader col="entity_code">{t('th_id')}</LedgerSortHeader>
                                    <LedgerSortHeader col="entity_name">{t('th_name')}</LedgerSortHeader>
                                    <LedgerSortHeader col="debit">{t('th_debit')}</LedgerSortHeader>
                                    <LedgerSortHeader col="credit">{t('th_credit')}</LedgerSortHeader>
                                    <LedgerSortHeader col="new_balance">{t('th_balance')}</LedgerSortHeader>
                                    <LedgerSortHeader col="statement">{t('th_statement')}</LedgerSortHeader>
                                    <th className="px-4 py-3.5 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredLedgerLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDateTime(log.logged_at)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(log.transaction_date)}</td>
                                        <td className="px-4 py-3"><Badge variant="info">{log.ledger_type}</Badge></td>
                                        <td className="px-4 py-3 text-sm font-medium text-indigo-600">{log.entity_code}</td>
                                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{log.entity_name}</td>
                                        <td className="px-4 py-3 text-sm text-emerald-600 font-medium">{fmtNum(log.debit)}</td>
                                        <td className="px-4 py-3 text-sm text-red-500 font-medium">{fmtNum(log.credit)}</td>
                                        <td className="px-4 py-3 text-sm font-bold dark:text-slate-100">{fmtNum(log.new_balance)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{log.statement || '-'}</td>
                                        <td className="px-4 py-3">
                                            <Button size="xs" variant="ghost" onClick={() => setReverseTarget({ id: log.id, source: 'ledger' })} className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                                {t('btn_reverse')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredLedgerLogs.length === 0 && (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">{t('no_transactions')}</div>
                        )}
                    </div>
                    {filteredLedgerLogs.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                            {t('showing_transactions').replace(':count', String(filteredLedgerLogs.length))}
                        </div>
                    )}
                </Card>
            )}

            {/* Export/Print Modal */}
            <ExportPrintModal
                open={showExport}
                onClose={() => setShowExport(false)}
                title={logSource === 'stock' ? t('log_source_stock') : t('log_source_all_ledger')}
                columns={logSource === 'stock' ? stockExportColumns : ledgerExportColumns}
                data={logSource === 'stock' ? filteredStockLogs : filteredLedgerLogs}
                filename={`transactions_${logSource}`}
                t={t}
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
