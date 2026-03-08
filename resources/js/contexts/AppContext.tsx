import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
    darkMode: boolean;
    toggleDarkMode: () => void;
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

function getInitialDarkMode(): boolean {
    try {
        const stored = localStorage.getItem('darkMode');
        if (stored !== null) return stored === 'true';
    } catch {}
    return false;
}

export function AppProvider({ children, pageProps }: AppProviderProps) {
    const [locale, setLocaleState] = useState(pageProps.locale || 'en');
    const [factory, setFactoryState] = useState(pageProps.factory || 'bahbit');
    const [translations, setTranslations] = useState<Record<string, string>>(pageProps.translations || {});
    const [darkMode, setDarkMode] = useState(getInitialDarkMode);
    const factories = pageProps.factories || ['bahbit', 'old_factory', 'station', 'thaabaneya'];

    const fetchTranslations = useCallback(async (lang: string) => {
        try {
            const res = await axios.get(`/api/translations?locale=${lang}`);
            const data = res.data as Record<string, string>;
            i18n.addResourceBundle(lang, 'translation', data, true, true);
            i18n.changeLanguage(lang);
            setTranslations(data);
        } catch {
            // Translations fetch failed — keep current translations
        }
    }, []);

    // Fetch translations on mount only if not already provided by Inertia
    useEffect(() => {
        if (!pageProps.translations || Object.keys(pageProps.translations).length === 0) {
            fetchTranslations(locale);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }, [locale]);

    // Apply dark mode class to <html>
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        try { localStorage.setItem('darkMode', String(darkMode)); } catch {}
    }, [darkMode]);

    const setLocale = useCallback(async (newLocale: string) => {
        await axios.post(`/api/locale/${newLocale}`);
        setLocaleState(newLocale);
        await fetchTranslations(newLocale);
    }, [fetchTranslations]);

    const setFactory = useCallback((newFactory: string) => {
        axios.post('/api/factory', { factory: newFactory }).then(() => {
            setFactoryState(newFactory);
            window.dispatchEvent(new CustomEvent('factory-changed', { detail: newFactory }));
        });
    }, []);

    const toggleDarkMode = useCallback(() => {
        setDarkMode(prev => !prev);
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
        <AppContext.Provider value={{ locale, setLocale, factory, setFactory, factories, t, translations, isRtl, darkMode, toggleDarkMode }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
}
