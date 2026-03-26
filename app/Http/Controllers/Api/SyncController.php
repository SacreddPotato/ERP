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
            // Use bulk push (much fewer Firestore writes) + delta push for individual docs
            $bulkResult = $service->bulkPush();
            $deltaResult = $service->pushAll();
            return response()->json([
                'success' => true,
                'result' => [
                    'pushed' => $bulkResult['pushed'] + $deltaResult['pushed'],
                    'errors' => array_merge($bulkResult['errors'], $deltaResult['errors']),
                ],
                'warnings' => array_merge($bulkResult['errors'], $deltaResult['errors']),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function forcePull(): JsonResponse
    {
        set_time_limit(600);
        try {
            $service = app(FirebaseSyncService::class);
            // Use bulk pull (much cheaper — ~30 reads vs ~20k reads)
            // Falls back to legacy if bulk data doesn't exist yet
            $result = $service->bulkPull();
            if ($result['pulled'] === 0) {
                // Bulk data not available or empty, fall back to legacy
                $result = $service->forcePull();
                // Now create bulk snapshot for next time
                $service->bulkPush();
            }
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
