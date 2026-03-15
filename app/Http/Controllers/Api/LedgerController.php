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
        $totals = $this->service->getTotalBalance($ledgerType);

        $txMatchCodes = [];
        if ($request->filled('search')) {
            $txMatchCodes = $this->service->getEntityCodesWithMatchingTransactions($ledgerType, $request->input('search'));

            // Include entities that have matching transactions but weren't found by entity search
            if (!empty($txMatchCodes)) {
                $column = $ledgerType->codeColumn();
                $existingCodes = $result['data']->pluck($column)->toArray();
                $missingCodes = array_diff($txMatchCodes, $existingCodes);
                if (!empty($missingCodes)) {
                    $model = $ledgerType->modelClass();
                    $additional = $model::whereIn($column, $missingCodes)->orderBy($column)->get();
                    $result['data'] = $result['data']->merge($additional)->sortBy($column)->values();
                    $result['total'] += count($missingCodes);
                }
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
