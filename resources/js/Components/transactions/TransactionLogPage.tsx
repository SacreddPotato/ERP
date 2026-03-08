import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import api from '../../lib/api';
import { TransactionLog, LedgerLog, FACTORIES } from '../../types';

export default function TransactionLogPage() {
    const { t, factory } = useApp();
    const [logSource, setLogSource] = useState<'stock' | 'ledger'>('stock');
    const [stockLogs, setStockLogs] = useState<TransactionLog[]>([]);
    const [ledgerLogs, setLedgerLogs] = useState<LedgerLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [keyword, setKeyword] = useState('');
    const [filterFactory, setFilterFactory] = useState('');
    const [filterType, setFilterType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [transDateFrom, setTransDateFrom] = useState('');
    const [transDateTo, setTransDateTo] = useState('');
    const [filterDocType, setFilterDocType] = useState('');
    const [filterDocNumber, setFilterDocNumber] = useState('');

    // Reverse modal
    const [reverseTarget, setReverseTarget] = useState<{ id: number; source: 'stock' | 'ledger' } | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            if (logSource === 'stock') {
                const res = await api.get('/api/transactions/stock', {
                    params: {
                        factory: filterFactory || undefined,
                        keyword: keyword || undefined,
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
                        keyword: keyword || undefined,
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
    }, [logSource, keyword, filterFactory, filterType, dateFrom, dateTo, transDateFrom, transDateTo, filterDocType, filterDocNumber, t]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

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
        setKeyword(''); setFilterFactory(''); setFilterType('');
        setDateFrom(''); setDateTo(''); setTransDateFrom(''); setTransDateTo('');
        setFilterDocType(''); setFilterDocNumber('');
    };

    const factoryOptions = [{ value: '', label: t('all_locations') }, ...FACTORIES.map(f => ({ value: f.value, label: t(f.labelKey) }))];

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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Input placeholder={t('placeholder_keyword_search')} value={keyword} onChange={(e) => setKeyword(e.target.value)} label={t('filter_keyword')} />
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
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                    <Button variant="ghost" onClick={clearFilters}>{t('btn_clear')}</Button>
                    <Button onClick={fetchLogs} loading={loading}>{t('btn_apply')}</Button>
                </div>
            </Card>

            {/* Stock Transaction Table */}
            {logSource === 'stock' && (
                <Card padding="sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_logged_at')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_trans_date')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_item_id')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_item_name')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_type')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_quantity')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_prev_stock')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_new_stock')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_location')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_notes')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {stockLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.logged_at?.split('T')[0]}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.transaction_date || '-'}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-indigo-600">{log.item_code}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{log.item_name}</td>
                                        <td className="px-4 py-3"><Badge>{log.transaction_type}</Badge></td>
                                        <td className="px-4 py-3 text-sm font-medium text-center">{log.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 text-center">{log.previous_stock}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-center">{log.new_stock}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{log.factory}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{log.notes || '-'}</td>
                                        <td className="px-4 py-3">
                                            <Button size="xs" variant="ghost" onClick={() => setReverseTarget({ id: log.id, source: 'stock' })} className="text-amber-600 hover:bg-amber-50">
                                                {t('btn_reverse')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {stockLogs.length === 0 && (
                            <div className="text-center py-12 text-gray-400 text-sm">{t('no_transactions')}</div>
                        )}
                    </div>
                    {stockLogs.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                            {t('showing_transactions').replace(':count', String(stockLogs.length))}
                        </div>
                    )}
                </Card>
            )}

            {/* Ledger Transaction Table */}
            {logSource === 'ledger' && (
                <Card padding="sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_logged_at')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_trans_date')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_type')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_id')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_name')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_debit')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_credit')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_balance')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_statement')}</th>
                                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {ledgerLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.logged_at?.split('T')[0]}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.transaction_date || '-'}</td>
                                        <td className="px-4 py-3"><Badge variant="info">{log.ledger_type}</Badge></td>
                                        <td className="px-4 py-3 text-sm font-medium text-indigo-600">{log.entity_code}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{log.entity_name}</td>
                                        <td className="px-4 py-3 text-sm text-emerald-600 font-medium">{Number(log.debit).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-red-500 font-medium">{Number(log.credit).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm font-bold">{Number(log.new_balance).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{log.statement || '-'}</td>
                                        <td className="px-4 py-3">
                                            <Button size="xs" variant="ghost" onClick={() => setReverseTarget({ id: log.id, source: 'ledger' })} className="text-amber-600 hover:bg-amber-50">
                                                {t('btn_reverse')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {ledgerLogs.length === 0 && (
                            <div className="text-center py-12 text-gray-400 text-sm">{t('no_transactions')}</div>
                        )}
                    </div>
                    {ledgerLogs.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                            {t('showing_transactions').replace(':count', String(ledgerLogs.length))}
                        </div>
                    )}
                </Card>
            )}

            {/* Reverse Confirmation Modal */}
            <Modal open={!!reverseTarget} onClose={() => setReverseTarget(null)} title={t('confirm_reverse_title')}>
                <p className="text-sm text-gray-600 mb-2">{t('confirm_reverse_message')}</p>
                <p className="text-xs text-amber-600 mb-4">{t('confirm_reverse_warning')}</p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setReverseTarget(null)}>{t('btn_cancel')}</Button>
                    <Button variant="danger" onClick={confirmReverse}>{t('btn_confirm')}</Button>
                </div>
            </Modal>
        </div>
    );
}
