<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class NativeAppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // NativePHP window configuration will be added when nativephp/desktop is installed.
        // Window::open()->title('EnterprisFlow')->width(1200)->height(800)->rememberState();
        //
        // Updater config via .env:
        // NATIVEPHP_UPDATER_ENABLED=true
        // NATIVEPHP_UPDATER_PROVIDER=github
        // GITHUB_REPO=your-username/EnterprisFlow
    }
}
