<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function __construct(protected StockService $service) {}

    public function index(Request $request): JsonResponse
    {
        $factory = session('current_factory', config('enterprisflow.default_factory'));
        $perPage = (int) $request->input('per_page', 25);
        $page = (int) $request->input('page', 1);
        $result = $this->service->getFilteredItems($factory, $request->only(['search', 'category', 'supplier', 'unit', 'low_stock', 'date_from', 'date_to']), $perPage, $page);
        return response()->json($result);
    }

    public function generateId(): JsonResponse
    {
        $factory = session('current_factory', config('enterprisflow.default_factory'));
        return response()->json(['id' => $this->service->generateNextId($factory)]);
    }

    public function checkId(Request $request): JsonResponse
    {
        $factory = session('current_factory', config('enterprisflow.default_factory'));
        $item = $this->service->checkItemExists($request->input('item_code'), $factory);
        return response()->json(['exists' => !!$item, 'item' => $item]);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $factory = session('current_factory', config('enterprisflow.default_factory'));
            $data = $request->all();
            $data['factory'] = $factory;
            $item = $this->service->addNewItem($data);
            return response()->json(['success' => true, 'item' => $item, 'message' => __('msg_item_added')]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function updateStock(Request $request): JsonResponse
    {
        try {
            $factory = session('current_factory', config('enterprisflow.default_factory'));
            $type = $request->input('transaction_type');

            if ($type === 'transfer') {
                $result = $this->service->handleInternalTransfer(
                    $request->input('item_code'),
                    (float) $request->input('quantity'),
                    $request->input('transfer_from', $factory),
                    $request->input('transfer_to'),
                    $request->only(['transaction_date', 'document_type', 'document_number', 'notes'])
                );
                return response()->json(['success' => true, 'message' => __('msg_stock_updated')]);
            }

            $item = $this->service->updateStock(
                $request->input('item_code'),
                $factory,
                $type,
                (float) $request->input('quantity'),
                $request->only(['supplier', 'price', 'transaction_date', 'document_type', 'document_number', 'notes'])
            );
            return response()->json(['success' => true, 'item' => $item, 'message' => __('msg_stock_updated')]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function edit(Request $request): JsonResponse
    {
        try {
            $factory = session('current_factory', config('enterprisflow.default_factory'));
            $item = $this->service->editItem($request->input('item_code'), $factory, $request->except(['item_code']));
            return response()->json(['success' => true, 'item' => $item, 'message' => __('msg_item_updated')]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function destroy(Request $request): JsonResponse
    {
        try {
            $factory = session('current_factory', config('enterprisflow.default_factory'));
            $this->service->deleteItem($request->input('item_code'), $factory, $request->input('password'));
            return response()->json(['success' => true, 'message' => __('msg_item_deleted')]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function lowStock(): JsonResponse
    {
        $factory = session('current_factory', config('enterprisflow.default_factory'));
        return response()->json($this->service->getLowStockNotifications($factory));
    }

    public function suppliers(): JsonResponse
    {
        $factory = session('current_factory', config('enterprisflow.default_factory'));
        return response()->json($this->service->getUniqueSuppliers($factory));
    }

    public function export(Request $request): JsonResponse
    {
        $factory = session('current_factory', config('enterprisflow.default_factory'));
        $csv = $this->service->exportToCsv($factory, $request->all());
        return response()->json(['csv' => $csv]);
    }

    public function reverseTransaction(Request $request): JsonResponse
    {
        try {
            $factory = session('current_factory', config('enterprisflow.default_factory'));
            $this->service->reverseTransaction($request->input('id'), $factory);
            return response()->json(['success' => true, 'message' => __('reverse_success')]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
