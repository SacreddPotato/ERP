<div>
    @if ($show)
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 class="text-lg font-semibold text-red-600 mb-2">{{ __('delete_confirmation_title') }}</h3>
            <p class="text-sm text-gray-600 mb-1">{{ __('delete_confirmation_message') }}</p>
            @if ($entityName)
                <p class="text-sm font-medium text-gray-800 mb-4">{{ $entityCode }} - {{ $entityName }}</p>
            @endif
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ __('delete_password_label') }}</label>
                <input type="password" wire:model="password" wire:keydown.enter="confirmDelete"
                    placeholder="{{ __('placeholder_delete_password') }}"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm">
            </div>
            <div class="flex justify-end gap-2">
                <button wire:click="cancel" class="px-4 py-2 text-sm rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300">
                    {{ __('btn_cancel') }}
                </button>
                <button wire:click="confirmDelete" class="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">
                    {{ __('btn_confirm_delete') }}
                </button>
            </div>
        </div>
    </div>
    @endif
</div>
