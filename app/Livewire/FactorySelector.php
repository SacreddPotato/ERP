<?php

namespace App\Livewire;

use App\Enums\Factory;
use Livewire\Component;

class FactorySelector extends Component
{
    public string $currentFactory = 'bahbit';

    public function mount(): void
    {
        $this->currentFactory = session('currentFactory', config('enterprisflow.default_factory'));
    }

    public function updatedCurrentFactory(string $value): void
    {
        session(['currentFactory' => $value]);
        $this->dispatch('factory-changed', factory: $value);
    }

    public function render()
    {
        return view('livewire.factory-selector', [
            'factories' => Factory::cases(),
        ]);
    }
}
