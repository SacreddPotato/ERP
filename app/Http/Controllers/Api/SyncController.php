<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FirebaseSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function pull(): JsonResponse
    {
        set_time_limit(300);
        try {
            $service = app(FirebaseSyncService::class);
            $result = $service->pullAll(true);
            return response()->json([
                'success' => true,
                'result' => $result,
                'warnings' => $result['errors'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function push(): JsonResponse
    {
        set_time_limit(300);
        try {
            $service = app(FirebaseSyncService::class);
            $result = $service->pushAll();
            return response()->json([
                'success' => true,
                'result' => $result,
                'warnings' => $result['errors'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function forcePull(): JsonResponse
    {
        set_time_limit(300);
        try {
            $service = app(FirebaseSyncService::class);
            $result = $service->forcePull();
            return response()->json([
                'success' => true,
                'result' => $result,
                'warnings' => $result['errors'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
