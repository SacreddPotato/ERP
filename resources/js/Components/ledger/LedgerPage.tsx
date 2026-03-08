import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { StatCard } from '../ui/StatCard';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import api from '../../lib/api';
import { LedgerEntity, LedgerTotals, LedgerLog, PAYMENT_METHODS } from '../../types';

interface LedgerPageProps {
    type: 'customer' | 'supplier' | 'covenant' | 'advance';
}

const CONFIG = {
    customer: {
        codeColumn: 'customer_code', nameColumn: 'name', hasEmail: true,
        entryKey: 'customer_entry', idKey: 'customer_id', nameKey: 'customer_name',
        listKey: 'customers_list', saveKey: 'btn_save_customer', noDataKey: 'no_customers',
        countKey: 'showing_customers', idPlaceholder: 'placeholder_customer_id', namePlaceholder: 'placeholder_customer_name',
    },
    supplier: {
        codeColumn: 'supplier_code', nameColumn: 'name', hasEmail: true,
        entryKey: 'supplier_entry', idKey: 'supplier_id', nameKey: 'supplier_name',
        listKey: 'suppliers_list', saveKey: 'btn_save_supplier', noDataKey: 'no_suppliers',
        countKey: 'showing_suppliers', idPlaceholder: 'placeholder_supplier_id', namePlaceholder: 'placeholder_supplier_name',
    },
    covenant: {
        codeColumn: 'covenant_code', nameColumn: 'employee_name', hasEmail: false,
        entryKey: 'covenant_entry', idKey: 'covenant_id', nameKey: 'employee_name',
        listKey: 'covenants_list', saveKey: 'btn_save_covenant', noDataKey: 'no_covenants',
        countKey: 'showing_covenants', idPlaceholder: 'placeholder_covenant_id', namePlaceholder: 'placeholder_employee_name',
    },
    advance: {
        codeColumn: 'advance_code', nameColumn: 'employee_name', hasEmail: false,
        entryKey: 'advance_entry', idKey: 'advance_id', nameKey: 'employee_name',
        listKey: 'advances_list', saveKey: 'btn_save_advance', noDataKey: 'no_advances',
        countKey: 'showing_advances', idPlaceholder: 'placeholder_advance_id', namePlaceholder: 'placeholder_employee_name',
    },
};

