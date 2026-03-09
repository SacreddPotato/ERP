<?php

namespace App\Providers;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Track electron-updater events so the frontend can poll for progress
        Event::listen(\Native\Laravel\Events\AutoUpdater\UpdateAvailable::class, function ($event) {
            Cache::put('update_status', [
                'status' => 'downloading',
                'version' => $event->version,
                'percent' => 0,
            ], 3600);
        });

        Event::listen(\Native\Laravel\Events\AutoUpdater\DownloadProgress::class, function ($event) {
            $current = Cache::get('update_status', []);
            Cache::put('update_status', array_merge($current, [
                'status' => 'downloading',
                'percent' => round($event->percent, 1),
                'transferred' => $event->transferred,
                'total' => $event->total,
            ]), 3600);
        });

        Event::listen(\Native\Laravel\Events\AutoUpdater\UpdateDownloaded::class, function ($event) {
            Cache::put('update_status', [
                'status' => 'ready',
                'version' => $event->version,
            ], 3600);
        });

        Event::listen(\Native\Laravel\Events\AutoUpdater\Error::class, function ($event) {
            Cache::put('update_status', [
                'status' => 'error',
                'message' => $event->message,
            ], 3600);
        });
    }
}
