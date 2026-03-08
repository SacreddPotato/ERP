<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function switchLocale(Request $request, string $locale): JsonResponse
    {
        if (in_array($locale, ['en', 'ar'])) {
            session(['locale' => $locale]);
            app()->setLocale($locale);
        }
        return response()->json(['success' => true, 'locale' => $locale]);
    }

    public function switchFactory(Request $request): JsonResponse
    {
        $factory = $request->input('factory');
        session(['current_factory' => $factory]);
        return response()->json(['success' => true, 'factory' => $factory]);
    }

    public function translations(): JsonResponse
    {
        $locale = app()->getLocale();
        $path = lang_path("{$locale}.json");
        $translations = file_exists($path) ? json_decode(file_get_contents($path), true) : [];
        return response()->json($translations);
    }
}
