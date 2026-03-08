<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LedgerLog;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionLogController extends Controller
{
    public function __construct(protected StockService $stockService) {}

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
}
