import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { DatePickerInput } from '../ui/DatePickerInput';
import { StatCard } from '../ui/StatCard';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import { ExportPrintModal, ColumnDef, HeaderField } from '../ui/ExportPrintModal';
import { Pagination } from '../ui/Pagination';
import api from '../../lib/api';
import { fmtNum, fmtDate, fmtDateTime } from '../../lib/format';
import { LedgerEntity, LedgerTotals, LedgerLog, PAYMENT_METHODS } from '../../types';

interface LedgerPageProps {
    type: 'customer' | 'supplier' | 'covenant' | 'advance';
}

const CONFIG = {
    customer: {
        codeColumn: 'customer_code', nameColumn: 'name', hasEmail: true, hasPhone: true,
        entryKey: 'customer_entry', idKey: 'customer_id', nameKey: 'customer_name',
        listKey: 'customers_list', saveKey: 'btn_save_customer', noDataKey: 'no_customers',
        countKey: 'showing_customers', idPlaceholder: 'placeholder_customer_id', namePlaceholder: 'placeholder_customer_name',
    },
    supplier: {
        codeColumn: 'supplier_code', nameColumn: 'name', hasEmail: true, hasPhone: true,
        entryKey: 'supplier_entry', idKey: 'supplier_id', nameKey: 'supplier_name',
        listKey: 'suppliers_list', saveKey: 'btn_save_supplier', noDataKey: 'no_suppliers',
        countKey: 'showing_suppliers', idPlaceholder: 'placeholder_supplier_id', namePlaceholder: 'placeholder_supplier_name',
    },
    covenant: {
        codeColumn: 'covenant_code', nameColumn: 'employee_name', hasEmail: false, hasPhone: true,
        entryKey: 'covenant_entry', idKey: 'covenant_id', nameKey: 'employee_name',
        listKey: 'covenants_list', saveKey: 'btn_save_covenant', noDataKey: 'no_covenants',
        countKey: 'showing_covenants', idPlaceholder: 'placeholder_covenant_id', namePlaceholder: 'placeholder_employee_name',
    },
    advance: {
        codeColumn: 'advance_code', nameColumn: 'employee_name', hasEmail: false, hasPhone: true,
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
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalItems, setTotalItems] = useState(0);

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

    // Expanded transactions
    const [expandedCode, setExpandedCode] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<LedgerLog[]>([]);
    const [txLoading, setTxLoading] = useState(false);
    const [txSortBy, setTxSortBy] = useState('transaction_date');
    const [txSortDir, setTxSortDir] = useState<'asc' | 'desc'>('desc');

    // Export modal
    const [showExport, setShowExport] = useState(false);
    // Per-entity tx export modal
    const [txExport, setTxExport] = useState<{ code: string; name: string; entity: LedgerEntity; data: LedgerLog[] } | null>(null);

    // Transaction document_number match codes (for auto-expand + highlight)
    const [txMatchCodes, setTxMatchCodes] = useState<string[]>([]);
    const [txSearch, setTxSearch] = useState('');

    // Ref for scrolling to entry form
    const entryFormRef = useRef<HTMLDivElement>(null);

    // Edit modal
    const [editTarget, setEditTarget] = useState<LedgerEntity | null>(null);
    const [editFields, setEditFields] = useState<Record<string, any>>({});
    const [editLoading, setEditLoading] = useState(false);

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<{ code: string; name: string } | null>(null);
    const [deletePassword, setDeletePassword] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/ledger/${type}`, { params: { search, page, per_page: pageSize, date_from: dateFrom || undefined, date_to: dateTo || undefined } });
            const ledgerRes = res;
            setEntities(ledgerRes.data.entities);
            setTotals(ledgerRes.data.totals);
            setTotalItems(ledgerRes.data.total ?? ledgerRes.data.entities.length);
            const matchCodes: string[] = ledgerRes.data.tx_match_codes ?? [];
            setTxMatchCodes(matchCodes);

            // Auto-expand first entity with matching transaction document_numbers
            if (matchCodes.length > 0) {
                const firstMatch = matchCodes[0];
                setTxLoading(true);
                setTxSearch(search);
                try {
                    const txRes = await api.get(`/api/ledger/${type}/transactions`, { params: { code: firstMatch, date_from: dateFrom || undefined, date_to: dateTo || undefined } });
                    setTransactions(txRes.data);
                    setExpandedCode(firstMatch);
                    setTxSortBy('transaction_date');
                    setTxSortDir('desc');
                } catch {}
                setTxLoading(false);
            } else if (search) {
                // Collapse if no tx matches when searching
                setExpandedCode(null);
            }
        } catch { toast(t('sync_failed'), 'error'); }
        setLoading(false);
    }, [type, search, page, pageSize, dateFrom, dateTo, t]);

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
            if (res.data.exists) {
                const entity = res.data.entity;
                if (entity) setEntityName(entity[cfg.nameColumn] || '');
                toast(t('account_exists'), 'info');
            } else {
                toast(t('account_new'), 'info');
            }
        } catch { toast(t('sync_failed'), 'error'); }
    };

    const resetForm = () => {
        setCode(''); setIsExisting(false); setEntityName(''); setPhone(''); setEmail('');
        setRegistrationDate(''); setDocumentNumber(''); setOpeningBalance('');
        setDebit(''); setCredit(''); setPaymentMethod(''); setStatement('');
    };

    const save = async () => {
        if (!code || (!isExisting && !entityName)) { toast(t('msg_fill_all'), 'warning'); return; }
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

    const toggleExpand = async (entityCode: string) => {
        if (expandedCode === entityCode) {
            setExpandedCode(null);
            return;
        }
        setTxSearch('');
        setTxLoading(true);
        try {
            const res = await api.get(`/api/ledger/${type}/transactions`, { params: { code: entityCode, date_from: dateFrom || undefined, date_to: dateTo || undefined } });
            setTransactions(res.data);
            setExpandedCode(entityCode);
            setTxSortBy('transaction_date');
            setTxSortDir('desc');
        } catch { toast(t('sync_failed'), 'error'); }
        setTxLoading(false);
    };

    const toggleTxSort = (col: string) => {
        if (txSortBy === col) setTxSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setTxSortBy(col); setTxSortDir('desc'); }
    };

    const filteredTransactions = txSearch
        ? transactions.filter(tx => {
            const q = txSearch.toLowerCase();
            return (tx.document_number?.toLowerCase().includes(q))
                || (tx.payment_method?.toLowerCase().includes(q))
                || (tx.statement?.toLowerCase().includes(q))
                || (tx.transaction_type?.toLowerCase().includes(q))
                || String(tx.debit).includes(q)
                || String(tx.credit).includes(q);
        })
        : transactions;

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        const aVal = (a as any)[txSortBy];
        const bVal = (b as any)[txSortBy];
        if (aVal == null && bVal == null) {
            const aLog = a.logged_at ?? '';
            const bLog = b.logged_at ?? '';
            return bLog.localeCompare(aLog);
        }
        if (aVal == null) return txSortDir === 'asc' ? -1 : 1;
        if (bVal == null) return txSortDir === 'asc' ? 1 : -1;
        const cmp = typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        const primary = txSortDir === 'asc' ? cmp : -cmp;
        if (primary !== 0) return primary;
        const aLog = a.logged_at ?? '';
        const bLog = b.logged_at ?? '';
        return bLog.localeCompare(aLog);
    });

    const openEdit = (entity: LedgerEntity) => {
        setEditTarget(entity);
        setEditFields({
            [cfg.nameColumn]: entity[cfg.nameColumn] ?? '',
            phone: entity.phone ?? '',
            email: entity.email ?? '',
            registration_date: entity.registration_date ?? '',
            document_number: entity.document_number ?? '',
            opening_balance: entity.opening_balance ?? 0,
            payment_method: entity.payment_method ?? '',
            statement: entity.statement ?? '',
        });
    };

    const saveEdit = async () => {
        if (!editTarget) return;
        setEditLoading(true);
        try {
            await api.post(`/api/ledger/${type}/update`, {
                code: editTarget[cfg.codeColumn],
                ...editFields,
            });
            toast(t('msg_item_updated'), 'success');
            setEditTarget(null);
            fetchData();
        } catch (e: any) { toast(e.response?.data?.message || t('sync_failed'), 'error'); }
        setEditLoading(false);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.post(`/api/ledger/${type}/delete`, { code: deleteTarget.code, password: deletePassword });
            toast(t('msg_item_deleted'), 'success');
            setDeleteTarget(null); setDeletePassword('');
            fetchData();
        } catch (e: any) { toast(e.response?.data?.message || t('msg_wrong_password'), 'error'); }
    };

    const prefillEntry = (entityCode: string) => {
        const entity = entities.find(e => e[cfg.codeColumn] === entityCode);
        setCode(entityCode);
        setEntityName(entity?.[cfg.nameColumn] || '');
        setIsExisting(true);
        setDebit(''); setCredit(''); setDocumentNumber(''); setStatement(''); setPaymentMethod('');
        setRegistrationDate('');
        setTimeout(() => {
            entryFormRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    const paymentOptions = PAYMENT_METHODS.map(p => ({ value: p.value, label: t(p.labelKey) }));

    const exportColumns: ColumnDef[] = [
        { key: cfg.codeColumn, label: t('th_id') },
        { key: cfg.nameColumn, label: t('th_name') },
        ...(cfg.hasPhone ? [{ key: 'phone', label: t('th_phone'), render: (v: any) => v || '' } as ColumnDef] : []),
        { key: 'opening_balance', label: t('th_opening_balance'), render: (v: any) => fmtNum(v), summable: true },
        { key: 'debit', label: t('th_debit'), render: (v: any) => fmtNum(v), summable: true },
        { key: 'credit', label: t('th_credit'), render: (v: any) => fmtNum(v), summable: true },
        { key: 'balance', label: t('th_balance'), render: (v: any) => fmtNum(v), summable: true },
    ];

    const txExportColumns: ColumnDef[] = [
        { key: 'transaction_date', label: t('th_trans_date'), render: (v: any) => fmtDate(v) },
        { key: 'logged_at', label: t('th_logged_at'), render: (v: any) => fmtDateTime(v) },
        { key: 'transaction_type', label: t('th_type'), render: (v: any) => v || '' },
        { key: 'document_number', label: t('th_doc_number'), render: (v: any) => v || '-' },
        { key: 'debit', label: t('th_debit'), render: (v: any) => fmtNum(v), summable: true },
        { key: 'credit', label: t('th_credit'), render: (v: any) => fmtNum(v), summable: true },
        { key: 'new_balance', label: t('th_balance'), render: (v: any) => fmtNum(v) },
        { key: 'payment_method', label: t('th_payment_method'), render: (v: any, row: any) => v ? t(`payment_${v}`) : '-' },
        { key: 'statement', label: t('th_statement'), render: (v: any) => v || '-' },
    ];

    const TxSortHeader = ({ col, children }: { col: string; children: React.ReactNode }) => (
        <th
            onClick={() => toggleTxSort(col)}
            className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 text-start cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none whitespace-nowrap transition-colors"
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {txSortBy === col && <span className="text-indigo-500">{txSortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
            </span>
        </th>
    );

    const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
        <svg
            className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );

    return (
        <div className="space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard label={t('total_balance')} value={fmtNum(totals.total_balance)} color="indigo" />
                <StatCard label={t('total_opening_balance')} value={fmtNum(totals.total_opening)} color="blue" />
                <StatCard label={t('total_debit')} value={fmtNum(totals.total_debit)} color="green" />
                <StatCard label={t('total_credit')} value={fmtNum(totals.total_credit)} color="red" />
                <StatCard label={t('total_count')} value={totals.count} color="purple" />
            </div>

            {/* Entry Form */}
            <div ref={entryFormRef}>
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
                        {isExisting && (
                            <div className="flex items-center gap-3 mb-4">
                                <Badge variant="info">{t('transaction_mode')}</Badge>
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{entityName}</span>
                            </div>
                        )}
                        {!isExisting && code && <Badge variant="success">{t('account_new')}</Badge>}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                            {!isExisting && <Input label={t(cfg.nameKey)} value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder={t(cfg.namePlaceholder)} />}
                            {!isExisting && cfg.hasPhone && <Input label={t('employee_phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('placeholder_phone')} />}
                            {!isExisting && cfg.hasEmail && <Input label={t('customer_email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('placeholder_email')} />}
                            <DatePickerInput label={isExisting ? t('transaction_date') : t('registration_date')} value={registrationDate} onChange={setRegistrationDate} />
                            <Input label={t('document_number')} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder={t('placeholder_document_number')} />
                            {!isExisting && <Input label={t('opening_balance')} type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder={t('placeholder_opening_balance')} />}
                            <Input label={t('debit')} type="number" value={debit} onChange={(e) => setDebit(e.target.value)} placeholder={t('placeholder_debit')} />
                            <Input label={t('credit')} type="number" value={credit} onChange={(e) => setCredit(e.target.value)} placeholder={t('placeholder_credit')} />
                            <Select label={t('payment_method')} options={paymentOptions} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder={t('select_payment_method')} />
                        </div>
                        <div className="mt-5">
                            <Textarea label={t('statement')} value={statement} onChange={(e) => setStatement(e.target.value)} placeholder={t('placeholder_statement')} />
                        </div>
                        <div className="flex justify-end mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
                            <Button onClick={save} loading={loading} size="lg">{isExisting ? t('btn_add_transaction') : t(cfg.saveKey)}</Button>
                        </div>
                    </>
                )}
            </Card>
            </div>

            {/* Entity List */}
            <Card padding="sm">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t(cfg.listKey)}</h3>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="xs" onClick={() => setShowExport(true)}>{t('btn_export')}</Button>
                        <Button variant="ghost" size="xs" onClick={() => setShowExport(true)}>{t('btn_print')}</Button>
                        <div className="w-36">
                            <DatePickerInput value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} placeholder={t('filter_date_from_label')} />
                        </div>
                        <div className="w-36">
                            <DatePickerInput value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} placeholder={t('filter_date_to_label')} />
                        </div>
                        <div className="w-64">
                            <Input placeholder={t('placeholder_search')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-700/50 border-y border-slate-200 dark:border-slate-600">
                                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_id')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_name')}</th>
                                {cfg.hasEmail && <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_phone')}</th>}
                                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_opening_balance')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_debit')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_credit')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_balance')}</th>
                                <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('th_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {entities.map((entity) => {
                                const entityCode = entity[cfg.codeColumn];
                                const entityDisplayName = entity[cfg.nameColumn];
                                const isExpanded = expandedCode === entityCode;
                                const balance = Number(entity.balance);
                                const hasTxMatch = txMatchCodes.includes(entityCode);
                                return (
                                    <React.Fragment key={entityCode}>
                                        <tr className={`transition-colors ${isExpanded ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/50'}`}>
                                            <td className="px-4 py-3.5">
                                                <button
                                                    onClick={() => toggleExpand(entityCode)}
                                                    className="inline-flex items-center gap-2 group"
                                                >
                                                    <ChevronIcon expanded={isExpanded} />
                                                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-800 dark:group-hover:text-indigo-300 transition-colors">
                                                        {entityCode}
                                                    </span>
                                                    {hasTxMatch && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title={t('th_doc_number')} />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3.5 text-sm font-medium text-slate-800 dark:text-slate-200">{entityDisplayName}</td>
                                            {cfg.hasEmail && <td className="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400">{entity.phone || '-'}</td>}
                                            <td className="px-4 py-3.5 text-sm text-slate-500 dark:text-slate-400 tabular-nums">{fmtNum(entity.opening_balance)}</td>
                                            <td className="px-4 py-3.5 text-sm text-emerald-600 font-medium tabular-nums">{fmtNum(entity.debit)}</td>
                                            <td className="px-4 py-3.5 text-sm text-red-500 font-medium tabular-nums">{fmtNum(entity.credit)}</td>
                                            <td className="px-4 py-3.5">
                                                <span className={`text-sm font-bold tabular-nums ${balance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-600'}`}>
                                                    {fmtNum(balance)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => prefillEntry(entityCode)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                        title={t('btn_update')}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-4 4m4-4l4 4" />
                                                        </svg>
                                                        {t('btn_update')}
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(entity)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                        title={t('btn_edit')}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        {t('btn_edit')}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget({ code: entityCode, name: entityDisplayName })}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title={t('btn_delete')}
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        {t('btn_delete')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={cfg.hasEmail ? 8 : 7} className="p-0">
                                                    <div className="mx-4 my-3 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
                                                        {txLoading ? (
                                                            <div className="flex items-center justify-center py-8">
                                                                <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                </svg>
                                                            </div>
                                                        ) : (<>
                                                            <div className="px-3 py-2 bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                                                                <input
                                                                    type="text"
                                                                    value={txSearch}
                                                                    onChange={e => setTxSearch(e.target.value)}
                                                                    placeholder={t('placeholder_search_transactions')}
                                                                    className="w-full max-w-xs px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                                                />
                                                            </div>
                                                            <table className="w-full">
                                                                <thead>
                                                                    <tr className="bg-slate-100/80 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
                                                                        <TxSortHeader col="transaction_date">{t('th_trans_date')}</TxSortHeader>
                                                                        <TxSortHeader col="logged_at">{t('th_logged_at')}</TxSortHeader>
                                                                        <TxSortHeader col="transaction_type">{t('th_type')}</TxSortHeader>
                                                                        <TxSortHeader col="document_number">{t('th_doc_number')}</TxSortHeader>
                                                                        <TxSortHeader col="debit">{t('th_debit')}</TxSortHeader>
                                                                        <TxSortHeader col="credit">{t('th_credit')}</TxSortHeader>
                                                                        <TxSortHeader col="new_balance">{t('th_balance')}</TxSortHeader>
                                                                        <TxSortHeader col="payment_method">{t('th_payment_method')}</TxSortHeader>
                                                                        <TxSortHeader col="statement">{t('th_statement')}</TxSortHeader>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                                                    {sortedTransactions.map((tx) => (
                                                                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                                                            <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmtDate(tx.transaction_date)}</td>
                                                                            <td className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{fmtDateTime(tx.logged_at)}</td>
                                                                            <td className="px-3 py-2.5 text-xs"><Badge>{tx.transaction_type}</Badge></td>
                                                                            <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                                                {tx.document_number ? (
                                                                                    txSearch && tx.document_number.toLowerCase().includes(txSearch.toLowerCase())
                                                                                        ? <span className="bg-yellow-200 dark:bg-yellow-700 px-1 rounded font-medium">{tx.document_number}</span>
                                                                                        : tx.document_number
                                                                                ) : '-'}
                                                                            </td>
                                                                            <td className="px-3 py-2.5 text-xs text-emerald-600 font-medium tabular-nums">{fmtNum(tx.debit)}</td>
                                                                            <td className="px-3 py-2.5 text-xs text-red-500 font-medium tabular-nums">{fmtNum(tx.credit)}</td>
                                                                            <td className="px-3 py-2.5 text-xs font-bold dark:text-slate-100 tabular-nums">{fmtNum(tx.new_balance)}</td>
                                                                            <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{tx.payment_method ? t(`payment_${tx.payment_method}`) : '-'}</td>
                                                                            <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{tx.statement || '-'}</td>
                                                                        </tr>
                                                                    ))}
                                                                    {transactions.length === 0 && (
                                                                        <tr><td colSpan={9} className="px-3 py-8 text-center text-xs text-slate-400 dark:text-slate-500">{t('no_transactions')}</td></tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </>)}
                                                        {!txLoading && sortedTransactions.length > 0 && (
                                                            <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between bg-slate-50/50 dark:bg-slate-700/30">
                                                                <span className="text-xs text-slate-500 dark:text-slate-400">{sortedTransactions.length} {t('transactions_count')}</span>
                                                                <Button size="xs" variant="ghost" onClick={() => setTxExport({ code: entityCode, name: entityDisplayName, entity, data: sortedTransactions })}>
                                                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                                    </svg>
                                                                    {t('btn_print')}
                                                                </Button>
                                                            </div>
                                                        )}
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
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">{t(cfg.noDataKey)}</div>
                    )}
                </div>
                {entities.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                        {t(cfg.countKey).replace(':count', String(totalItems))}
                    </div>
                )}
            </Card>

            <Pagination
                currentPage={page}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
                t={t}
            />

            <ExportPrintModal
                open={showExport}
                onClose={() => setShowExport(false)}
                title={t(cfg.listKey)}
                columns={exportColumns}
                data={entities}
                filename={`ledger_${type}`}
                t={t}
                onFetchAll={async () => {
                    const res = await api.get(`/api/ledger/${type}`, { params: { search, per_page: 999999, page: 1, date_from: dateFrom || undefined, date_to: dateTo || undefined } });
                    return res.data.entities;
                }}
            />

            {txExport && (() => {
                const e = txExport.entity;
                const hf: HeaderField[] = [
                    { label: t('th_id'), value: txExport.code },
                    { label: t('th_name'), value: txExport.name },
                    ...(cfg.hasPhone && e.phone ? [{ label: t('th_phone'), value: e.phone }] : []),
                    { label: t('th_opening_balance'), value: fmtNum(e.opening_balance) },
                    { label: t('th_debit'), value: fmtNum(e.debit) },
                    { label: t('th_credit'), value: fmtNum(e.credit) },
                    { label: t('th_balance'), value: fmtNum(e.balance) },
                ];
                return (
                    <ExportPrintModal
                        open={true}
                        onClose={() => setTxExport(null)}
                        title={t(cfg.listKey)}
                        subtitle={`${txExport.code} — ${txExport.name}`}
                        headerFields={hf}
                        columns={txExportColumns}
                        data={txExport.data}
                        filename={`${type}_${txExport.code}_transactions`}
                        t={t}
                    />
                );
            })()}

            {/* Edit Modal */}
            <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={t('btn_edit')}>
                {editTarget && (
                    <div className="space-y-4">
                        <div className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{t(cfg.idKey)}</span>
                            <p className="text-sm font-semibold text-indigo-600">{editTarget[cfg.codeColumn]}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label={t(cfg.nameKey)}
                                value={editFields[cfg.nameColumn] ?? ''}
                                onChange={(e) => setEditFields(f => ({ ...f, [cfg.nameColumn]: e.target.value }))}
                            />
                            {cfg.hasPhone && (
                                <Input
                                    label={t('employee_phone')}
                                    value={editFields.phone ?? ''}
                                    onChange={(e) => setEditFields(f => ({ ...f, phone: e.target.value }))}
                                />
                            )}
                            {cfg.hasEmail && (
                                <Input
                                    label={t('customer_email')}
                                    type="email"
                                    value={editFields.email ?? ''}
                                    onChange={(e) => setEditFields(f => ({ ...f, email: e.target.value }))}
                                />
                            )}
                            <DatePickerInput
                                label={t('registration_date')}
                                value={editFields.registration_date ?? ''}
                                onChange={(v) => setEditFields(f => ({ ...f, registration_date: v }))}
                            />
                            <Input
                                label={t('document_number')}
                                value={editFields.document_number ?? ''}
                                onChange={(e) => setEditFields(f => ({ ...f, document_number: e.target.value }))}
                            />
                            <Input
                                label={t('opening_balance')}
                                type="number"
                                value={editFields.opening_balance ?? ''}
                                onChange={(e) => setEditFields(f => ({ ...f, opening_balance: e.target.value }))}
                            />
                            <Select
                                label={t('payment_method')}
                                options={paymentOptions}
                                value={editFields.payment_method ?? ''}
                                onChange={(e) => setEditFields(f => ({ ...f, payment_method: e.target.value }))}
                                placeholder={t('select_payment_method')}
                            />
                        </div>
                        <Textarea
                            label={t('statement')}
                            value={editFields.statement ?? ''}
                            onChange={(e) => setEditFields(f => ({ ...f, statement: e.target.value }))}
                        />
                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <Button variant="secondary" onClick={() => setEditTarget(null)}>{t('btn_cancel')}</Button>
                            <Button onClick={saveEdit} loading={editLoading}>{t('btn_save')}</Button>
                        </div>
                    </div>
                )}
            </Modal>

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
