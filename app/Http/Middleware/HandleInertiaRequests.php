<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $locale = session('locale', app()->getLocale());
        app()->setLocale($locale);

        $path = lang_path("{$locale}.json");
        $translations = file_exists($path) ? json_decode(file_get_contents($path), true) : [];

        return [
            ...parent::share($request),
            'locale' => $locale,
            'translations' => $translations,
            'factory' => session('current_factory', config('enterprisflow.default_factory')),
            'factories' => config('enterprisflow.factories'),
            'appVersion' => config('enterprisflow.version'),
        ];
    }
}
