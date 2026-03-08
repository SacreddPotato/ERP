<div class="space-y-4">
    @if ($message)
        <div class="p-3 rounded-lg text-sm {{ $messageType === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700' }}">
            {{ $message }}
        </div>
    @endif

    {{-- Low Stock Alerts --}}
    @if ($lowStockAlerts->isNotEmpty())
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-yellow-800 mb-2">{{ __('low_stock_alerts') }}</h3>
        <div class="space-y-1">
            @foreach ($lowStockAlerts as $alert)
            <div class="text-sm text-yellow-700">
                <strong>{{ $alert->item_code }}</strong> - {{ $alert->name }}:
                {{ __('notification_current') }} {{ number_format($alert->net_stock, 2) }}
                | {{ __('notification_min') }} {{ number_format($alert->min_stock, 2) }}
                | {{ __('notification_shortage') }} {{ number_format($alert->min_stock - $alert->net_stock, 2) }}
            </div>
            @endforeach
        </div>
    </div>
    @endif

    <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">{{ __('current_stock') }}</h2>
            <div class="flex gap-2">
                <button wire:click="$refresh" class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">{{ __('btn_refresh') }}</button>
                <button wire:click="exportCsv" class="px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200">{{ __('btn_export') }}</button>
            </div>
        </div>

        {{-- Filters --}}
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <input type="text" wire:model.live.debounce.300ms="search" placeholder="{{ __('placeholder_search') }}"
                class="rounded-md border-gray-300 shadow-sm text-sm">
            <select wire:model.live="filterCategory" class="rounded-md border-gray-300 shadow-sm text-sm">
                <option value="">{{ __('all_categories') }}</option>
                @foreach ($categories as $cat)
                    <option value="{{ $cat->value }}">{{ $cat->label() }}</option>
                @endforeach
            </select>
            <select wire:model.live="filterSupplier" class="rounded-md border-gray-300 shadow-sm text-sm">
                <option value="">{{ __('all_suppliers') }}</option>
                @foreach ($suppliers as $s)
                    <option value="{{ $s }}">{{ $s }}</option>
                @endforeach
            </select>
            <select wire:model.live="filterUnit" class="rounded-md border-gray-300 shadow-sm text-sm">
                <option value="">{{ __('all_units') }}</option>
                @foreach ($units as $u)
                    <option value="{{ $u->value }}">{{ $u->label() }}</option>
                @endforeach
            </select>
            <input type="number" wire:model.live.debounce.300ms="lowStockThreshold" placeholder="{{ __('placeholder_threshold') }}"
                class="rounded-md border-gray-300 shadow-sm text-sm" min="0">
        </div>

        {{-- Table --}}
        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        @foreach ([
                            'item_code' => __('th_id'),
                            'name' => __('th_name'),
                            'category' => __('th_category'),
                            'unit' => __('th_unit'),
                            'supplier' => __('th_supplier'),
                            'starting_balance' => __('th_starting'),
                            'total_incoming' => __('th_in'),
                            'total_outgoing' => __('th_out'),
                            'net_stock' => __('th_net_stock'),
                            'unit_price' => __('th_price'),
                        ] as $col => $label)
                        <th wire:click="sortTable('{{ $col }}')" class="px-3 py-2 text-start cursor-pointer hover:bg-gray-100 whitespace-nowrap">
                            {{ $label }}
                            @if ($sortBy === $col) <span>{{ $sortDir === 'asc' ? '▲' : '▼' }}</span> @endif
                        </th>
                        @endforeach
                        <th class="px-3 py-2 text-start">{{ __('th_min_stock') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_actions') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    @forelse ($items as $item)
                    <tr class="hover:bg-gray-50 {{ $item->min_stock > 0 && $item->net_stock <= $item->min_stock ? 'bg-red-50' : '' }}">
                        @if ($editingCode === $item->item_code)
                            <td class="px-3 py-2 font-mono">{{ $item->item_code }}</td>
                            <td class="px-3 py-2"><input type="text" wire:model="editData.name" class="w-full border rounded px-1 py-0.5 text-sm"></td>
                            <td class="px-3 py-2">
                                <select wire:model="editData.category" class="border rounded px-1 py-0.5 text-sm">
                                    @foreach ($categories as $cat)
                                        <option value="{{ $cat->value }}">{{ $cat->label() }}</option>
                                    @endforeach
                                </select>
                            </td>
                            <td class="px-3 py-2">
                                <select wire:model="editData.unit" class="border rounded px-1 py-0.5 text-sm">
                                    @foreach ($units as $u)
                                        <option value="{{ $u->value }}">{{ $u->label() }}</option>
                                    @endforeach
                                </select>
                            </td>
                            <td class="px-3 py-2"><input type="text" wire:model="editData.supplier" class="w-full border rounded px-1 py-0.5 text-sm"></td>
                            <td class="px-3 py-2">{{ number_format($item->starting_balance, 2) }}</td>
                            <td class="px-3 py-2">{{ number_format($item->total_incoming, 2) }}</td>
                            <td class="px-3 py-2">{{ number_format($item->total_outgoing, 2) }}</td>
                            <td class="px-3 py-2 font-semibold">{{ number_format($item->net_stock, 2) }}</td>
                            <td class="px-3 py-2"><input type="number" wire:model="editData.unit_price" step="0.01" class="w-20 border rounded px-1 py-0.5 text-sm"></td>
                            <td class="px-3 py-2"><input type="number" wire:model="editData.min_stock" step="0.01" class="w-16 border rounded px-1 py-0.5 text-sm"></td>
                            <td class="px-3 py-2 whitespace-nowrap">
                                <button wire:click="saveEdit" class="text-green-600 hover:underline text-xs">{{ __('btn_save') }}</button>
                                <button wire:click="cancelEdit" class="text-gray-500 hover:underline text-xs ms-1">{{ __('btn_cancel') }}</button>
                            </td>
                        @else
                            <td class="px-3 py-2 font-mono">{{ $item->item_code }}</td>
                            <td class="px-3 py-2">{{ $item->name }}</td>
                            <td class="px-3 py-2">{{ $item->category?->label() }}</td>
                            <td class="px-3 py-2">{{ $item->unit?->label() }}</td>
                            <td class="px-3 py-2">{{ $item->supplier }}</td>
                            <td class="px-3 py-2">{{ number_format($item->starting_balance, 2) }}</td>
                            <td class="px-3 py-2 text-green-600">{{ number_format($item->total_incoming, 2) }}</td>
                            <td class="px-3 py-2 text-red-600">{{ number_format($item->total_outgoing, 2) }}</td>
                            <td class="px-3 py-2 font-semibold">{{ number_format($item->net_stock, 2) }}</td>
                            <td class="px-3 py-2">{{ number_format($item->unit_price, 2) }}</td>
                            <td class="px-3 py-2">{{ number_format($item->min_stock, 2) }}</td>
                            <td class="px-3 py-2 whitespace-nowrap">
                                <button wire:click="startEdit('{{ $item->item_code }}')" class="text-blue-600 hover:underline text-xs">{{ __('btn_update') }}</button>
                                <button wire:click="requestDelete('{{ $item->item_code }}', '{{ $item->name }}')" class="text-red-600 hover:underline text-xs ms-1">{{ __('btn_delete') }}</button>
                            </td>
                        @endif
                    </tr>
                    @empty
                    <tr>
                        <td colspan="12" class="px-3 py-8 text-center text-gray-400">{{ __('no_items') }}</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <p class="text-xs text-gray-400 mt-2">{{ __('showing_items', ['count' => $items->count()]) }}</p>
    </div>
</div>
