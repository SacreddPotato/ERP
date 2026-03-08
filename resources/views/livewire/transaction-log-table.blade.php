<div class="space-y-4">
    @if ($message)
        <div class="p-3 rounded-lg text-sm {{ $messageType === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700' }}">
            {{ $message }}
        </div>
    @endif

    {{-- Log Source Toggle --}}
    <div class="bg-white rounded-lg shadow-sm p-4">
        <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700">{{ __('log_source') }}:</span>
            <button wire:click="setLogSource('stock')"
                class="px-4 py-2 rounded-md text-sm {{ $logSource === 'stock' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' }}">
                {{ __('log_source_stock') }}
            </button>
            <button wire:click="setLogSource('all_ledger')"
                class="px-4 py-2 rounded-md text-sm {{ $logSource === 'all_ledger' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' }}">
                {{ __('log_source_all_ledger') }}
            </button>
        </div>
    </div>

    {{-- Filters Panel --}}
    <div class="bg-white rounded-lg shadow-sm p-4">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">{{ __('filters') }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('keyword') }}</label>
                <input type="text" wire:model.live.debounce.300ms="keyword" placeholder="{{ __('placeholder_keyword') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>

            @if ($logSource === 'stock')
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('factory') }}</label>
                <select wire:model.live="filterFactory" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('all_factories') }}</option>
                    @foreach ($factories as $factory)
                        <option value="{{ $factory->value }}">{{ $factory->label() }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('transaction_type') }}</label>
                <select wire:model.live="filterType" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('all_types') }}</option>
                    @foreach ($stockTransactionTypes as $type)
                        <option value="{{ $type->value }}">{{ $type->value }}</option>
                    @endforeach
                </select>
            </div>
            @else
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('ledger_type') }}</label>
                <select wire:model.live="filterType" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('all_types') }}</option>
                    @foreach ($ledgerTypes as $type)
                        <option value="{{ $type->value }}">{{ $type->value }}</option>
                    @endforeach
                </select>
            </div>
            @endif

            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('logged_date_from') }}</label>
                <input type="date" wire:model.live="dateFrom"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('logged_date_to') }}</label>
                <input type="date" wire:model.live="dateTo"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('trans_date_from') }}</label>
                <input type="date" wire:model.live="transDateFrom"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('trans_date_to') }}</label>
                <input type="date" wire:model.live="transDateTo"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>

            @if ($logSource === 'stock')
            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('document_type') }}</label>
                <select wire:model.live="filterDocType" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('all_doc_types') }}</option>
                    @foreach ($documentTypes as $dt)
                        <option value="{{ $dt->value }}">{{ $dt->label() }}</option>
                    @endforeach
                </select>
            </div>
            @endif

            <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ __('document_number') }}</label>
                <input type="text" wire:model.live.debounce.300ms="filterDocNumber" placeholder="{{ __('placeholder_document_number') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
        </div>
    </div>

    {{-- Logs Table --}}
    <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="overflow-x-auto">
            @if ($logSource === 'stock')
            <table class="min-w-full text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-3 py-2 text-start">{{ __('th_id') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_logged_at') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_trans_date') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_item_code') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_item_name') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_type') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_quantity') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_prev_stock') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_new_stock') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_factory') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_notes') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_actions') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    @forelse ($logs as $log)
                    <tr class="hover:bg-gray-50 {{ str_contains($log->notes ?? '', '[REVERSED]') ? 'opacity-50 line-through' : '' }}">
                        <td class="px-3 py-2 font-mono text-xs">{{ $log->id }}</td>
                        <td class="px-3 py-2 text-xs">{{ $log->logged_at?->format('Y-m-d H:i') }}</td>
                        <td class="px-3 py-2 text-xs">{{ $log->transaction_date?->format('Y-m-d') }}</td>
                        <td class="px-3 py-2 font-mono">{{ $log->item_code }}</td>
                        <td class="px-3 py-2">{{ $log->item_name }}</td>
                        <td class="px-3 py-2">{{ $log->transaction_type instanceof \BackedEnum ? $log->transaction_type->value : $log->transaction_type }}</td>
                        <td class="px-3 py-2">{{ number_format($log->quantity, 2) }}</td>
                        <td class="px-3 py-2">{{ number_format($log->previous_stock, 2) }}</td>
                        <td class="px-3 py-2">{{ number_format($log->new_stock, 2) }}</td>
                        <td class="px-3 py-2">{{ $log->factory instanceof \BackedEnum ? $log->factory->label() : $log->factory }}</td>
                        <td class="px-3 py-2 max-w-[200px] truncate">{{ $log->notes }}</td>
                        <td class="px-3 py-2">
                            @if (!str_contains($log->notes ?? '', '[REVERSED]'))
                            <button wire:click="reverseTransaction({{ $log->id }})"
                                wire:confirm="{{ __('confirm_reverse') }}"
                                class="text-orange-600 hover:underline text-xs">
                                {{ __('btn_reverse') }}
                            </button>
                            @endif
                        </td>
                    </tr>
                    @empty
                    <tr><td colspan="12" class="px-3 py-8 text-center text-gray-400">{{ __('no_transactions') }}</td></tr>
                    @endforelse
                </tbody>
            </table>
            @else
            <table class="min-w-full text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-3 py-2 text-start">{{ __('th_id') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_logged_at') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_trans_date') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('ledger_type') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_entity_code') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_entity_name') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_type') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_debit') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_credit') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_prev_balance') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_new_balance') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_statement') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_actions') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    @forelse ($logs as $log)
                    <tr class="hover:bg-gray-50 {{ str_contains($log->statement ?? '', '[REVERSED]') ? 'opacity-50 line-through' : '' }}">
                        <td class="px-3 py-2 font-mono text-xs">{{ $log->id }}</td>
                        <td class="px-3 py-2 text-xs">{{ $log->logged_at?->format('Y-m-d H:i') }}</td>
                        <td class="px-3 py-2 text-xs">{{ $log->transaction_date?->format('Y-m-d') }}</td>
                        <td class="px-3 py-2">{{ $log->ledger_type instanceof \BackedEnum ? $log->ledger_type->value : $log->ledger_type }}</td>
                        <td class="px-3 py-2 font-mono">{{ $log->entity_code }}</td>
                        <td class="px-3 py-2">{{ $log->entity_name }}</td>
                        <td class="px-3 py-2">{{ $log->transaction_type instanceof \BackedEnum ? $log->transaction_type->value : $log->transaction_type }}</td>
                        <td class="px-3 py-2 text-blue-600">{{ number_format($log->debit, 2) }}</td>
                        <td class="px-3 py-2 text-orange-600">{{ number_format($log->credit, 2) }}</td>
                        <td class="px-3 py-2">{{ number_format($log->previous_balance, 2) }}</td>
                        <td class="px-3 py-2">{{ number_format($log->new_balance, 2) }}</td>
                        <td class="px-3 py-2 max-w-[200px] truncate">{{ $log->statement }}</td>
                        <td class="px-3 py-2">
                            @if (!str_contains($log->statement ?? '', '[REVERSED]'))
                            <button wire:click="reverseTransaction({{ $log->id }})"
                                wire:confirm="{{ __('confirm_reverse') }}"
                                class="text-orange-600 hover:underline text-xs">
                                {{ __('btn_reverse') }}
                            </button>
                            @endif
                        </td>
                    </tr>
                    @empty
                    <tr><td colspan="13" class="px-3 py-8 text-center text-gray-400">{{ __('no_transactions') }}</td></tr>
                    @endforelse
                </tbody>
            </table>
            @endif
        </div>
        <p class="text-xs text-gray-400 mt-2">{{ __('showing_transactions', ['count' => $logs->count()]) }}</p>
    </div>
</div>
