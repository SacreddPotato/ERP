<div class="space-y-4">
    @if ($message)
        <div class="p-3 rounded-lg text-sm {{ $messageType === 'error' ? 'bg-red-100 text-red-700' : ($messageType === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700') }}">
            {{ $message }}
        </div>
    @endif

    {{-- Treasury Initialization Card --}}
    @if (!$config->initialized)
    <div class="bg-white rounded-lg shadow-sm p-6 border-2 border-yellow-300">
        <h2 class="text-lg font-semibold mb-4">{{ __('treasury_initialization') }}</h2>
        <p class="text-sm text-gray-500 mb-4">{{ __('treasury_init_description') }}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('starting_capital') }} *</label>
                <input type="number" wire:model="startingCapital" step="0.01" min="0"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('fiscal_year_start') }}</label>
                <input type="date" wire:model="fiscalYearStart"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('currency') }}</label>
                <input type="text" wire:model="currency" placeholder="EGP"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('notes') }}</label>
                <input type="text" wire:model="initNotes" placeholder="{{ __('placeholder_notes') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
        </div>
        <div class="mt-4">
            <button wire:click="initialize" class="px-6 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700">
                {{ __('btn_initialize_treasury') }}
            </button>
        </div>
    </div>
    @else
    {{-- Treasury Summary Card --}}
    <div class="bg-white rounded-lg shadow-sm p-6 border border-green-200">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">{{ __('treasury_summary') }}</h2>
            <button wire:click="resetTreasury" class="px-3 py-1 bg-red-100 text-red-700 rounded-md text-xs hover:bg-red-200">
                {{ __('btn_reset_treasury') }}
            </button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-gray-50 rounded-lg p-4 text-center">
                <p class="text-xs text-gray-500">{{ __('starting_capital') }}</p>
                <p class="text-lg font-bold text-gray-800">{{ number_format($summary['starting_capital'], 2) }} {{ $config->currency }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 text-center">
                <p class="text-xs text-gray-500">{{ __('net_change') }}</p>
                <p class="text-lg font-bold {{ $summary['net_change'] >= 0 ? 'text-green-600' : 'text-red-600' }}">{{ number_format($summary['net_change'], 2) }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 text-center">
                <p class="text-xs text-gray-500">{{ __('current_position') }}</p>
                <p class="text-lg font-bold {{ $summary['current_position'] >= 0 ? 'text-green-600' : 'text-red-600' }}">{{ number_format($summary['current_position'], 2) }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 text-center">
                <p class="text-xs text-gray-500">{{ __('total_accounts') }}</p>
                <p class="text-lg font-bold">{{ $summary['total_accounts'] }}</p>
            </div>
        </div>
    </div>

    {{-- Balance Cards --}}
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-white rounded-lg shadow-sm p-4 text-center">
            <p class="text-xs text-gray-500">{{ __('total_balance') }}</p>
            <p class="text-lg font-bold {{ $totals['total_balance'] >= 0 ? 'text-green-600' : 'text-red-600' }}">{{ number_format($totals['total_balance'], 2) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 text-center">
            <p class="text-xs text-gray-500">{{ __('total_opening_balance') }}</p>
            <p class="text-lg font-semibold">{{ number_format($totals['total_opening'], 2) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 text-center">
            <p class="text-xs text-gray-500">{{ __('total_debit') }}</p>
            <p class="text-lg font-semibold text-blue-600">{{ number_format($totals['total_debit'], 2) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 text-center">
            <p class="text-xs text-gray-500">{{ __('total_credit') }}</p>
            <p class="text-lg font-semibold text-orange-600">{{ number_format($totals['total_credit'], 2) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 text-center">
            <p class="text-xs text-gray-500">{{ __('total_count') }}</p>
            <p class="text-lg font-semibold">{{ $totals['count'] }}</p>
        </div>
    </div>

    {{-- Account CRUD Form --}}
    <div class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-lg font-semibold mb-4">{{ __('treasury_account_entry') }}</h2>
        <div class="flex items-end gap-3 mb-4">
            <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('account_number') }}</label>
                <input type="text" wire:model="accountNumber" placeholder="{{ __('placeholder_account_number') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <button wire:click="checkAccount" class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">{{ __('btn_check_id') }}</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('account_name') }} *</label>
                <input type="text" wire:model="accountName" placeholder="{{ __('placeholder_account_name') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm" {{ $isExisting ? 'disabled' : '' }}>
            </div>
            @if (!$isExisting)
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('opening_balance') }}</label>
                <input type="number" wire:model="openingBalance" step="0.01" placeholder="{{ __('placeholder_opening_balance') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            @endif
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('debit') }}</label>
                <input type="number" wire:model="debit" step="0.01" min="0" placeholder="{{ __('placeholder_debit') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('credit') }}</label>
                <input type="number" wire:model="credit" step="0.01" min="0" placeholder="{{ __('placeholder_credit') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('payment_method') }}</label>
                <select wire:model="paymentMethod" class="w-full rounded-md border-gray-300 shadow-sm text-sm">
                    <option value="">{{ __('select_payment_method') }}</option>
                    @foreach ($paymentMethods as $pm)
                        <option value="{{ $pm->value }}">{{ $pm->label() }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('document_number') }}</label>
                <input type="text" wire:model="documentNumber" placeholder="{{ __('placeholder_document_number') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('statement') }}</label>
                <input type="text" wire:model="statement" placeholder="{{ __('placeholder_statement') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
        </div>
        <div class="mt-4">
            <button wire:click="save" class="px-6 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
                {{ __('btn_save_account') }}
            </button>
        </div>
    </div>

    {{-- Accounts List --}}
    <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">{{ __('treasury_accounts_list') }}</h2>
            <input type="text" wire:model.live.debounce.300ms="search" placeholder="{{ __('placeholder_search') }}"
                class="rounded-md border-gray-300 shadow-sm text-sm w-64">
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-3 py-2 text-start">{{ __('account_number') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('account_name') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_opening_balance') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_debit') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_credit') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_balance') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_payment_method') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_statement') }}</th>
                        <th class="px-3 py-2 text-start">{{ __('th_actions') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    @forelse ($entities as $entity)
                    <tr class="hover:bg-gray-50">
                        <td class="px-3 py-2 font-mono">{{ $entity->account_number }}</td>
                        <td class="px-3 py-2">{{ $entity->account_name }}</td>
                        <td class="px-3 py-2">{{ number_format($entity->opening_balance, 2) }}</td>
                        <td class="px-3 py-2 text-blue-600">{{ number_format($entity->debit, 2) }}</td>
                        <td class="px-3 py-2 text-orange-600">{{ number_format($entity->credit, 2) }}</td>
                        <td class="px-3 py-2 font-semibold {{ $entity->balance >= 0 ? 'text-green-600' : 'text-red-600' }}">{{ number_format($entity->balance, 2) }}</td>
                        <td class="px-3 py-2">{{ $entity->payment_method?->label() }}</td>
                        <td class="px-3 py-2 max-w-[200px] truncate">{{ $entity->statement }}</td>
                        <td class="px-3 py-2 whitespace-nowrap">
                            <button wire:click="showTransactions('{{ $entity->account_number }}')" class="text-blue-600 hover:underline text-xs">{{ __('tab_transactions') }}</button>
                            <button wire:click="requestDelete('{{ $entity->account_number }}', '{{ $entity->account_name }}')" class="text-red-600 hover:underline text-xs ms-1">{{ __('btn_delete') }}</button>
                        </td>
                    </tr>
                    @if ($viewingTransactions === $entity->account_number)
                    <tr>
                        <td colspan="9" class="px-3 py-3 bg-gray-50">
                            <h4 class="text-sm font-semibold mb-2">{{ __('transaction_log') }} - {{ $entity->account_name }}</h4>
                            <table class="min-w-full text-xs">
                                <thead><tr class="bg-gray-100">
                                    <th class="px-2 py-1 text-start">{{ __('th_logged_at') }}</th>
                                    <th class="px-2 py-1 text-start">{{ __('th_type') }}</th>
                                    <th class="px-2 py-1 text-start">{{ __('th_debit') }}</th>
                                    <th class="px-2 py-1 text-start">{{ __('th_credit') }}</th>
                                    <th class="px-2 py-1 text-start">{{ __('th_balance') }}</th>
                                    <th class="px-2 py-1 text-start">{{ __('th_statement') }}</th>
                                </tr></thead>
                                <tbody>
                                @foreach ($transactions as $tx)
                                <tr class="border-b border-gray-100">
                                    <td class="px-2 py-1">{{ $tx->logged_at?->format('Y-m-d H:i') }}</td>
                                    <td class="px-2 py-1">{{ $tx->transaction_type instanceof \BackedEnum ? $tx->transaction_type->value : $tx->transaction_type }}</td>
                                    <td class="px-2 py-1">{{ number_format($tx->debit, 2) }}</td>
                                    <td class="px-2 py-1">{{ number_format($tx->credit, 2) }}</td>
                                    <td class="px-2 py-1">{{ number_format($tx->new_balance, 2) }}</td>
                                    <td class="px-2 py-1">{{ $tx->statement }}</td>
                                </tr>
                                @endforeach
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    @endif
                    @empty
                    <tr><td colspan="9" class="px-3 py-8 text-center text-gray-400">{{ __('no_treasury_accounts') }}</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <p class="text-xs text-gray-400 mt-2">{{ __('showing_accounts', ['count' => $entities->count()]) }}</p>
    </div>
    @endif
</div>
