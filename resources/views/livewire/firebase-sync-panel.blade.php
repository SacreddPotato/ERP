<div class="bg-white rounded-lg shadow-sm p-4">
    <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-700">{{ __('firebase_sync') }}</h3>
        <div class="flex items-center gap-2">
            <button wire:click="pullData" {{ $syncing ? 'disabled' : '' }}
                class="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ __('btn_pull') }}
            </button>
            <button wire:click="requestPush" {{ $syncing ? 'disabled' : '' }}
                class="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ __('btn_push') }}
            </button>
            <button wire:click="requestForcePull" {{ $syncing ? 'disabled' : '' }}
                class="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ __('btn_force_pull') }}
            </button>
        </div>
    </div>

    {{-- Progress Bar --}}
    @if ($syncing)
    <div class="mb-3">
        <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{{ __('syncing') }}{{ $progressStep ? ': ' . $progressStep : '' }}</span>
            <span>{{ $progress }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: {{ $progress }}%"></div>
        </div>
    </div>
    @endif

    {{-- Message --}}
    @if ($message)
    <div class="p-2 rounded text-xs {{ $messageType === 'error' ? 'bg-red-100 text-red-700' : ($messageType === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700') }}">
        {{ $message }}
        @if ($lastResult && !empty($lastResult['errors']))
        <ul class="mt-1 list-disc list-inside">
            @foreach ($lastResult['errors'] as $error)
                <li>{{ $error }}</li>
            @endforeach
        </ul>
        @endif
    </div>
    @endif

    {{-- Confirmation Dialog --}}
    @if ($showConfirm)
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h4 class="text-sm font-semibold text-gray-800 mb-2">{{ __('confirm_action') }}</h4>
            <p class="text-sm text-gray-600 mb-4">
                @if ($confirmAction === 'push')
                    {{ __('confirm_push_message') }}
                @elseif ($confirmAction === 'force_pull')
                    {{ __('confirm_force_pull_message') }}
                @endif
            </p>
            <div class="flex items-center justify-end gap-2">
                <button wire:click="cancelConfirm" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">
                    {{ __('btn_cancel') }}
                </button>
                <button wire:click="confirmAction"
                    class="px-4 py-2 rounded-md text-sm text-white {{ $confirmAction === 'force_pull' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700' }}">
                    {{ __('btn_confirm') }}
                </button>
            </div>
        </div>
    </div>
    @endif
</div>
