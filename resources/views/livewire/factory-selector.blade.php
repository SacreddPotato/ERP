<div>
    <select wire:model.live="currentFactory" class="rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500">
        @foreach ($factories as $factory)
            <option value="{{ $factory->value }}">{{ $factory->label() }}</option>
        @endforeach
    </select>
</div>
