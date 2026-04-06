import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import api from '../../lib/api';

interface DbCounts {
    customers: number;
    suppliers: number;
    treasury_accounts: number;
    covenants: number;
    advances: number;
    stock_items: number;
    stock_transactions: number;
    transaction_logs: number;
    ledger_logs: number;
    ledger_transactions: number;
}

interface DebugStatus {
    counts: DbCounts;
    sync_meta: Record<string, string>;
}

const MOCK_TYPES = [
    { value: 'customer', label: 'Customer' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'treasury', label: 'Treasury Account' },
    { value: 'ledger_log', label: 'Ledger Log' },
    { value: 'ledger_transaction', label: 'Ledger Transaction' },
];

export default function SyncDebugPanel() {
    const [status, setStatus] = useState<DebugStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLog, setActionLog] = useState<string[]>([]);
    const [running, setRunning] = useState<string | null>(null);
    const [mockType, setMockType] = useState('customer');
    const [mockCount, setMockCount] = useState(3);

    const log = (msg: string) => setActionLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));

    const fetchStatus = async () => {
        try {
            const res = await api.get('/api/sync/debug-status');
            setStatus(res.data);
        } catch (e: any) {
            log(`Status fetch failed: ${e.message}`);
        }
    };

    useEffect(() => { fetchStatus(); }, []);

    const runAction = async (action: string, label: string) => {
        setRunning(action);
        log(`Starting: ${label}...`);
        const before = status?.counts;
        try {
            const res = await api.post('/api/sync/debug-test', { action }, { timeout: 600000 });
            const d = res.data;
            if (d.success === false) {
                log(`FAILED: ${d.message}`);
            } else if (action === 'write') {
                log(`Write OK: ${JSON.stringify(d.wrote).slice(0, 100)}`);
            } else if (action === 'read') {
                log(`Read OK: ${d.record_count} records, has_records=${d.has_records}`);
                log(`Data: ${JSON.stringify(d.read).slice(0, 200)}`);
            } else if (d.pushed !== undefined) {
                log(`${label} OK: pushed ${d.pushed}, errors: ${(d.errors || []).length}`);
                if (d.errors?.length) d.errors.slice(0, 3).forEach((e: string) => log(`  err: ${e.slice(0, 120)}`));
            } else if (d.pulled !== undefined) {
                log(`${label} OK: pulled ${d.pulled}, skipped: ${d.skipped || 0}, errors: ${(d.errors || []).length}`);
                if (d.errors?.length) d.errors.slice(0, 3).forEach((e: string) => log(`  err: ${e.slice(0, 120)}`));
            }
        } catch (e: any) {
            log(`ERROR: ${e.response?.data?.message || e.message}`);
        }
        await fetchStatus();
        if (before && status?.counts) {
            const after = status.counts;
            const diffs = Object.entries(after).filter(([k, v]) => (before as any)[k] !== v);
            if (diffs.length) {
                log(`Changed: ${diffs.map(([k, v]) => `${k}: ${(before as any)[k]}→${v}`).join(', ')}`);
            }
        }
        setRunning(null);
    };

    const total = status ? Object.values(status.counts).reduce((a, b) => a + b, 0) : 0;

    return (
        <div className="space-y-4">
            <Card padding="md">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Sync Debug Panel</h2>

                {/* DB Counts */}
                {status && (
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Local DB ({total} total)</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {Object.entries(status.counts).map(([key, val]) => (
                                <div key={key} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{key}</div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{val}</div>
                                </div>
                            ))}
                        </div>
                        {Object.keys(status.sync_meta).length > 0 && (
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                {Object.entries(status.sync_meta).map(([k, v]) => (
                                    <span key={k} className="mr-4">{k}: <code className="text-indigo-600 dark:text-indigo-400">{v}</code></span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Firestore Connectivity</h3>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => runAction('write', 'Write Test')} loading={running === 'write'} disabled={!!running}>
                            Write to _debug/
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => runAction('read', 'Read Test')} loading={running === 'read'} disabled={!!running}>
                            Read from _debug/
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => fetchStatus()} disabled={!!running}>
                            Refresh Counts
                        </Button>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-4">Bulk Sync (optimized)</h3>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => runAction('bulk_push', 'Bulk Push')} loading={running === 'bulk_push'} disabled={!!running}>
                            Bulk Push
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => runAction('bulk_pull', 'Bulk Pull')} loading={running === 'bulk_pull'} disabled={!!running}>
                            Bulk Pull (force)
                        </Button>
                    </div>

                    <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mt-4">Legacy Sync (expensive — uses many reads/writes)</h3>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => runAction('legacy_push', 'Legacy Push')} loading={running === 'legacy_push'} disabled={!!running}>
                            Legacy Push
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => runAction('legacy_pull', 'Legacy Pull')} loading={running === 'legacy_pull'} disabled={!!running}>
                            Legacy Pull (force)
                        </Button>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-4">Mock Data</h3>
                    <div className="flex flex-wrap items-end gap-2">
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Type</label>
                            <select
                                value={mockType}
                                onChange={e => setMockType(e.target.value)}
                                className="px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                                {MOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Count</label>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={mockCount}
                                onChange={e => setMockCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="w-16 px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={async () => {
                                setRunning('insert');
                                log(`Inserting ${mockCount} ${mockType}...`);
                                try {
                                    const res = await api.post('/api/sync/debug-insert', { type: mockType, count: mockCount });
                                    log(`Insert OK: ${res.data.created} ${mockType} created`);
                                } catch (e: any) {
                                    log(`Insert FAIL: ${e.response?.data?.message || e.message}`);
                                }
                                await fetchStatus();
                                setRunning(null);
                            }}
                            loading={running === 'insert'}
                            disabled={!!running}
                        >
                            Insert Mock Data
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                                setRunning('clean');
                                log('Cleaning debug records...');
                                try {
                                    const res = await api.post('/api/sync/debug-clean');
                                    log(`Clean OK: ${res.data.deleted} debug records deleted`);
                                } catch (e: any) {
                                    log(`Clean FAIL: ${e.response?.data?.message || e.message}`);
                                }
                                await fetchStatus();
                                setRunning(null);
                            }}
                            loading={running === 'clean'}
                            disabled={!!running}
                        >
                            Clean Debug Data
                        </Button>
                    </div>
                </div>

                {/* Log */}
                {actionLog.length > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Log</h3>
                            <button onClick={() => setActionLog([])} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto font-mono text-xs text-slate-300 space-y-0.5">
                            {actionLog.map((line, i) => (
                                <div key={i} className={line.includes('ERROR') || line.includes('FAIL') ? 'text-red-400' : line.includes('OK') ? 'text-green-400' : ''}>{line}</div>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
