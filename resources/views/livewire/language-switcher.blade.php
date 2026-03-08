<div class="flex items-center gap-1">
    <button
        wire:click="switchLocale('en')"
        class="px-2 py-1 text-xs rounded {{ $locale === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600' }}">
        EN
    </button>
    <button
        wire:click="switchLocale('ar')"
        class="px-2 py-1 text-xs rounded {{ $locale === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600' }}">
        AR
    </button>
</div>
