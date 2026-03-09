<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/{any?}', function () {
    $locale = app()->getLocale();
    $path = lang_path("{$locale}.json");
    $translations = file_exists($path) ? json_decode(file_get_contents($path), true) : [];

    return Inertia::render('Dashboard', [
        'translations' => $translations,
        'appVersion' => config('nativephp.version'),
    ]);
})->where('any', '.*')->name('home');