export default function LedgerPage({ type }: LedgerPageProps) {
    const { t } = useApp();
    const cfg = CONFIG[type];

    const [entities, setEntities] = useState<LedgerEntity[]>([]);
    const [totals, setTotals] = useState<LedgerTotals>({ total_balance: 0, total_opening: 0, total_debit: 0, total_credit: 0, count: 0 });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Form state
    const [code, setCode] = useState('');
    const [isExisting, setIsExisting] = useState(false);
    const [entityName, setEntityName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [registrationDate, setRegistrationDate] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [openingBalance, setOpeningBalance] = useState('');
    const [debit, setDebit] = useState('');
    const [credit, setCredit] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [statement, setStatement] = useState('');

    // Transaction view
    const [viewingCode, setViewingCode] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<LedgerLog[]>([]);
    const [txSortBy, setTxSortBy] = useState('logged_at');
    const [txSortDir, setTxSortDir] = useState<'asc' | 'desc'>('desc');

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<{ code: string; name: string } | null>(null);
    const [deletePassword, setDeletePassword] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/ledger/${type}`, { params: { search } });
            setEntities(res.data.entities);
            setTotals(res.data.totals);
        } catch { toast(t('sync_failed'), 'error'); }
        setLoading(false);
    }, [type, search, t]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const generateCode = async () => {
        try {
            const res = await api.get(`/api/ledger/${type}/generate-code`);
            setCode(res.data.code);
        } catch { toast(t('sync_failed'), 'error'); }
    };

    const checkCode = async () => {
        if (!code.trim()) return;
        try {
            const res = await api.post(`/api/ledger/${type}/check-code`, { code });
            setIsExisting(res.data.exists);
            if (res.data.exists) toast(t('account_exists'), 'info');
            else toast(t('account_new'), 'info');
        } catch { toast(t('sync_failed'), 'error'); }
    };

    const resetForm = () => {
        setCode(''); setIsExisting(false); setEntityName(''); setPhone(''); setEmail('');
        setRegistrationDate(''); setDocumentNumber(''); setOpeningBalance('');
        setDebit(''); setCredit(''); setPaymentMethod(''); setStatement('');
    };

    const save = async () => {
        if (!code || !entityName) { toast(t('msg_fill_all'), 'warning'); return; }
        setLoading(true);
        try {
            const data: Record<string, any> = {
                [cfg.codeColumn]: code, [cfg.nameColumn]: entityName,
                phone, registration_date: registrationDate || undefined,
                document_number: documentNumber || undefined,
                opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
                debit: debit ? parseFloat(debit) : 0,
                credit: credit ? parseFloat(credit) : 0,
                payment_method: paymentMethod || undefined,
                statement: statement || undefined,
            };
            if (cfg.hasEmail) data.email = email;
            await api.post(`/api/ledger/${type}/store`, data);
            toast(isExisting ? t('msg_item_updated') : t('msg_item_added'), 'success');
            resetForm();
            fetchData();
        } catch (e: any) { toast(e.response?.data?.message || t('sync_failed'), 'error'); }
        setLoading(false);
    };

    const viewTransactions = async (entityCode: string) => {
        if (viewingCode === entityCode) { setViewingCode(null); return; }
        try {
            const res = await api.get(`/api/ledger/${type}/transactions`, { params: { code: entityCode } });
            setTransactions(res.data);
            setViewingCode(entityCode);
            setTxSortBy('logged_at');
            setTxSortDir('desc');
        } catch { toast(t('sync_failed'), 'error'); }
    };

    const toggleTxSort = (col: string) => {
        if (txSortBy === col) setTxSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setTxSortBy(col); setTxSortDir('asc'); }
    };

    const sortedTransactions = [...transactions].sort((a, b) => {
        const aVal = (a as any)[txSortBy];
        const bVal = (b as any)[txSortBy];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return txSortDir === 'asc' ? -1 : 1;
        if (bVal == null) return txSortDir === 'asc' ? 1 : -1;
        const cmp = typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        return txSortDir === 'asc' ? cmp : -cmp;
    });

    const TxSortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
        <th
            onClick={() => toggleTxSort(col)}
            className="px-3 py-2 text-xs font-semibold text-gray-500 text-start cursor-pointer hover:text-gray-900 select-none whitespace-nowrap"
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {txSortBy === col && <span className="text-indigo-600">{txSortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
            </span>
        </th>
    );

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.post(`/api/ledger/${type}/delete`, { code: deleteTarget.code, password: deletePassword });
            toast(t('msg_item_deleted'), 'success');
            setDeleteTarget(null); setDeletePassword('');
            fetchData();
        } catch (e: any) { toast(e.response?.data?.message || t('msg_wrong_password'), 'error'); }
    };

    const paymentOptions = PAYMENT_METHODS.map(p => ({ value: p.value, label: t(p.labelKey) }));

    return (
        <div className="space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard label={t('total_balance')} value={totals.total_balance.toFixed(2)} color="indigo" />
                <StatCard label={t('total_opening_balance')} value={totals.total_opening.toFixed(2)} color="blue" />
                <StatCard label={t('total_debit')} value={totals.total_debit.toFixed(2)} color="green" />
                <StatCard label={t('total_credit')} value={totals.total_credit.toFixed(2)} color="red" />
                <StatCard label={t('total_count')} value={totals.count} color="purple" />
            </div>

            {/* Entry Form */}
            <Card>
                <CardHeader title={t(cfg.entryKey)} />

                <div className="flex items-end gap-3 mb-6">
                    <div className="flex-1">
                        <Input label={t(cfg.idKey)} value={code} onChange={(e) => setCode(e.target.value)} placeholder={t(cfg.idPlaceholder)} onKeyDown={(e) => e.key === 'Enter' && checkCode()} />
                    </div>
                    <Button variant="secondary" onClick={generateCode}>{t('btn_generate_id')}</Button>
                    <Button onClick={checkCode}>{t('btn_check_id')}</Button>
                </div>

                {code && (
                    <>
                        {isExisting && <Badge variant="info" >{t('account_exists')}</Badge>}
                        {!isExisting && code && <Badge variant="success">{t('account_new')}</Badge>}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                            <Input label={t(cfg.nameKey)} value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder={t(cfg.namePlaceholder)} />
                            <Input label={t('employee_phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('placeholder_phone')} />
                            {cfg.hasEmail && <Input label={t('customer_email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('placeholder_email')} />}
                            <Input label={t('registration_date')} type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} />
                            <Input label={t('document_number')} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder={t('placeholder_document_number')} />
                            {!isExisting && <Input label={t('opening_balance')} type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder={t('placeholder_opening_balance')} />}
                            <Input label={t('debit')} type="number" value={debit} onChange={(e) => setDebit(e.target.value)} placeholder={t('placeholder_debit')} />
                            <Input label={t('credit')} type="number" value={credit} onChange={(e) => setCredit(e.target.value)} placeholder={t('placeholder_credit')} />
                            <Select label={t('payment_method')} options={paymentOptions} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder={t('select_payment_method')} />
                        </div>
                        <div className="mt-5">
                            <Textarea label={t('statement')} value={statement} onChange={(e) => setStatement(e.target.value)} placeholder={t('placeholder_statement')} />
                        </div>
                        <div className="flex justify-end mt-6 pt-5 border-t border-gray-100">
                            <Button onClick={save} loading={loading} size="lg">{t(cfg.saveKey)}</Button>
                        </div>
                    </>
                )}
            </Card>

            {/* Entity List */}
            <Card padding="sm">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{t(cfg.listKey)}</h3>
                    <div className="w-64">
                        <Input placeholder={t('placeholder_search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_id')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_name')}</th>
                                {cfg.hasEmail && <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_phone')}</th>}
                                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_opening_balance')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_debit')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_credit')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_balance')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {entities.map((entity) => {
                                const entityCode = entity[cfg.codeColumn];
                                const entityDisplayName = entity[cfg.nameColumn];
                                return (
                                    <React.Fragment key={entityCode}>
                                        <tr className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3.5 text-sm font-medium text-indigo-600">{entityCode}</td>
                                            <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{entityDisplayName}</td>
                                            {cfg.hasEmail && <td className="px-4 py-3.5 text-sm text-gray-600">{entity.phone || '-'}</td>}
                                            <td className="px-4 py-3.5 text-sm text-gray-600">{Number(entity.opening_balance).toFixed(2)}</td>
                                            <td className="px-4 py-3.5 text-sm text-emerald-600 font-medium">{Number(entity.debit).toFixed(2)}</td>
                                            <td className="px-4 py-3.5 text-sm text-red-500 font-medium">{Number(entity.credit).toFixed(2)}</td>
                                            <td className="px-4 py-3.5 text-sm font-bold">{Number(entity.balance).toFixed(2)}</td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex gap-1.5">
                                                    <Button size="xs" variant="ghost" onClick={() => viewTransactions(entityCode)}>
                                                        {viewingCode === entityCode ? t('btn_close') : t('tab_transactions')}
                                                    </Button>
                                                    <Button size="xs" variant="ghost" onClick={() => setDeleteTarget({ code: entityCode, name: entityDisplayName })} className="text-red-500 hover:text-red-700 hover:bg-red-50">{t('btn_delete')}</Button>
                                                </div>
                                            </td>
                                        </tr>
                                        {viewingCode === entityCode && (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-4 bg-gray-50/80">
                                                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                                                        <table className="w-full">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    <TxSortHeader col="logged_at">{t('th_date')}</TxSortHeader>
                                                                    <TxSortHeader col="transaction_type">{t('th_type')}</TxSortHeader>
                                                                    <TxSortHeader col="debit">{t('th_debit')}</TxSortHeader>
                                                                    <TxSortHeader col="credit">{t('th_credit')}</TxSortHeader>
                                                                    <TxSortHeader col="new_balance">{t('th_balance')}</TxSortHeader>
                                                                    <TxSortHeader col="statement">{t('th_statement')}</TxSortHeader>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                                {sortedTransactions.map((tx) => (
                                                                    <tr key={tx.id}>
                                                                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{tx.logged_at?.replace('T', ' ').slice(0, 19)}</td>
                                                                        <td className="px-3 py-2 text-xs"><Badge>{tx.transaction_type}</Badge></td>
                                                                        <td className="px-3 py-2 text-xs text-emerald-600">{Number(tx.debit).toFixed(2)}</td>
                                                                        <td className="px-3 py-2 text-xs text-red-500">{Number(tx.credit).toFixed(2)}</td>
                                                                        <td className="px-3 py-2 text-xs font-bold">{Number(tx.new_balance).toFixed(2)}</td>
                                                                        <td className="px-3 py-2 text-xs text-gray-500">{tx.statement || '-'}</td>
                                                                    </tr>
                                                                ))}
                                                                {transactions.length === 0 && (
                                                                    <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-gray-400">{t('no_transactions')}</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    {entities.length === 0 && (
                        <div className="text-center py-12 text-gray-400 text-sm">{t(cfg.noDataKey)}</div>
                    )}
                </div>
                {entities.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                        {t(cfg.countKey).replace(':count', String(entities.length))}
                    </div>
                )}
            </Card>

            {/* Delete Modal */}
            <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeletePassword(''); }} title={t('delete_confirmation_title')}>
                <p className="text-sm text-gray-600 mb-4">{t('delete_confirmation_message')}</p>
                {deleteTarget && <p className="text-sm font-medium mb-4">{deleteTarget.code} - {deleteTarget.name}</p>}
                <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder={t('placeholder_delete_password')} label={t('delete_password_label')} />
                <div className="flex justify-end gap-3 mt-5">
                    <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeletePassword(''); }}>{t('btn_cancel')}</Button>
                    <Button variant="danger" onClick={confirmDelete}>{t('btn_confirm_delete')}</Button>
                </div>
            </Modal>
        </div>
    );
}
