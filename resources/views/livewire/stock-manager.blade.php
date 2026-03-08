<div class="space-y-4">
    {{-- Messages --}}
    @if ($message)
        <div class="p-3 rounded-lg text-sm {{ $messageType === 'error' ? 'bg-red-100 text-red-700' : ($messageType === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700') }}">
            {{ $message }}
        </div>
    @endif

    {{-- Item Entry Card --}}
    <div class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-lg font-semibold mb-4">{{ __('item_entry') }}</h2>

        <div class="flex items-end gap-3 mb-4">
            <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('item_id') }}</label>
                <input type="text" wire:model="itemId" placeholder="{{ __('placeholder_item_id') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
            </div>
            <button wire:click="checkId" class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                {{ __('btn_check_id') }}
            </button>
            <button wire:click="generateId" class="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700">
                {{ __('btn_generate_id') }}
            </button>
        </div>
        <p class="text-xs text-gray-400">{{ __('hint_id_auto') }}</p>
    </div>

    {{-- New Item Form --}}
    @if ($isNewItem)
    <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-md font-semibold mb-4">{{ __('new_item_details') }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('item_name') }} *</label>
                <input type="text" wire:model="name" placeholder="{{ __('placeholder_item_name') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('item_category') }} *</label>
                <select wire:model="category" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('select_category') }}</option>
                    @foreach ($categories as $cat)
                        <option value="{{ $cat->value }}">{{ $cat->label() }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('item_unit') }} *</label>
                <select wire:model="unit" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('select_unit') }}</option>
                    @foreach ($units as $u)
                        <option value="{{ $u->value }}">{{ $u->label() }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('item_supplier') }}</label>
                <input type="text" wire:model="supplier" placeholder="{{ __('placeholder_supplier') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('starting_balance') }} *</label>
                <input type="number" wire:model="startingBalance" step="0.01" min="0"
                    placeholder="{{ __('placeholder_starting_balance') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('unit_price') }} *</label>
                <input type="number" wire:model="unitPrice" step="0.01" min="0"
                    placeholder="{{ __('placeholder_price') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('min_stock') }}</label>
                <input type="number" wire:model="minStock" step="0.01" min="0"
                    placeholder="{{ __('placeholder_min_stock') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('starting_balance_date') }}</label>
                <input type="date" wire:model="balanceDate"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                <p class="text-xs text-gray-400 mt-1">{{ __('hint_balance_date') }}</p>
            </div>
        </div>
        <div class="mt-4">
            <button wire:click="addItem" class="px-6 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
                {{ __('btn_add_item') }}
            </button>
        </div>
    </div>
    @endif

    {{-- Update Stock Form (existing item) --}}
    @if ($existingItem)
    <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-md font-semibold mb-4">{{ __('update_stock') }}</h3>

        {{-- Item Info --}}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-sm bg-gray-50 rounded-lg p-3">
            <div><span class="text-gray-500">{{ __('info_name') }}</span> <strong>{{ $existingItem['name'] }}</strong></div>
            <div><span class="text-gray-500">{{ __('info_category') }}</span> {{ $existingItem['category_label'] }}</div>
            <div><span class="text-gray-500">{{ __('info_current_stock') }}</span> <strong class="text-blue-600">{{ number_format($existingItem['net_stock'], 2) }}</strong></div>
            <div><span class="text-gray-500">{{ __('info_price') }}</span> {{ number_format($existingItem['unit_price'], 2) }}</div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('transaction_type') }} *</label>
                <select wire:model.live="transactionType" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('select_type') }}</option>
                    <option value="incoming">{{ __('type_incoming') }}</option>
                    <option value="outgoing">{{ __('type_outgoing') }}</option>
                    <option value="transfer">{{ __('type_transfer') }}</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('quantity') }} *</label>
                <input type="number" wire:model="quantity" step="0.01" min="0.01"
                    placeholder="{{ __('placeholder_quantity') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>

            @if ($transactionType === 'incoming')
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('incoming_supplier') }}</label>
                <input type="text" wire:model="incomingSupplier" placeholder="{{ __('placeholder_incoming_supplier') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('shipment_price') }}</label>
                <input type="number" wire:model="shipmentPrice" step="0.01" min="0"
                    placeholder="{{ __('placeholder_shipment_price') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                <p class="text-xs text-gray-400 mt-1">{{ __('hint_price_average') }}</p>
            </div>
            @endif

            @if ($transactionType === 'transfer')
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('transfer_from') }} *</label>
                <select wire:model="transferFrom" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('select_location') }}</option>
                    @foreach ($factories as $f)
                        <option value="{{ $f->value }}">{{ $f->label() }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('transfer_to') }} *</label>
                <select wire:model="transferTo" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('select_location') }}</option>
                    @foreach ($factories as $f)
                        <option value="{{ $f->value }}">{{ $f->label() }}</option>
                    @endforeach
                </select>
            </div>
            @endif

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('transaction_date') }}</label>
                <input type="date" wire:model="transactionDate"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('filter_document_type') }}</label>
                <select wire:model="documentType" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('select_document_type') }}</option>
                    @foreach ($documentTypes as $dt)
                        <option value="{{ $dt->value }}">{{ $dt->label() }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('filter_document_number') }}</label>
                <input type="text" wire:model="documentNumber" placeholder="{{ __('placeholder_document_number') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
        </div>
        <div class="mt-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('th_notes') }}</label>
            <textarea wire:model="notes" rows="2" placeholder="{{ __('placeholder_notes') }}"
                class="w-full rounded-md border-gray-300 shadow-sm text-sm"></textarea>
        </div>
        <div class="mt-4">
            <button wire:click="updateStock" class="px-6 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                {{ __('btn_update_stock') }}
            </button>
        </div>
    </div>
    @endif
</div>
