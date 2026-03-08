import './bootstrap';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { AppProvider } from './contexts/AppContext';

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true }) as Record<string, any>;
        return pages[`./Pages/${name}.tsx`];
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <I18nextProvider i18n={i18n}>
                <AppProvider pageProps={props.initialPage.props as any}>
                    <App {...props} />
                </AppProvider>
            </I18nextProvider>
        );
    },
});
