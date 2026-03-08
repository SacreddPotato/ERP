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
    const [syncAction, setSyncAction] = useState('');
    const [lastResult, setLastResult] = useState<SyncResult | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState('');

    const executePull = async () => {
        setSyncing(true); setSyncAction('pull'); setLastResult(null);
        try {
            const res = await api.post('/api/sync/pull');
            setLastResult(res.data.result);
            toast(`${t('sync_complete')} - ${res.data.result.pulled} pulled, ${res.data.result.skipped} skipped`, 'success');
        } catch (e: any) {
            toast(e.response?.data?.message || t('sync_failed'), 'error');
        }
        setSyncing(false);
    };

    const executePush = async () => {
        setSyncing(true); setSyncAction('push'); setLastResult(null); setShowConfirm(false);
        try {
            const res = await api.post('/api/sync/push');
            setLastResult(res.data.result);
            toast(`${t('sync_complete')} - ${res.data.result.pushed} pushed`, 'success');
        } catch (e: any) {
            toast(e.response?.data?.message || t('sync_failed'), 'error');
        }
        setSyncing(false);
    };

    const executeForcePull = async () => {
        setSyncing(true); setSyncAction('force_pull'); setLastResult(null); setShowConfirm(false);
        try {
            const res = await api.post('/api/sync/force-pull');
            setLastResult(res.data.result);
            toast(`${t('sync_complete')} - ${res.data.result.pulled} pulled`, 'success');
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3.5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Firebase Sync</span>
                    {syncing && (
                        <div className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-xs text-indigo-600 font-medium">{t('sync_progress')}</span>
                        </div>
                    )}
                    {lastResult && lastResult.errors.length > 0 && (
                        <span className="text-xs text-amber-600">{lastResult.errors.length} warnings</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={executePull} disabled={syncing} title={t('title_pull')}>
                        {t('btn_pull')}
                    </Button>
                    <Button size="sm" variant="success" onClick={() => requestConfirm('push')} disabled={syncing} title={t('title_push')}>
                        {t('btn_push')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => requestConfirm('force_pull')} disabled={syncing} title={t('title_force_pull')}>
                        {t('btn_force_pull')}
                    </Button>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title={t('btn_confirm')}>
                <p className="text-sm text-gray-600 mb-4">
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
