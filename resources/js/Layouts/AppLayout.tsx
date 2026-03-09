import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { ToastContainer, toast } from '../Components/ui/Toast';
import api from '../lib/api';

interface AppLayoutProps {
    children: React.ReactNode;
}

type UpdateState =
    | { phase: 'idle' }
    | { phase: 'checking' }
    | { phase: 'available'; version: string; downloadUrl: string }
    | { phase: 'downloading'; version: string; downloadUrl: string; percent: number }
    | { phase: 'ready'; version: string }
    | { phase: 'installing' }
    | { phase: 'error'; message: string; downloadUrl: string };

export default function AppLayout({ children }: AppLayoutProps) {
    const { t, locale, setLocale, factory, setFactory, factories, darkMode, toggleDarkMode, appVersion } = useApp();
    const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' });
    const [zoom, setZoom] = useState(1.0);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    // Poll electron-updater status when downloading
    const pollCountRef = useRef(0);
    const startPolling = useCallback((version: string, downloadUrl: string) => {
        stopPolling();
        pollCountRef.current = 0;
        pollingRef.current = setInterval(async () => {
            pollCountRef.current++;
            try {
                const res = await api.get('/api/update-status');
                const s = res.data as { status: string; version?: string; percent?: number; message?: string };
                if (s.status === 'downloading') {
                    pollCountRef.current = 0; // Reset counter when actively downloading
                    setUpdate({ phase: 'downloading', version, downloadUrl, percent: s.percent ?? 0 });
                } else if (s.status === 'ready') {
                    stopPolling();
                    setUpdate({ phase: 'ready', version: s.version || version });
                } else if (s.status === 'error') {
                    stopPolling();
                    setUpdate({ phase: 'error', message: s.message || 'Download failed', downloadUrl });
                } else if (pollCountRef.current >= 15) {
                    // Status stayed idle for 30s — updater not running (dev mode or unsupported)
                    stopPolling();
                    setUpdate({ phase: 'available', version, downloadUrl });
                }
            } catch {
                stopPolling();
            }
        }, 2000);
    }, [stopPolling]);

    useEffect(() => () => stopPolling(), [stopPolling]);

    const checkForUpdates = useCallback(async (silent = false) => {
        if (update.phase === 'checking' || update.phase === 'downloading' || update.phase === 'ready') return;
        setUpdate({ phase: 'checking' });
        try {
            const res = await api.post('/api/check-for-updates');
            const data = res.data as { current?: string; latest?: string; has_update?: boolean; download_url?: string; error?: string };
            if (data.error) {
                if (!silent) toast(data.error, 'error');
                setUpdate({ phase: 'idle' });
            } else if (data.has_update && data.latest) {
                const downloadUrl = data.download_url || '';
                setUpdate({ phase: 'available', version: data.latest, downloadUrl });
                // Start polling for electron-updater progress (it was triggered by the backend)
                startPolling(data.latest, downloadUrl);
            } else {
                if (!silent) toast(t('update_up_to_date', { version: data.current || appVersion }), 'info');
                setUpdate({ phase: 'idle' });
            }
        } catch {
            if (!silent) toast(t('update_check_failed'), 'error');
            setUpdate({ phase: 'idle' });
        }
    }, [update.phase, t, appVersion, startPolling]);

    // Auto-check on startup (silent — no "up to date" toast)
    useEffect(() => {
        const timer = setTimeout(() => checkForUpdates(true), 3000);
        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const manualDownload = async (url: string) => {
        try {
            await api.post('/api/open-url', { url });
        } catch {
            window.open(url, '_blank');
        }
    };

    const installUpdate = async () => {
        setUpdate({ phase: 'installing' });
        try {
            await api.post('/api/update-install');
        } catch {
            toast(t('update_install_failed'), 'error');
            setUpdate({ phase: 'idle' });
        }
    };

    const zoomRef = useRef<HTMLDivElement>(null);

    const applyZoom = (factor: number) => {
        const clamped = Math.max(0.5, Math.min(2.0, Math.round(factor * 10) / 10));
        setZoom(clamped);
        if (zoomRef.current) {
            zoomRef.current.style.transform = `scale(${clamped})`;
            zoomRef.current.style.transformOrigin = 'top left';
            zoomRef.current.style.width = `${100 / clamped}%`;
            zoomRef.current.style.height = `${100 / clamped}vh`;
        }
        localStorage.setItem('app_zoom', String(clamped));
    };

    const changeZoom = (delta: number) => applyZoom(zoom + delta);

    // Restore saved zoom on mount
    useEffect(() => {
        const saved = localStorage.getItem('app_zoom');
        if (saved) {
            const factor = parseFloat(saved);
            if (!isNaN(factor) && factor >= 0.5 && factor <= 2.0) {
                setZoom(factor);
            }
        }
    }, []);

    // Apply zoom after ref is available
    useEffect(() => {
        if (zoomRef.current) applyZoom(zoom);
    }); // eslint-disable-line react-hooks/exhaustive-deps

    const factoryLabels: Record<string, string> = {
        bahbit: t('loc_bahbit'),
        old_factory: t('loc_old_factory'),
        station: t('loc_station'),
        thaabaneya: t('loc_thaabaneya'),
    };

    const isChecking = update.phase === 'checking';
    const showBanner = update.phase !== 'idle' && update.phase !== 'checking';

    return (
        <div ref={zoomRef} className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-900 dark:to-slate-950 transition-colors duration-300">
            <ToastContainer />

            {/* Header — acts as window drag region in desktop mode */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-sm relative" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
                {/* Custom window controls (frameless mode) */}
                <div className="absolute top-0 right-0 flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <button
                        onClick={() => api.post('/api/window/minimize').catch(() => {})}
                        className="w-11 h-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Minimize"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" d="M5 12h14" />
                        </svg>
                    </button>
                    <button
                        onClick={() => api.post('/api/window/maximize').catch(() => {})}
                        className="w-11 h-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Maximize"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="4" y="4" width="16" height="16" rx="1" />
                        </svg>
                    </button>
                    <button
                        onClick={() => api.post('/api/window/close').catch(() => {})}
                        className="w-11 h-full flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-colors"
                        title="Close"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="max-w-[1600px] mx-auto pl-6 pr-[140px] py-3.5">
                    <div className="flex items-center justify-between">
                        {/* Logo & Title */}
                        <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-sm">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('app_title')}</h1>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">{t('app_subtitle')}</p>
                            </div>
                        </div>

                        {/* Controls — must be non-draggable for interaction */}
                        <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                            {/* Factory Selector */}
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-600">
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <select
                                    value={factory}
                                    onChange={(e) => setFactory(e.target.value)}
                                    className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 border-0 focus:ring-0 cursor-pointer py-0 pr-7 pl-0"
                                >
                                    {factories.map((f) => (
                                        <option key={f} value={f}>{factoryLabels[f] || f}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dark Mode Toggle */}
                            <button
                                onClick={toggleDarkMode}
                                className="relative w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                aria-label="Toggle dark mode"
                            >
                                {darkMode ? (
                                    <svg key="moon" className="w-4.5 h-4.5 text-amber-400 animate-toggle-icon" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                                    </svg>
                                ) : (
                                    <svg key="sun" className="w-4.5 h-4.5 text-amber-500 animate-toggle-icon" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                                    </svg>
                                )}
                            </button>

                            {/* Zoom Controls */}
                            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                                <button
                                    onClick={() => changeZoom(-0.1)}
                                    disabled={zoom <= 0.5}
                                    className="w-8 h-9 flex items-center justify-center bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-30"
                                    title="Zoom out"
                                >
                                    <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => applyZoom(1.0)}
                                    className="px-1.5 h-9 flex items-center justify-center bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-x border-slate-200 dark:border-slate-600"
                                    title="Reset zoom"
                                >
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums w-8 text-center">{Math.round(zoom * 100)}%</span>
                                </button>
                                <button
                                    onClick={() => changeZoom(0.1)}
                                    disabled={zoom >= 2.0}
                                    className="w-8 h-9 flex items-center justify-center bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-30"
                                    title="Zoom in"
                                >
                                    <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                    </svg>
                                </button>
                            </div>

                            {/* Language Toggle */}
                            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
                                <button
                                    onClick={() => setLocale('en')}
                                    className={`px-3 py-2 text-xs font-semibold transition-all ${
                                        locale === 'en'
                                            ? 'bg-slate-800 dark:bg-indigo-600 text-white'
                                            : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => setLocale('ar')}
                                    className={`px-3 py-2 text-xs font-semibold transition-all ${
                                        locale === 'ar'
                                            ? 'bg-slate-800 dark:bg-indigo-600 text-white'
                                            : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    AR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Update Banner */}
            {showBanner && (
                <div className="bg-indigo-600 dark:bg-indigo-700 text-white">
                    <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {update.phase === 'downloading' ? (
                                <svg className="w-5 h-5 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            ) : update.phase === 'ready' ? (
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : update.phase === 'installing' ? (
                                <svg className="w-5 h-5 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            )}
                            <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium">
                                    {update.phase === 'available' && t('update_banner', { current: appVersion, version: update.version })}
                                    {update.phase === 'downloading' && t('update_downloading', { version: update.version, percent: String(Math.round(update.percent)) })}
                                    {update.phase === 'ready' && t('update_ready', { version: update.version })}
                                    {update.phase === 'installing' && t('update_installing')}
                                    {update.phase === 'error' && t('update_error', { message: update.message })}
                                </span>
                                {/* Progress bar */}
                                {update.phase === 'downloading' && (
                                    <div className="mt-1.5 h-1.5 bg-indigo-400/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(update.percent, 100)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {update.phase === 'ready' && (
                                <button
                                    onClick={installUpdate}
                                    className="px-3.5 py-1.5 bg-white text-indigo-700 text-xs font-bold rounded-md hover:bg-indigo-50 transition-colors"
                                >
                                    {t('btn_restart_update')}
                                </button>
                            )}
                            {(update.phase === 'available' || update.phase === 'error') && 'downloadUrl' in update && update.downloadUrl && (
                                <button
                                    onClick={() => manualDownload(update.downloadUrl)}
                                    className="px-3.5 py-1.5 bg-white text-indigo-700 text-xs font-bold rounded-md hover:bg-indigo-50 transition-colors"
                                >
                                    {t('btn_download_update')}
                                </button>
                            )}
                            {update.phase !== 'installing' && (
                                <button
                                    onClick={() => { stopPolling(); setUpdate({ phase: 'idle' }); }}
                                    className="p-1 rounded hover:bg-indigo-500 transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content — sole scroll container */}
            <main className="flex-1 overflow-y-auto min-h-0">
                <div className="max-w-[1600px] w-full mx-auto px-6 py-6">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500">v{appVersion}</span>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{t('footer_contact')}</p>
                    <button
                        onClick={() => checkForUpdates(false)}
                        disabled={isChecking}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                    >
                        <svg className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t('btn_check_updates')}
                    </button>
                </div>
            </footer>
        </div>
    );
}
