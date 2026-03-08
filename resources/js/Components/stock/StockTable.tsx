import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import api from '../../lib/api';
import { fmtNum, fmtInt } from '../../lib/format';
import { ExportPrintModal, ColumnDef } from '../ui/ExportPrintModal';
import { StockItem, CATEGORIES, UNITS } from '../../types';

export default function StockTable() {
    const { t, factory } = useApp();
    const [items, setItems] = useState<StockItem[]>([]);
    const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterUnit, setFilterUnit] = useState('');
    const [sortBy, setSortBy] = useState('item_code');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [showExport, setShowExport] = useState(false);

    // Inline edit state
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [editData, setEditData] = useState<Record<string, any>>({});

    // Delete modal
    const [deleteTarget, setDeleteTarget] = useState<{ code: string; name: string } | null>(null);
    const [deletePassword, setDeletePassword] = useState('');

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const [itemsRes, lowRes] = await Promise.all([
                api.get('/api/stock', { params: { search, category: filterCategory, unit: filterUnit } }),
                api.get('/api/stock/low-stock'),
            ]);
            setItems(itemsRes.data);
            setLowStockItems(lowRes.data);
        } catch { toast(t('sync_failed'), 'error'); }
        setLoading(false);
    }, [search, filterCategory, filterUnit, t]);

    useEffect(() => { fetchItems(); }, [fetchItems, factory]);

    useEffect(() => {
        const handler = () => fetchItems();
        window.addEventListener('stock-updated', handler);
        window.addEventListener('factory-changed', handler);
        return () => {
            window.removeEventListener('stock-updated', handler);
            window.removeEventListener('factory-changed', handler);
        };
    }, [fetchItems]);

    const sortedItems = [...items].sort((a, b) => {
        const aVal = (a as any)[sortBy];
        const bVal = (b as any)[sortBy];
        const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal || '').localeCompare(String(bVal || ''));
        return sortDir === 'asc' ? cmp : -cmp;
    });

    const toggleSort = (col: string) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };

    const startEdit = (item: StockItem) => {
        setEditingCode(item.item_code);
        setEditData({ name: item.name, category: item.category, unit: item.unit, supplier: item.supplier || '', unit_price: item.unit_price, min_stock: item.min_stock, starting_balance: item.starting_balance });
    };

    const saveEdit = async () => {
        if (!editingCode) return;
        try {
            await api.post('/api/stock/edit', { item_code: editingCode, ...editData });
            toast(t('msg_item_updated'), 'success');
            setEditingCode(null);
            fetchItems();
        } catch (e: any) { toast(e.response?.data?.message || t('sync_failed'), 'error'); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.post('/api/stock/delete', { item_code: deleteTarget.code, password: deletePassword });
            toast(t('msg_item_deleted'), 'success');
            setDeleteTarget(null);
            setDeletePassword('');
            fetchItems();
        } catch (e: any) { toast(e.response?.data?.message || t('msg_wrong_password'), 'error'); }
    };

    const catOptions = [{ value: '', label: t('all_categories') }, ...CATEGORIES.map(c => ({ value: c.value, label: t(c.labelKey) }))];
    const unitOptions = [{ value: '', label: t('all_units') }, ...UNITS.map(u => ({ value: u.value, label: t(u.labelKey) }))];

    const exportColumns: ColumnDef[] = [
        { key: 'item_code', label: t('th_id') },
        { key: 'name', label: t('th_name') },
        { key: 'category', label: t('th_category') },
        { key: 'unit', label: t('th_unit') },
        { key: 'supplier', label: t('th_supplier'), render: (v) => v || '' },
        { key: 'starting_balance', label: t('th_starting'), render: (v) => fmtInt(v), summable: true },
        { key: 'total_incoming', label: t('th_in'), render: (v) => fmtInt(v), summable: true },
        { key: 'total_outgoing', label: t('th_out'), render: (v) => fmtInt(v), summable: true },
        { key: 'net_stock', label: t('th_net_stock'), render: (v) => fmtInt(v), summable: true },
        { key: 'unit_price', label: t('th_price'), render: (v) => fmtNum(v) },
        { key: 'min_stock', label: t('th_min_stock'), render: (v) => fmtInt(v) },
    ];

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

    return (
        <div className="space-y-6">
            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">{t('low_stock_alerts')}</h4>
                    <div className="space-y-2">
                        {lowStockItems.map((item) => (
                            <div key={item.item_code} className="flex items-center gap-3 text-sm">
                                <Badge variant="warning">{item.item_code}</Badge>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                                <span className="text-slate-500 dark:text-slate-400">{t('notification_current')} {fmtInt(item.net_stock)} | {t('notification_min')} {fmtInt(item.min_stock)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters & Actions */}
            <Card>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <Input placeholder={t('placeholder_search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="w-40">
                        <Select options={catOptions} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} />
                    </div>
                    <div className="w-40">
                        <Select options={unitOptions} value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} />
                    </div>
                    <Button variant="secondary" onClick={fetchItems} loading={loading}>{t('btn_refresh')}</Button>
                    <Button variant="ghost" onClick={() => setShowExport(true)}>{t('btn_export')}</Button>
                    <Button variant="ghost" onClick={() => setShowExport(true)}>{t('btn_print')}</Button>
                </div>
            </Card>

            {/* Table */}
            <Card padding="sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <SortHeader col="item_code">{t('th_id')}</SortHeader>
                                <SortHeader col="name">{t('th_name')}</SortHeader>
                                <SortHeader col="category">{t('th_category')}</SortHeader>
                                <SortHeader col="unit">{t('th_unit')}</SortHeader>
                                <SortHeader col="supplier">{t('th_supplier')}</SortHeader>
                                <SortHeader col="starting_balance">{t('th_starting')}</SortHeader>
                                <SortHeader col="total_incoming">{t('th_in')}</SortHeader>
                                <SortHeader col="total_outgoing">{t('th_out')}</SortHeader>
                                <SortHeader col="net_stock">{t('th_net_stock')}</SortHeader>
                                <SortHeader col="unit_price">{t('th_price')}</SortHeader>
                                <SortHeader col="min_stock">{t('th_min_stock')}</SortHeader>
                                <th className="px-4 py-3.5 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {sortedItems.map((item) => (
                                <tr key={item.item_code} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3.5 text-sm font-medium text-indigo-600">{item.item_code}</td>
                                    <td className="px-4 py-3.5 text-sm">
                                        {editingCode === item.item_code
                                            ? <input className="w-full border rounded-lg px-2 py-1 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                                            : <span className="font-medium text-slate-900 dark:text-slate-100">{item.name}</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400">{item.category}</td>
                                    <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400">{item.unit}</td>
                                    <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400">{item.supplier || '-'}</td>
                                    <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400 text-center">{fmtInt(item.starting_balance)}</td>
                                    <td className="px-4 py-3.5 text-sm text-emerald-600 font-medium text-center">{fmtInt(item.total_incoming)}</td>
                                    <td className="px-4 py-3.5 text-sm text-red-500 font-medium text-center">{fmtInt(item.total_outgoing)}</td>
                                    <td className="px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-slate-100 text-center">
                                        {editingCode === item.item_code
                                            ? fmtInt(item.net_stock)
                                            : <span className={item.net_stock <= item.min_stock && item.min_stock > 0 ? 'text-red-600' : ''}>{fmtInt(item.net_stock)}</span>}
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400 text-center">
                                        {editingCode === item.item_code
                                            ? <input type="number" className="w-20 border rounded-lg px-2 py-1 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" value={editData.unit_price} onChange={(e) => setEditData({ ...editData, unit_price: e.target.value })} />
                                            : fmtNum(item.unit_price)}
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400 text-center">
                                        {editingCode === item.item_code
                                            ? <input type="number" className="w-16 border rounded-lg px-2 py-1 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100" value={editData.min_stock} onChange={(e) => setEditData({ ...editData, min_stock: e.target.value })} />
                                            : fmtInt(item.min_stock)}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1.5">
                                            {editingCode === item.item_code ? (
                                                <>
                                                    <Button size="xs" variant="success" onClick={saveEdit}>{t('btn_save')}</Button>
                                                    <Button size="xs" variant="ghost" onClick={() => setEditingCode(null)}>{t('btn_cancel')}</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button size="xs" variant="ghost" onClick={() => startEdit(item)}>{t('btn_update')}</Button>
                                                    <Button size="xs" variant="ghost" onClick={() => setDeleteTarget({ code: item.item_code, name: item.name })} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">{t('btn_delete')}</Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sortedItems.length === 0 && (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <p className="text-sm">{t('no_items')}</p>
                        </div>
                    )}
                </div>
                {sortedItems.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        {t('showing_items').replace(':count', String(sortedItems.length))}
                    </div>
                )}
            </Card>

            <ExportPrintModal
                open={showExport}
                onClose={() => setShowExport(false)}
                title={`Stock - ${factory}`}
                columns={exportColumns}
                data={sortedItems}
                filename={`stock_${factory}`}
                t={t}
            />

            {/* Delete Modal */}
            <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeletePassword(''); }} title={t('delete_confirmation_title')}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('delete_confirmation_message')}</p>
                {deleteTarget && <p className="text-sm font-medium dark:text-slate-200 mb-4">{deleteTarget.code} - {deleteTarget.name}</p>}
                <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder={t('placeholder_delete_password')} label={t('delete_password_label')} />
                <div className="flex justify-end gap-3 mt-5">
                    <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeletePassword(''); }}>{t('btn_cancel')}</Button>
                    <Button variant="danger" onClick={confirmDelete}>{t('btn_confirm_delete')}</Button>
                </div>
            </Modal>
        </div>
    );
}
