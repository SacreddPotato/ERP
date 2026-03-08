import React from 'react';
import { useApp } from '../contexts/AppContext';
import { ToastContainer } from '../Components/ui/Toast';

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const { t, locale, setLocale, factory, setFactory, factories, isRtl } = useApp();

    const factoryLabels: Record<string, string> = {
        bahbit: t('loc_bahbit'),
        old_factory: t('loc_old_factory'),
        station: t('loc_station'),
        thaabaneya: t('loc_thaabaneya'),
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-indigo-50/30">
            <ToastContainer />

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-40">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo & Title */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('app_title')}</h1>
                                <p className="text-xs text-gray-500">{t('app_subtitle')}</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3">
                            {/* Factory Selector */}
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <select
                                    value={factory}
                                    onChange={(e) => setFactory(e.target.value)}
                                    className="bg-transparent text-sm font-medium text-gray-700 border-0 focus:ring-0 cursor-pointer py-0 pr-8 pl-0"
                                >
                                    {factories.map((f) => (
                                        <option key={f} value={f}>{factoryLabels[f] || f}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Language Toggle */}
                            <div className="flex rounded-xl overflow-hidden border border-gray-200">
                                <button
                                    onClick={() => setLocale('en')}
                                    className={`px-3 py-2 text-xs font-semibold transition-all ${
                                        locale === 'en'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    EN
                                </button>
                                <button
                                    onClick={() => setLocale('ar')}
                                    className={`px-3 py-2 text-xs font-semibold transition-all ${
                                        locale === 'ar'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    AR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1600px] mx-auto px-6 py-6">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200/60 bg-white/50 mt-8">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <p className="text-center text-xs text-gray-400">{t('footer_contact')}</p>
                </div>
            </footer>
        </div>
    );
}
