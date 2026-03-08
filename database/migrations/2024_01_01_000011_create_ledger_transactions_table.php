<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_transactions', function (Blueprint $table) {
            $table->id();
            $table->timestamp('logged_at')->useCurrent();
            $table->date('transaction_date')->nullable();
            $table->string('ledger_type');
            $table->string('entity_code', 50);
            $table->string('entity_name');
            $table->string('transaction_type');
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->decimal('previous_balance', 15, 2)->default(0);
            $table->decimal('new_balance', 15, 2)->default(0);
            $table->string('payment_method')->nullable();
            $table->string('document_number')->nullable();
            $table->text('statement')->nullable();

            $table->index('ledger_type');
            $table->index('entity_code');
            $table->index('logged_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_transactions');
    }
};
