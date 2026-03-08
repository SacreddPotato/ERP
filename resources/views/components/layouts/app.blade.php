<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" dir="{{ app()->getLocale() === 'ar' ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ __('app_title') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @livewireStyles
</head>
<body class="bg-gray-100 min-h-screen text-gray-800">
    <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-full mx-auto px-4 py-3">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-xl font-bold text-gray-900">{{ __('app_title') }}</h1>
                    <p class="text-xs text-gray-500">{{ __('app_subtitle') }}</p>
                </div>
                <div class="flex items-center gap-4">
                    <livewire:firebase-sync-panel />
                    <livewire:language-switcher />
                </div>
            </div>
        </div>
    </header>

    <main class="max-w-full mx-auto px-4 py-4">
        {{ $slot }}
    </main>

    <footer class="text-center text-xs text-gray-400 py-2">
        {{ __('footer_contact') }}
    </footer>

    @livewireScripts
</body>
</html>
