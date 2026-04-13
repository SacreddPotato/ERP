import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { toast } from '../ui/Toast';
import api from '../../lib/api';
import { SyncResult } from '../../types';

export default function FirebaseSyncPanel() {
    const { t } = useApp();
    const [syncing, setSyncing] = useState(false);
    const [syncAction, setSyncAction] = useState<'pull' | 'push' | 'force_pull' | ''>('');
    const [lastResult, setLastResult] = useState<SyncResult | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState('');

    const formatSyncWarning = (warning: string): string => {
        const [contextPart, ...detailsParts] = warning.split(': ');
        const details = detailsParts.join(': ').trim();

        const contextTokens = contextPart
            .split('/')
            .map((token) => token.trim())
            .filter(Boolean)
            .map((token) => token.replace(/[_-]/g, ' '));

        const contextLabel = contextTokens
            .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
            .join(' • ');

        const cleanDetails = details
            .replace(/SQLSTATE\[[^\]]+\]:\s*/g, '')
            .replace(/\(SQL:\s.+\)$/g, '')
            .trim();

        if (contextLabel && cleanDetails) {
            return `${contextLabel}: ${cleanDetails}`;
        }

        if (contextLabel) {
            return contextLabel;
        }

        return warning;
    };

    const warningMessages = (lastResult?.errors ?? []).map(formatSyncWarning);

    const syncMessage = (): string => {
        if (syncAction === 'pull') return t('sync_downloading');
        if (syncAction === 'push') return t('sync_uploading');
        if (syncAction === 'force_pull') return t('sync_replacing');
        return t('sync_progress');
    };

    const resultMessage = (result: SyncResult, action: string): string => {
        if (action === 'push') {
            return t('sync_uploaded').replace(':count', String(result.pushed ?? 0));
        }
        if (action === 'force_pull') {
            return t('sync_replaced').replace(':count', String(result.pulled ?? 0));
        }
        // pull
        if ((result.pulled ?? 0) === 0 && (result.skipped ?? 0) === 0) {
            return t('sync_no_data');
        }
        return t('sync_downloaded')
            .replace(':count', String(result.pulled ?? 0))
            .replace(':skipped', String(result.skipped ?? 0));
    };

    const syncTimeout = 15 * 60 * 1000; // 15 minutes

    const executePull = async () => {
        setSyncing(true); setSyncAction('pull'); setLastResult(null);
        try {
            const res = await api.post('/api/sync/pull', {}, { timeout: syncTimeout });
            setLastResult(res.data.result);
            const msg = resultMessage(res.data.result, 'pull');
            toast(msg, (res.data.result.pulled ?? 0) > 0 ? 'success' : 'info');
        } catch (e: any) {
            toast(e.response?.data?.message || t('sync_failed'), 'error');
        }
        setSyncing(false);
    };

    const executePush = async () => {
        setSyncing(true); setSyncAction('push'); setLastResult(null); setShowConfirm(false);
        try {
            const res = await api.post('/api/sync/push', {}, { timeout: syncTimeout });
            setLastResult(res.data.result);
            toast(resultMessage(res.data.result, 'push'), 'success');
        } catch (e: any) {
            toast(e.response?.data?.message || t('sync_failed'), 'error');
        }
        setSyncing(false);
    };

    const executeForcePull = async () => {
        setSyncing(true); setSyncAction('force_pull'); setLastResult(null); setShowConfirm(false);
        try {
            const res = await api.post('/api/sync/force-pull', {}, { timeout: syncTimeout });
            setLastResult(res.data.result);
            toast(resultMessage(res.data.result, 'force_pull'), 'success');
        } catch (e: any) {
            toast(e.response?.data?.message || t('sync_failed'), 'error');
        }
        setSyncing(false);
    };

    const requestConfirm = (action: string) => {
        setConfirmAction(action);
        setShowConfirm(true);
    };

    const handleConfirm = () => {
        if (confirmAction === 'push') executePush();
        else if (confirmAction === 'force_pull') executeForcePull();
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 px-5 py-3.5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cloud Sync</span>
                        {lastResult && warningMessages.length > 0 && !syncing && (
                            <span className="text-xs text-amber-600">
                                {t('sync_warnings_badge').replace(':count', String(warningMessages.length))}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={executePull} disabled={syncing} title={t('title_pull')}>
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {t('btn_pull')}
                        </Button>
                        <Button size="sm" variant="success" onClick={() => requestConfirm('push')} disabled={syncing} title={t('title_push')}>
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {t('btn_push')}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => requestConfirm('force_pull')} disabled={syncing} title={t('title_force_pull')}>
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {t('btn_force_pull')}
                        </Button>
                    </div>
                </div>

                {/* Progress bar */}
                {syncing && (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <svg className="animate-spin h-3.5 w-3.5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-xs text-indigo-600 font-medium">{syncMessage()}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-progress-indeterminate" />
                        </div>
                    </div>
                )}

                {lastResult && warningMessages.length > 0 && !syncing && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/50 dark:bg-amber-900/20">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                            {t('sync_warnings_title')}
                        </p>
                        <ul className="mt-1 space-y-1">
                            {warningMessages.slice(0, 5).map((message, idx) => (
                                <li key={`${idx}-${message}`} className="text-xs text-amber-700 dark:text-amber-200">
                                    • {message}
                                </li>
                            ))}
                        </ul>
                        {warningMessages.length > 5 && (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-200">
                                {t('sync_warnings_more').replace(':count', String(warningMessages.length - 5))}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title={t('btn_confirm')}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {confirmAction === 'push' ? t('confirm_push') : t('confirm_force_pull')}
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setShowConfirm(false)}>{t('btn_cancel')}</Button>
                    <Button
                        variant={confirmAction === 'force_pull' ? 'danger' : 'success'}
                        onClick={handleConfirm}
                    >
                        {t('btn_confirm')}
                    </Button>
                </div>
            </Modal>
        </>
    );
}
