import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { router } from '@inertiajs/react';
import i18n from '../i18n';
import axios from 'axios';

interface AppContextType {
    locale: string;
    setLocale: (locale: string) => void;
    factory: string;
    setFactory: (factory: string) => void;
    factories: string[];
    t: (key: string, params?: Record<string, string | number>) => string;
    translations: Record<string, string>;
    isRtl: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

interface AppProviderProps {
    children: React.ReactNode;
    pageProps: {
        locale?: string;
        factory?: string;
        factories?: string[];
        translations?: Record<string, string>;
    };
}

export function AppProvider({ children, pageProps }: AppProviderProps) {
    const [locale, setLocaleState] = useState(pageProps.locale || 'en');
    const [factory, setFactoryState] = useState(pageProps.factory || 'bahbit');
    const [translations, setTranslations] = useState<Record<string, string>>(pageProps.translations || {});
    const factories = pageProps.factories || ['bahbit', 'old_factory', 'station', 'thaabaneya'];

    useEffect(() => {
        if (pageProps.translations) {
            i18n.addResourceBundle(locale, 'translation', pageProps.translations, true, true);
            i18n.changeLanguage(locale);
            setTranslations(pageProps.translations);
        }
    }, [pageProps.translations, locale]);

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }, [locale]);

    const setLocale = useCallback((newLocale: string) => {
        axios.post(`/api/locale/${newLocale}`).then(() => {
            setLocaleState(newLocale);
            router.reload();
        });
    }, []);

    const setFactory = useCallback((newFactory: string) => {
        axios.post('/api/factory', { factory: newFactory }).then(() => {
            setFactoryState(newFactory);
            window.dispatchEvent(new CustomEvent('factory-changed', { detail: newFactory }));
        });
    }, []);

    const t = useCallback((key: string, params?: Record<string, string | number>) => {
        let value = translations[key] || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                value = value.replace(`:${k}`, String(v));
            });
        }
        return value;
    }, [translations]);

    const isRtl = locale === 'ar';

    return (
        <AppContext.Provider value={{ locale, setLocale, factory, setFactory, factories, t, translations, isRtl }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
}
