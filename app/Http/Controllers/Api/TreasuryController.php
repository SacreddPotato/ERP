<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TreasuryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreasuryController extends Controller
{
    public function __construct(protected TreasuryService $service) {}

    public function summary(): JsonResponse
    {
        return response()->json($this->service->getSummary());
    }

    public function initialize(Request $request): JsonResponse
    {
        try {
            $config = $this->service->initialize(
                (float) $request->input('starting_capital'),
                $request->input('fiscal_year_start'),
                $request->input('currency', 'EGP'),
                $request->input('notes')
            );
            return response()->json(['success' => true, 'config' => $config]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function reset(Request $request): JsonResponse
    {
        try {
            $this->service->resetInitialization($request->input('password'));
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
