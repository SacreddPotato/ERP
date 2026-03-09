<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LedgerLog;
use App\Services\LedgerService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionLogController extends Controller
{
    public function __construct(
        protected StockService $stockService,
        protected LedgerService $ledgerService,
    ) {}

    public function stock(Request $request): JsonResponse
    {
        $logs = $this->stockService->getFilteredTransactions($request->all());
        return response()->json($logs);
    }

    public function ledger(Request $request): JsonResponse
    {
        $query = LedgerLog::query();

        if ($request->filled('keyword')) {
            $keyword = $request->input('keyword');
            $query->where(function ($q) use ($keyword) {
                $q->where('entity_code', 'like', "%{$keyword}%")
                  ->orWhere('entity_name', 'like', "%{$keyword}%")
                  ->orWhere('statement', 'like', "%{$keyword}%");
            });
        }
        if ($request->filled('ledger_type')) {
            $query->where('ledger_type', $request->input('ledger_type'));
        }
        if ($request->filled('date_from')) {
            $query->where('logged_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->where('logged_at', '<=', $request->input('date_to') . ' 23:59:59');
        }
        if ($request->filled('trans_date_from')) {
            $query->where('transaction_date', '>=', $request->input('trans_date_from'));
        }
        if ($request->filled('trans_date_to')) {
            $query->where('transaction_date', '<=', $request->input('trans_date_to'));
        }

        $logs = $query->orderByDesc('logged_at')->get();
        return response()->json($logs);
    }

    /**
     * Unified reverse endpoint for both stock and ledger logs.
     * Accepts: { log_type: 'stock' | 'ledger', id: number }
     */
    public function reverse(Request $request): JsonResponse
    {
        $request->validate([
            'log_type' => 'required|in:stock,ledger',
            'id' => 'required|integer',
        ]);

        try {
            if ($request->input('log_type') === 'stock') {
                $this->stockService->reverseTransaction($request->input('id'));
            } else {
                $this->ledgerService->reverseTransaction($request->input('id'));
            }
            return response()->json(['success' => true, 'message' => __('msg_reversed')]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
