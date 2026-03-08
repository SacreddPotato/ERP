import React, { useState } from 'react';
import AppLayout from '../Layouts/AppLayout';
import { useApp } from '../contexts/AppContext';
import StockManager from '../Components/stock/StockManager';
import StockTable from '../Components/stock/StockTable';
import LedgerPage from '../Components/ledger/LedgerPage';
import TreasuryPage from '../Components/treasury/TreasuryPage';
import TransactionLogPage from '../Components/transactions/TransactionLogPage';
import FirebaseSyncPanel from '../Components/sync/FirebaseSyncPanel';

const TABS = [
    { id: 'add-item', key: 'tab_add_item', icon: 'M12 4v16m8-8H4' },
    { id: 'view-stock', key: 'tab_view_stock', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'customers', key: 'tab_customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'suppliers', key: 'tab_suppliers', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'treasury', key: 'tab_treasury', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'covenants', key: 'tab_covenants', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'advances', key: 'tab_advances', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'transactions', key: 'tab_transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
] as const;

export default function Dashboard() {
    const { t } = useApp();
    const [activeTab, setActiveTab] = useState('add-item');

    return (
        <AppLayout>
            {/* Sync Panel */}
            <div className="mb-6">
                <FirebaseSyncPanel />
            </div>

            {/* Tab Navigation */}
            <nav className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1.5 mb-6">
                <div className="flex flex-wrap gap-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                            </svg>
                            {t(tab.key)}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Tab Panels */}
            <div>
                {activeTab === 'add-item' && <StockManager />}
                {activeTab === 'view-stock' && <StockTable />}
                {activeTab === 'customers' && <LedgerPage type="customer" />}
                {activeTab === 'suppliers' && <LedgerPage type="supplier" />}
                {activeTab === 'treasury' && <TreasuryPage />}
                {activeTab === 'covenants' && <LedgerPage type="covenant" />}
                {activeTab === 'advances' && <LedgerPage type="advance" />}
                {activeTab === 'transactions' && <TransactionLogPage />}
            </div>
        </AppLayout>
    );
}
