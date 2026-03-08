<?php

namespace App\Livewire;

use App\Services\FirebaseSyncService;
use Livewire\Component;

class FirebaseSyncPanel extends Component
{
    public bool $syncing = false;
    public int $progress = 0;
    public string $progressStep = '';
    public ?array $lastResult = null;
    public bool $showConfirm = false;
    public string $confirmAction = '';

    public string $message = '';
    public string $messageType = 'success';

    public function pullData(): void
    {
        $this->syncing = true;
        $this->progress = 0;
        $this->progressStep = '';
        $this->lastResult = null;

        try {
            $service = app(FirebaseSyncService::class);
            $result = $service->pullAll(true, function (int $percent, string $step) {
                $this->progress = $percent;
                $this->progressStep = $step;
            });

            $this->lastResult = $result;
            $this->message = __('sync_pull_complete', [
                'pulled' => $result['pulled'],
                'skipped' => $result['skipped'],
            ]);
            $this->messageType = empty($result['errors']) ? 'success' : 'warning';
        } catch (\Throwable $e) {
            $this->message = $e->getMessage();
            $this->messageType = 'error';
        } finally {
            $this->syncing = false;
            $this->progress = 100;
        }
    }

    public function requestPush(): void
    {
        $this->showConfirm = true;
        $this->confirmAction = 'push';
    }

    public function requestForcePull(): void
    {
        $this->showConfirm = true;
        $this->confirmAction = 'force_pull';
    }

    public function confirmAction(): void
    {
        $this->showConfirm = false;

        if ($this->confirmAction === 'push') {
            $this->executePush();
        } elseif ($this->confirmAction === 'force_pull') {
            $this->executeForcePull();
        }

        $this->confirmAction = '';
    }

    public function cancelConfirm(): void
    {
        $this->showConfirm = false;
        $this->confirmAction = '';
    }

    protected function executePush(): void
    {
        $this->syncing = true;
        $this->progress = 0;
        $this->progressStep = '';
        $this->lastResult = null;

        try {
            $service = app(FirebaseSyncService::class);
            $result = $service->pushAll(function (int $percent, string $step) {
                $this->progress = $percent;
                $this->progressStep = $step;
            });

            $this->lastResult = $result;
            $this->message = __('sync_push_complete', ['pushed' => $result['pushed']]);
            $this->messageType = empty($result['errors']) ? 'success' : 'warning';
        } catch (\Throwable $e) {
            $this->message = $e->getMessage();
            $this->messageType = 'error';
        } finally {
            $this->syncing = false;
            $this->progress = 100;
        }
    }

    protected function executeForcePull(): void
    {
        $this->syncing = true;
        $this->progress = 0;
        $this->progressStep = '';
        $this->lastResult = null;

        try {
            $service = app(FirebaseSyncService::class);
            $result = $service->forcePull(function (int $percent, string $step) {
                $this->progress = $percent;
                $this->progressStep = $step;
            });

            $this->lastResult = $result;
            $this->message = __('sync_force_pull_complete', [
                'pulled' => $result['pulled'],
            ]);
            $this->messageType = empty($result['errors']) ? 'success' : 'warning';
        } catch (\Throwable $e) {
            $this->message = $e->getMessage();
            $this->messageType = 'error';
        } finally {
            $this->syncing = false;
            $this->progress = 100;
        }
    }

    public function render()
    {
        return view('livewire.firebase-sync-panel');
    }
}
