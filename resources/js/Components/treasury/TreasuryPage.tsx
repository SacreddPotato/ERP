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
import { TreasurySummary, LedgerEntity, LedgerTotals, LedgerLog, PAYMENT_METHODS } from '../../types';

export default function TreasuryPage() {
    const { t } = useApp();
    const [summary, setSummary] = useState<TreasurySummary | null>(null);
    const [entities, setEntities] = useState<LedgerEntity[]>([]);
    const [totals, setTotals] = useState<LedgerTotals>({ total_balance: 0, total_opening: 0, total_debit: 0, total_credit: 0, count: 0 });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Init form
    const [startingCapital, setStartingCapital] = useState('');
    const [fiscalYearStart, setFiscalYearStart] = useState('');
    const [currency, setCurrency] = useState('EGP');
    const [initNotes, setInitNotes] = useState('');

    // Account form
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [isExisting, setIsExisting] = useState(false);
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

    // Delete / Reset
    const [deleteTarget, setDeleteTarget] = useState<{ code: string; name: string } | null>(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetPassword, setResetPassword] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [summaryRes, ledgerRes] = await Promise.all([
                api.get('/api/treasury/summary'),
                api.get('/api/ledger/treasury', { params: { search } }),
            ]);
            setSummary(summaryRes.data);
            setEntities(ledgerRes.data.entities);
            setTotals(ledgerRes.data.totals);
        } catch { toast(t('sync_failed'), 'error'); }
        setLoading(false);
    }, [search, t]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const initialize = async () => {
        if (!startingCapital) { toast(t('msg_fill_all'), 'warning'); return; }
        setLoading(true);
        try {
            await api.post('/api/treasury/initialize', {
                starting_capital: parseFloat(startingCapital),
                fiscal_year_start: fiscalYearStart || undefined,
                currency, notes: initNotes || undefined,
            });
            toast(t('treasury_initialized'), 'success');
            setStartingCapital(''); setFiscalYearStart(''); setInitNotes('');
            fetchData();
        } catch (e: any) { toast(e.response?.data?.message || t('sync_failed'), 'error'); }
        setLoading(false);
    };

    const resetTreasury = async () => {
        try {
            await api.post('/api/treasury/reset', { password: resetPassword });
            toast(t('treasury_initialized'), 'success');
            setShowResetModal(false); setResetPassword('');
            fetchData();
        } catch (e: any) { toast(e.response?.data?.message || t('msg_wrong_password'), 'error'); }
    };

    const checkAccount = async () => {
        if (!accountNumber.trim()) return;
        try {
            const res = await api.post('/api/ledger/treasury/check-code', { code: accountNumber });
            setIsExisting(res.data.exists);
            if (res.data.exists) toast(t('account_exists'), 'info');
            else toast(t('account_new'), 'info');
        } catch { toast(t('sync_failed'), 'error'); }
    };

    const resetAccountForm = () => {
        setAccountNumber(''); setAccountName(''); setIsExisting(false);
        setRegistrationDate(''); setDocumentNumber(''); setOpeningBalance('');
        setDebit(''); setCredit(''); setPaymentMethod(''); setStatement('');
    };

    const saveAccount = async () => {
        if (!accountNumber || !accountName) { toast(t('msg_fill_all'), 'warning'); return; }
        setLoading(true);
        try {
            await api.post('/api/ledger/treasury/store', {
                account_number: accountNumber, account_name: accountName,
                registration_date: registrationDate || undefined,
                document_number: documentNumber || undefined,
                opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
                debit: debit ? parseFloat(debit) : 0,
                credit: credit ? parseFloat(credit) : 0,
                payment_method: paymentMethod || undefined,
                statement: statement || undefined,
            });
            toast(t('msg_item_added'), 'success');
            resetAccountForm(); fetchData();
        } catch (e: any) { toast(e.response?.data?.message || t('sync_failed'), 'error'); }
        setLoading(false);
    };

    const viewTransactions = async (code: string) => {
        if (viewingCode === code) { setViewingCode(null); return; }
        try {
            const res = await api.get('/api/ledger/treasury/transactions', { params: { code } });
            setTransactions(res.data);
            setViewingCode(code);
        } catch { toast(t('sync_failed'), 'error'); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.post('/api/ledger/treasury/delete', { code: deleteTarget.code, password: deletePassword });
            toast(t('msg_item_deleted'), 'success');
            setDeleteTarget(null); setDeletePassword('');
            fetchData();
        } catch (e: any) { toast(e.response?.data?.message || t('msg_wrong_password'), 'error'); }
    };

    const paymentOptions = PAYMENT_METHODS.map(p => ({ value: p.value, label: t(p.labelKey) }));
    const isInitialized = summary?.config?.initialized;

    return (
        <div className="space-y-6">
            {/* Not Initialized */}
            {summary && !isInitialized && (
                <Card>
                    <div className="text-center py-6">
                        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('treasury_not_initialized')}</h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{t('treasury_init_description')}</p>
                        <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label={t('starting_capital')} type="number" value={startingCapital} onChange={(e) => setStartingCapital(e.target.value)} placeholder={t('placeholder_starting_capital')} />
                            <Input label={t('currency')} value={currency} onChange={(e) => setCurrency(e.target.value)} />
                            <Input label={t('fiscal_year_start')} type="date" value={fiscalYearStart} onChange={(e) => setFiscalYearStart(e.target.value)} />
                            <Input label={t('initialization_notes')} value={initNotes} onChange={(e) => setInitNotes(e.target.value)} placeholder={t('placeholder_init_notes')} />
                        </div>
                        <div className="mt-6">
                            <Button onClick={initialize} loading={loading} size="lg">{t('btn_confirm_initialize')}</Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Initialized: Summary */}
            {isInitialized && summary && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard label={t('starting_capital')} value={summary.starting_capital.toFixed(2)} color="indigo" />
                        <StatCard label={t('total_debit')} value={summary.total_debit.toFixed(2)} color="green" />
                        <StatCard label={t('total_credit')} value={summary.total_credit.toFixed(2)} color="red" />
                        <StatCard label={t('net_change')} value={summary.net_change.toFixed(2)} color="amber" />
                        <StatCard label={t('current_treasury_position')} value={summary.current_position.toFixed(2)} color="purple" />
                    </div>

                    <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3">
                        <Badge variant="info">{summary.config.currency}</Badge>
                        {summary.config.fiscal_year_start && (
                            <span className="text-xs text-gray-500">{t('fiscal_year_start')}: {summary.config.fiscal_year_start}</span>
                        )}
                        <span className="text-xs text-gray-500">{t('total_count')} {summary.total_accounts}</span>
                        <div className="flex-1" />
                        <Button variant="ghost" size="xs" onClick={() => setShowResetModal(true)} className="text-red-500 hover:bg-red-50">
                            {t('btn_reset_treasury')}
                        </Button>
                    </div>

                    {/* Account Entry Form */}
                    <Card>
                        <CardHeader title={t('treasury_entry')} />
                        <div className="flex items-end gap-3 mb-6">
                            <div className="flex-1">
                                <Input label={t('account_number')} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder={t('placeholder_account_number')} onKeyDown={(e) => e.key === 'Enter' && checkAccount()} />
                            </div>
                            <Button onClick={checkAccount}>{t('btn_check_account')}</Button>
                        </div>
                        {accountNumber && (
                            <>
                                {isExisting && <Badge variant="info">{t('account_exists')}</Badge>}
                                {!isExisting && <Badge variant="success">{t('account_new')}</Badge>}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                                    <Input label={t('account_name')} value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder={t('placeholder_account_name')} />
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
                                    <Button onClick={saveAccount} loading={loading} size="lg">{t('btn_save_treasury')}</Button>
                                </div>
                            </>
                        )}
                    </Card>

                    {/* Accounts Table */}
                    <Card padding="sm">
                        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">{t('treasury_list')}</h3>
                            <div className="w-64">
                                <Input placeholder={t('placeholder_search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_account_number')}</th>
                                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_account_name')}</th>
                                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_opening_balance')}</th>
                                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_debit')}</th>
                                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_credit')}</th>
                                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_balance')}</th>
                                        <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t('th_actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {entities.map((entity) => (
                                        <React.Fragment key={entity.account_number}>
                                            <tr className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3.5 text-sm font-medium text-indigo-600">{entity.account_number}</td>
                                                <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{entity.account_name}</td>
                                                <td className="px-4 py-3.5 text-sm text-gray-600">{Number(entity.opening_balance).toFixed(2)}</td>
                                                <td className="px-4 py-3.5 text-sm text-emerald-600 font-medium">{Number(entity.debit).toFixed(2)}</td>
                                                <td className="px-4 py-3.5 text-sm text-red-500 font-medium">{Number(entity.credit).toFixed(2)}</td>
                                                <td className="px-4 py-3.5 text-sm font-bold">{Number(entity.balance).toFixed(2)}</td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex gap-1.5">
                                                        <Button size="xs" variant="ghost" onClick={() => viewTransactions(entity.account_number)}>
                                                            {viewingCode === entity.account_number ? t('btn_close') : t('tab_transactions')}
                                                        </Button>
                                                        <Button size="xs" variant="ghost" onClick={() => setDeleteTarget({ code: entity.account_number, name: entity.account_name })} className="text-red-500 hover:text-red-700 hover:bg-red-50">{t('btn_delete')}</Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {viewingCode === entity.account_number && (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-4 bg-gray-50/80">
                                                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                                                            <table className="w-full">
                                                                <thead className="bg-gray-100">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-start">{t('th_date')}</th>
                                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-start">{t('th_type')}</th>
                                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-start">{t('th_debit')}</th>
                                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-start">{t('th_credit')}</th>
                                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-start">{t('th_balance')}</th>
                                                                        <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-start">{t('th_statement')}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                                    {transactions.map((tx) => (
                                                                        <tr key={tx.id}>
                                                                            <td className="px-3 py-2 text-xs text-gray-600">{tx.logged_at?.split('T')[0]}</td>
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
                                    ))}
                                </tbody>
                            </table>
                            {entities.length === 0 && (
                                <div className="text-center py-12 text-gray-400 text-sm">{t('no_treasury')}</div>
                            )}
                        </div>
                    </Card>
                </>
            )}

            {/* Delete Modal */}
            <Modal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeletePassword(''); }} title={t('delete_confirmation_title')}>
                <p className="text-sm text-gray-600 mb-4">{t('delete_confirmation_message')}</p>
                <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder={t('placeholder_delete_password')} label={t('delete_password_label')} />
                <div className="flex justify-end gap-3 mt-5">
                    <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeletePassword(''); }}>{t('btn_cancel')}</Button>
                    <Button variant="danger" onClick={confirmDelete}>{t('btn_confirm_delete')}</Button>
                </div>
            </Modal>

            {/* Reset Modal */}
            <Modal open={showResetModal} onClose={() => { setShowResetModal(false); setResetPassword(''); }} title={t('btn_reset_treasury')}>
                <p className="text-sm text-gray-600 mb-4">{t('msg_cannot_undo')}</p>
                <Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder={t('placeholder_delete_password')} label={t('delete_password_label')} />
                <div className="flex justify-end gap-3 mt-5">
                    <Button variant="secondary" onClick={() => { setShowResetModal(false); setResetPassword(''); }}>{t('btn_cancel')}</Button>
                    <Button variant="danger" onClick={resetTreasury}>{t('btn_confirm')}</Button>
                </div>
            </Modal>
        </div>
    );
}
