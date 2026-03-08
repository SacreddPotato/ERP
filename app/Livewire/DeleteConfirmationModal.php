<?php

namespace App\Livewire;

use Livewire\Component;
use Livewire\Attributes\On;

class DeleteConfirmationModal extends Component
{
    public bool $show = false;
    public string $password = '';
    public string $entityType = '';
    public string $entityCode = '';
    public string $entityName = '';

    #[On('show-delete-modal')]
    public function showModal(string $type, string $code, string $name = ''): void
    {
        $this->entityType = $type;
        $this->entityCode = $code;
        $this->entityName = $name;
        $this->password = '';
        $this->show = true;
    }

    public function confirmDelete(): void
    {
        $this->dispatch('delete-confirmed', type: $this->entityType, code: $this->entityCode, password: $this->password);
        $this->show = false;
        $this->password = '';
    }

    public function cancel(): void
    {
        $this->show = false;
        $this->password = '';
    }

    public function render()
    {
        return view('livewire.delete-confirmation-modal');
    }
}
