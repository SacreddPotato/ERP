import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ToastContainer, toast } from '../Components/ui/Toast';
import api from '../lib/api';

interface AppLayoutProps {
    children: React.ReactNode;
}

interface UpdateInfo {
    version: string;
    downloadUrl: string;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const { t, locale, setLocale, factory, setFactory, factories, darkMode, toggleDarkMode, appVersion } = useApp();
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

    const checkForUpdates = async () => {
        setCheckingUpdate(true);
        try {
            const res = await api.post('/api/check-for-updates');
            const data = res.data as { current?: string; latest?: string; has_update?: boolean; download_url?: string; error?: string };
            if (data.error) {
                toast(data.error, 'error');
            } else if (data.has_update && data.latest) {
                setUpdateInfo({ version: data.latest, downloadUrl: data.download_url || '' });
            } else {
                toast(t('update_up_to_date', { version: data.current || appVersion }), 'info');
            }
        } catch {
            toast(t('update_check_failed'), 'error');
        }
        setCheckingUpdate(false);
    };

    const downloadUpdate = async () => {
        if (!updateInfo?.downloadUrl) return;
        try {
            await api.post('/api/open-url', { url: updateInfo.downloadUrl });
        } catch {
            // Fallback: open in current window (Electron may handle this)
            window.open(updateInfo.downloadUrl, '_blank');
        }
    };

    const factoryLabels: Record<string, string> = {
        bahbit: t('loc_bahbit'),
        old_factory: t('loc_old_factory'),
        station: t('loc_station'),
        thaabaneya: t('loc_thaabaneya'),
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100/80 dark:from-slate-900 dark:to-slate-950 transition-colors duration-300">
            <ToastContainer />

            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 shadow-sm">
                <div className="max-w-[1600px] mx-auto px-6 py-3.5">
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

                        {/* Controls */}
                        <div className="flex items-center gap-2.5">
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
            {updateInfo && (
                <div className="bg-indigo-600 dark:bg-indigo-700 text-white">
                    <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span className="text-sm font-medium">
                                {t('update_banner', { current: appVersion, version: updateInfo.version })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {updateInfo.downloadUrl && (
                                <button
                                    onClick={downloadUpdate}
                                    className="px-3.5 py-1.5 bg-white text-indigo-700 text-xs font-bold rounded-md hover:bg-indigo-50 transition-colors"
                                >
                                    {t('btn_download_update')}
                                </button>
                            )}
                            <button
                                onClick={() => setUpdateInfo(null)}
                                className="p-1 rounded hover:bg-indigo-500 transition-colors"
                                aria-label="Dismiss"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mt-auto">
                <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500">v{appVersion}</span>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{t('footer_contact')}</p>
                    <button
                        onClick={checkForUpdates}
                        disabled={checkingUpdate}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                    >
                        <svg className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t('btn_check_updates')}
                    </button>
                </div>
            </footer>
        </div>
    );
}
