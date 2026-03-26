<?php

namespace App\Http\Controllers\Api;

use App\Enums\LedgerType;
use App\Http\Controllers\Controller;
use App\Services\LedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LedgerController extends Controller
{
    public function __construct(protected LedgerService $service) {}

    public function index(Request $request, string $type): JsonResponse
    {
        $ledgerType = LedgerType::from($type);
        $perPage = (int) $request->input('per_page', 25);
        $page = (int) $request->input('page', 1);
        $result = $this->service->getAll($ledgerType, $request->only(['search', 'payment_method', 'document_number', 'statement', 'date_from', 'date_to']), $perPage, $page);
        $totals = $result['totals'];

        $txMatchCodes = [];
        $txSearchTerm = $request->input('tx_search');
        if ($txSearchTerm) {
            $txMatchCodes = $this->service->getEntityCodesWithMatchingTransactions($ledgerType, $txSearchTerm);
            $column = $ledgerType->codeColumn();
            $model = $ledgerType->modelClass();

            if ($request->filled('search')) {
                // Both active — intersect: entity must match name AND have matching transactions
                $result['data'] = $result['data']->filter(fn ($e) => in_array($e->{$column}, $txMatchCodes));
                $result['total'] = $result['data']->count();
                $result['data'] = $result['data']->values();
            } else {
                // No entity search — filter to only entities with matching transactions
                if (!empty($txMatchCodes)) {
                    $result['data'] = $model::whereIn($column, $txMatchCodes)->orderBy($column)->get();
                    $result['total'] = count($txMatchCodes);
                } else {
                    $result['data'] = collect();
                    $result['total'] = 0;
                }
            }

            // Recompute totals from the full tx-filtered set
            if (!empty($txMatchCodes)) {
                $txQuery = $model::whereIn($column, $txMatchCodes);
                if ($request->filled('search')) {
                    $txQuery->search($request->input('search'));
                }
                $totals = [
                    'total_balance' => (float) (clone $txQuery)->sum('balance'),
                    'total_opening' => (float) (clone $txQuery)->sum('opening_balance'),
                    'total_debit' => (float) (clone $txQuery)->sum('debit'),
                    'total_credit' => (float) (clone $txQuery)->sum('credit'),
                    'count' => (clone $txQuery)->count(),
                ];
            } else {
                $totals = ['total_balance' => 0, 'total_opening' => 0, 'total_debit' => 0, 'total_credit' => 0, 'count' => 0];
            }
        }

        // When date filters are active, return matching codes for auto-expand
        if ($request->filled('date_from') || $request->filled('date_to')) {
            $dateCodes = $this->service->getEntityCodesInDateRange($ledgerType, $request->input('date_from'), $request->input('date_to'));
            $txMatchCodes = array_values(array_unique(array_merge($txMatchCodes, $dateCodes)));
        }

        return response()->json([
            'entities' => $result['data'],
            'totals' => $totals,
            'total' => $result['total'],
            'tx_match_codes' => $txMatchCodes,
        ]);
    }

    public function generateCode(string $type): JsonResponse
    {
        $ledgerType = LedgerType::from($type);
        return response()->json(['code' => $this->service->generateNextCode($ledgerType)]);
    }

    public function checkCode(Request $request, string $type): JsonResponse
    {
        $ledgerType = LedgerType::from($type);
        $entity = $this->service->checkExists($ledgerType, $request->input('code'));
        return response()->json(['exists' => !!$entity, 'entity' => $entity]);
    }

    public function store(Request $request, string $type): JsonResponse
    {
        try {
            $ledgerType = LedgerType::from($type);
            $entity = $this->service->addOrUpdate($ledgerType, $request->all());
            return response()->json(['success' => true, 'entity' => $entity]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request, string $type): JsonResponse
    {
        try {
            $ledgerType = LedgerType::from($type);
            $entity = $this->service->editEntity($ledgerType, $request->input('code'), $request->except(['code']));
            return response()->json(['success' => true, 'entity' => $entity]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function destroy(Request $request, string $type): JsonResponse
    {
        try {
            $ledgerType = LedgerType::from($type);
            $this->service->deleteEntity($ledgerType, $request->input('code'), $request->input('password'));
            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function transactions(Request $request, string $type): JsonResponse
    {
        $ledgerType = LedgerType::from($type);
        $transactions = $this->service->getEntityTransactions(
            $request->input('code'),
            $ledgerType,
            $request->input('date_from'),
            $request->input('date_to'),
        );
        return response()->json($transactions);
    }

    public function reverseTransaction(Request $request): JsonResponse
    {
        try {
            $this->service->reverseTransaction($request->input('id'));
            return response()->json(['success' => true, 'message' => __('reverse_success')]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
